import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer, savePlayerData, getPlayerIdByName, loadPlayerData } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getAllPlayersFromCache, getPlayerFromCache } from './playerCache.js';
import { getPlayerRank } from './rankManager.js';
import * as utils from './utils.js';
import * as economyManager from './economyManager.js';
import * as punishmentManager from './punishmentManager.js';
import * as tpaManager from './tpaManager.js';
import * as reportManager from './reportManager.js';
import { getCooldown, setCooldown } from './cooldownManager.js';
import { world } from '@minecraft/server';

export const uiActionFunctions = {};

// Main entry point for showing a panel.
export async function showPanel(player, panelId, context = {}) {
    try {
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name} with context: ${JSON.stringify(context)}`);
        const form = await buildPanelForm(player, panelId, context);
        if (!form) {
            debugLog(`[UIManager] buildPanelForm returned null for panel '${panelId}'. Aborting.`);
            return;
        }

        const response = await utils.uiWait(player, form);
        if (!response || response.canceled) {
            debugLog(`[UIManager] Panel '${panelId}' was canceled by ${player.name}.`);
            return;
        }

        await handleFormResponse(player, panelId, response, context);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
        debugLog(`[UIManager] ERROR: showPanel failed for panel '${panelId}': ${e.message}`);
    }
}

// Builds and returns a form object based on a panel definition.
async function buildPanelForm(player, panelId, context) {
    debugLog(`[UIManager] Building form for panel '${panelId}' for player ${player.name}.`);
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        debugLog(`[UIManager] Panel definition not found for '${panelId}'.`);
        return null;
    }
    const pData = getPlayer(player.id);
    if (!pData) {
        debugLog(`[UIManager] Player data not found for ${player.name} (viewer). Cannot build panel.`);
        player.sendMessage('§cCould not find your player data. Please rejoin and try again.');
        return null;
    }
    let title = panelDef.title.replace('{playerName}', context.targetPlayer?.name ?? '');

    if (panelId === 'mainPanel') {
        const config = getConfig();
        title = config.serverName || panelDef.title;
    }

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel' || panelId === 'bountyListPanel' || panelId === 'reportListPanel' || panelId === 'testPlayerListPanel') {
        debugLog(`[UIManager] Building dynamic list form for panel '${panelId}'.`);
        if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel' || panelId === 'testPlayerListPanel') return buildPlayerListForm(title, player, panelId, context);
        if (panelId === 'bountyListPanel') return buildBountyListForm(title);
        if (panelId === 'reportListPanel') return buildReportListForm(title);
    }

    const form = new ActionFormData().title(title);
    addPanelBody(form, player, panelId, context);
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }
    debugLog(`[UIManager] Successfully built form for panel '${panelId}' with ${menuItems.length} items.`);
    return form;
}

// Processes the response from a submitted form.
async function handleFormResponse(player, panelId, response, context) {
    debugLog(`[UIManager] Handling form response for panel '${panelId}' from ${player.name}. Selection: ${response.selection}`);
    const pData = getPlayer(player.id);
    if (!pData) {
        debugLog(`[UIManager] Player data not found for ${player.name} during form response. Aborting.`);
        return;
    }

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel' || panelId === 'testPlayerListPanel') {
        const onlinePlayers = getAllPlayersFromCache().sort((a, b) => a.name.localeCompare(b.name));
        let selection = response.selection;

        if (selection === 0) { // Back button
            debugLog(`[UIManager] Player ${player.name} selected 'Back' from player list.`);
            const parentPanel = panelDefinitions[panelId]?.parentPanelId || 'mainPanel';
            return showPanel(player, parentPanel, context);
        }
        selection--; // Adjust for the back button

        const selectedPlayer = onlinePlayers[selection];
        if (selectedPlayer) {
            let nextPanel;
            if (panelId === 'playerListPanel' || panelId === 'testPlayerListPanel') {
                nextPanel = 'playerManagementPanel';
            } else if (panelId === 'publicPlayerListPanel') {
                nextPanel = 'publicPlayerActionsPanel';
            }
            debugLog(`[UIManager] Player ${player.name} selected player ${selectedPlayer.name}. Opening '${nextPanel}'.`);
            return showPanel(player, nextPanel, { ...context, targetPlayerId: selectedPlayer.id });
        }
        return;
    }

    if (panelId === 'bountyListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel');
        const playersWithBounty = getAllPlayersFromCache().map(p => ({ player: p, data: getPlayer(p.id) })).filter(pInfo => pInfo.data && pInfo.data.bounty > 0).sort((a, b) => b.data.bounty - a.data.bounty);
        const selectedBountyPlayer = playersWithBounty[response.selection - 1]?.player;
        if (selectedBountyPlayer) {
            debugLog(`[UIManager] Player ${player.name} selected bounty player ${selectedBountyPlayer.name}.`);
            return showPanel(player, 'bountyActionsPanel', { ...context, targetPlayerId: selectedBountyPlayer.id });
        }
        return;
    }

    if (panelId === 'reportListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel');
        const reports = reportManager.getAllReports().filter(r => r.status === 'open' || r.status === 'assigned').sort((a, b) => a.timestamp - b.timestamp);
        const selectedReport = reports[response.selection - 1];
        if (selectedReport) {
            debugLog(`[UIManager] Player ${player.name} selected report ${selectedReport.id}.`);
            return showPanel(player, 'reportActionsPanel', { ...context, targetReport: selectedReport });
        }
        return;
    }

    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];
    if (!selectedItem) {
        debugLog(`[UIManager] Invalid selection ${response.selection} on panel '${panelId}' by ${player.name}.`);
        return;
    }

    debugLog(`[UIManager] Player ${player.name} selected item '${selectedItem.id}' on panel '${panelId}'. Action: ${selectedItem.actionType}`);
    if (selectedItem.id === '__back__') {
        return showPanel(player, selectedItem.actionValue, context);
    }
    if (selectedItem.actionType === 'openPanel') {
        return showPanel(player, selectedItem.actionValue, context);
    } else if (selectedItem.actionType === 'functionCall') {
        const actionFunction = uiActionFunctions[selectedItem.actionValue];
        if (actionFunction) {
            debugLog(`[UIManager] Calling UI action function: ${selectedItem.actionValue}`);
        await actionFunction(player, context, panelId);
        } else {
            debugLog(`[UIManager] ERROR: UI action function '${selectedItem.actionValue}' not found.`);
        }
    }
}

// --- Helper & Builder Functions ---
function getMenuItems(panelDef, permissionLevel) {
    const items = (panelDef.items || []).filter(item => permissionLevel <= item.permissionLevel).sort((a, b) => (a.sortId || 0) - (b.sortId || 0));
    if (panelDef.parentPanelId) {
        items.unshift({ id: '__back__', text: '§l§8< Back', icon: 'textures/gui/controls/left.png', permissionLevel: 1024, actionType: 'openPanel', actionValue: panelDef.parentPanelId });
    }
    return items;
}

function addPanelBody(form, player, panelId, context) {
    const config = getConfig();
    if ((panelId === 'playerManagementPanel' || panelId === 'publicPlayerActionsPanel') && context.targetPlayerId) {
        const targetPlayer = getPlayerFromCache(context.targetPlayerId);
        if (!targetPlayer) {
            form.body('§cTarget player is no longer online.');
            return;
        }
        const targetPData = getPlayer(targetPlayer.id);
        if (!targetPData) {
            form.body('§cCould not retrieve player data.');
            return;
        }

        if (panelId === 'playerManagementPanel') {
            const rank = getPlayerRank(targetPlayer, config);
            form.body([`§fName: §e${targetPlayer.name}`, `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`, `§fBalance: §a$${targetPData.balance?.toFixed(2) ?? '0.00'}`, `§fBounty: §e$${targetPData.bounty?.toFixed(2) ?? '0.00'}`].join('\n'));
        } else if (panelId === 'publicPlayerActionsPanel') {
            const bounty = targetPData.bounty?.toFixed(2) ?? '0.00';
            form.body(`§eBounty on this player: $${bounty}`);
        }
    } else if (panelId === 'myStatsPanel') {
        const pData = getPlayer(player.id);
        const rank = getPlayerRank(player, config);
        if (!pData || !rank) {
            form.body('§cCould not retrieve your stats.');
        } else {
            const statsBody = [
                `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`,
                `§fBalance: §a$${pData.balance.toFixed(2)}`,
                `§fBounty on you: §e$${pData.bounty.toFixed(2)}`
            ].join('\n');
            form.body(statsBody);
        }
    } else if (panelId === 'helpfulLinksPanel') {
        const linksBody = [
            '§fHere are some helpful links:',
            `§9Discord: §r${config.serverInfo.discordLink}`,
            `§1Website: §r${config.serverInfo.websiteLink}`
        ].join('\n\n');
        form.body(linksBody);
    } else if (panelId === 'reportActionsPanel' && context.targetReport) {
        const { targetReport } = context;
        const reportDate = new Date(targetReport.timestamp).toLocaleString();
        const body = [
            `§fReport ID: §e${targetReport.id}`,
            `§fReported Player: §e${targetReport.reportedPlayerName}`,
            `§fReporter: §e${targetReport.reporterName}`,
            `§fReason: §e${targetReport.reason}`,
            `§fStatus: §e${targetReport.status}`,
            `§fDate: §e${reportDate}`
        ].join('\n');
        form.body(body);
    }
}

function buildPlayerListForm(title, player, panelId, context) {
    const form = new ActionFormData().title(title);
    const onlinePlayers = getAllPlayersFromCache().sort((a, b) => a.name.localeCompare(b.name));

    form.button('§l§8< Back', 'textures/gui/controls/left.png');

    const config = getConfig();
    for (const p of onlinePlayers) {
        const rank = getPlayerRank(p, config);
        let displayName = `${rank.chatFormatting?.prefixText ?? ''}${p.name}§r`;
        let icon;
        if (panelId === 'playerListPanel' && rank.name === 'Owner') icon = 'textures/ui/crown_glyph_color';
        if (p.id === player.id) displayName += ' §7(You)§r';
        form.button(displayName, icon);
    }

    form.body(`Total Players: ${onlinePlayers.length}`);
    return form;
}

function buildBountyListForm(title) {
    const form = new ActionFormData().title(title);
    const playersWithBounty = getAllPlayersFromCache().map(p => ({ player: p, data: getPlayer(p.id) })).filter(pInfo => pInfo.data && pInfo.data.bounty > 0);
    form.button('§l§8< Back', 'textures/gui/controls/left.png');
    if (playersWithBounty.length === 0) {
        form.body('§cThere are no active bounties.');
    } else {
        playersWithBounty.sort((a, b) => b.data.bounty - a.data.bounty);
        for (const { player, data } of playersWithBounty) {
            form.button(`${player.name}\n§c$${data.bounty.toFixed(2)}`);
        }
    }
    return form;
}

function buildReportListForm(title) {
    const form = new ActionFormData().title(title);
    const reports = reportManager.getAllReports().filter(r => r.status === 'open' || r.status === 'assigned');
    form.button('§l§8< Back', 'textures/gui/controls/left.png');
    if (reports.length === 0) {
        form.body('§aThere are no active reports.');
    } else {
        reports.sort((a, b) => a.timestamp - b.timestamp);
        for (const report of reports) {
            const statusColor = report.status === 'assigned' ? '§6' : '§c';
            form.button(`[${statusColor}${report.status.toUpperCase()}§r] ${report.reportedPlayerName}\n§7Reported by: ${report.reporterName}`);
        }
    }
    return form;
}

// --- UI Action Functions ---

uiActionFunctions['showRules'] = async (player, context) => {
    debugLog(`[UIManager] Action 'showRules' called by ${player.name}.`);
    const config = getConfig();
    const rulesForm = new ActionFormData()
        .title('§l§eServer Rules')
        .body(config.serverInfo.rules.join('\n'))
        .button('§l§8Close');
    await utils.uiWait(player, rulesForm);
};

uiActionFunctions['teleportTo'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'teleportTo' called by ${player.name} on ${targetPlayer.name}.`);
        player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
        player.sendMessage(`§aTeleported to ${targetPlayer.name}.`);
        // utils.playSoundFromConfig(player, 'adminNotificationReceived');
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['teleportHere'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'teleportHere' called by ${player.name} on ${targetPlayer.name}.`);
        targetPlayer.teleport(player.location, { dimension: player.dimension });
        player.sendMessage(`§aTeleported ${targetPlayer.name} to you.`);
        // utils.playSoundFromConfig(player, 'adminNotificationReceived');
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showBountyForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
        return showPanel(player, panelId, context);
    }
    debugLog(`[UIManager] Action 'showBountyForm' called by ${player.name} on ${targetPlayer.name}.`);
    const form = new ModalFormData().title(`Set Bounty on ${targetPlayer.name}`).textField('Amount', 'Enter bounty amount');
    const response = await utils.uiWait(player, form);
    if (response && !response.canceled) {
        const [amountStr] = response.formValues;
        const amount = parseInt(amountStr);
        const config = getConfig();
        if (isNaN(amount) || amount < config.economy.minimumBounty) {
            player.sendMessage(`§cMinimum bounty is $${config.economy.minimumBounty}.`);
        } else if (economyManager.getBalance(player.id) < amount) {
            player.sendMessage('§cYou do not have enough money.');
        } else {
            const result = economyManager.removeBalance(player.id, amount);
            if (result) {
                const targetData = getPlayer(targetPlayer.id);
                targetData.bounty = (targetData.bounty || 0) + amount;
                const sourceData = getPlayer(player.id);
                if (!sourceData.bounties) sourceData.bounties = {};
                sourceData.bounties[targetPlayer.id] = (sourceData.bounties[targetPlayer.id] || 0) + amount;
                savePlayerData(player.id);
                savePlayerData(targetPlayer.id);
                player.sendMessage(`§aYou placed a bounty of §e$${amount.toFixed(2)}§a on ${targetPlayer.name}.`);
                world.sendMessage(`§cSomeone has placed a bounty of §e$${amount.toFixed(2)}§c on ${targetPlayer.name}!`);
            } else {
                player.sendMessage('§cFailed to place bounty.');
                // utils.playSoundFromConfig(player, 'commandError');
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['toggleFreeze'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot use this action on yourself.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot freeze a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            debugLog(`[UIManager] Action 'toggleFreeze' called by ${player.name} on ${targetPlayer.name}.`);
            const config = getConfig();
            const frozenTag = config.playerTags.frozen;
            if (targetPlayer.hasTag(frozenTag)) {
                targetPlayer.removeTag(frozenTag);
                targetPlayer.removeEffect('slowness');
                player.sendMessage(`§aUnfroze ${targetPlayer.name}.`);
                targetPlayer.sendMessage('§aYou have been unfrozen.');
            } else {
                targetPlayer.addTag(frozenTag);
                targetPlayer.addEffect('slowness', 2000000, { amplifier: 255, showParticles: false });
                player.sendMessage(`§eFroze ${targetPlayer.name}.`);
                targetPlayer.sendMessage('§cYou have been frozen by an admin.');
            }
            // utils.playSoundFromConfig(player, 'adminNotificationReceived');
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['clearInventory'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'clearInventory' called by ${player.name} on ${targetPlayer.name}.`);
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot clear the inventory of a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            const inventory = targetPlayer.getComponent('inventory').container;
            for (let i = 0; i < inventory.size; i++) {
                inventory.setItem(i);
            }
            player.sendMessage(`§aCleared inventory for ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§eYour inventory has been cleared by an admin.');
            // utils.playSoundFromConfig(player, 'adminNotificationReceived');
            // utils.playSoundFromConfig(targetPlayer, 'adminNotificationReceived');
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showKickForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot use this action on yourself.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot kick a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            debugLog(`[UIManager] Action 'showKickForm' called by ${player.name} on ${targetPlayer.name}.`);
            const form = new ModalFormData().title(`Kick ${targetPlayer.name}`).textField('Reason', 'Enter kick reason (optional)');
            const response = await utils.uiWait(player, form);
            if (response && !response.canceled) {
                const [reason] = response.formValues;
                try {
                    await targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" ${reason || 'Kicked by an admin.'}`);
                    player.sendMessage(`§aKicked ${targetPlayer.name}.`);
                    // utils.playSoundFromConfig(player, 'adminNotificationReceived');
                } catch (error) {
                    player.sendMessage(`§cFailed to kick ${targetPlayer.name}.`);
                    // utils.playSoundFromConfig(player, 'commandError');
                    console.error(`[UIManager] Kick failed: ${error.stack}`);
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showReduceBountyForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
        return showPanel(player, panelId, context);
    }
    debugLog(`[UIManager] Action 'showReduceBountyForm' called by ${player.name} on ${targetPlayer.name}.`);
    const targetData = getPlayer(targetPlayer.id);
    if (!targetData || targetData.bounty === 0) {
        player.sendMessage('§cThis player has no bounty.');
    } else {
        const form = new ModalFormData().title(`Reduce Bounty on ${targetPlayer.name}`).textField('Amount', `Max: $${targetData.bounty.toFixed(2)}`);
        const response = await utils.uiWait(player, form);
        if (response && !response.canceled) {
            const [amountStr] = response.formValues;
            const amount = parseInt(amountStr);
            if (isNaN(amount) || amount <= 0) {
                player.sendMessage('§cInvalid amount.');
            } else if (amount > targetData.bounty) {
                player.sendMessage('§cCannot reduce more than the total bounty.');
            } else if (economyManager.getBalance(player.id) < amount) {
                player.sendMessage('§cYou do not have enough money.');
            } else {
                const result = economyManager.removeBalance(player.id, amount);
                if (result) {
                    targetData.bounty -= amount;
                    savePlayerData(player.id);
                    savePlayerData(targetPlayer.id);
                    player.sendMessage(`§aYou reduced the bounty on ${targetPlayer.name} by §e$${amount.toFixed(2)}.`);
                } else {
                    player.sendMessage('§cFailed to reduce bounty.');
                    // utils.playSoundFromConfig(player, 'commandError');
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showMuteForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot use this action on yourself.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot mute a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            debugLog(`[UIManager] Action 'showMuteForm' called by ${player.name} on ${targetPlayer.name}.`);
            const form = new ModalFormData().title(`Mute ${targetPlayer.name}`)
                .textField('Duration', 'e.g., 30m, 2h, 7d, perm', 'perm')
                .textField('Reason', 'Enter mute reason (optional)');
            const response = await utils.uiWait(player, form);
            if (response && !response.canceled) {
                const [durationStr, reason] = response.formValues;
                const durationMs = durationStr === 'perm' ? Infinity : utils.parseDuration(durationStr);
                if (durationMs === 0 && durationStr !== 'perm') {
                    player.sendMessage('§cInvalid duration format.');
                } else {
                    punishmentManager.addPunishment(targetPlayer.id, {
                        type: 'mute',
                        expires: durationMs === Infinity ? Infinity : Date.now() + durationMs,
                        reason: reason || 'Muted by an admin.'
                    });
                    const durationText = durationMs === Infinity ? 'permanently' : `for ${durationStr}`;
                    player.sendMessage(`§aSuccessfully muted ${targetPlayer.name} ${durationText}. Reason: ${reason || 'Muted by an admin.'}`);
                    targetPlayer.sendMessage(`§cYou have been muted ${durationText}. Reason: ${reason || 'Muted by an admin.'}`);
                    // utils.playSoundFromConfig(player, 'adminNotificationReceived');
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showUnmuteForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'showUnmuteForm' called by ${player.name} on ${targetPlayer.name}.`);
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot unmute a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            punishmentManager.removePunishment(targetPlayer.id);
            player.sendMessage(`§aUnmuted ${targetPlayer.name}.`);
            // utils.playSoundFromConfig(player, 'adminNotificationReceived');
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showBanForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot use this action on yourself.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot ban a player with the same or higher rank than you.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            debugLog(`[UIManager] Action 'showBanForm' called by ${player.name} on ${targetPlayer.name}.`);
            const form = new ModalFormData().title(`Ban ${targetPlayer.name}`)
                .textField('Duration', 'e.g., 30m, 2h, 7d, perm', 'perm')
                .textField('Reason', 'Enter ban reason (optional)');
            const response = await utils.uiWait(player, form);
            if (response && !response.canceled) {
                const [durationStr, reason] = response.formValues;
                const durationMs = durationStr === 'perm' ? Infinity : utils.parseDuration(durationStr);
                if (durationMs === 0 && durationStr !== 'perm') {
                    player.sendMessage('§cInvalid duration format.');
                } else {
                    const banReason = reason || 'Banned by an admin.';
                    punishmentManager.addPunishment(targetPlayer.id, {
                        type: 'ban',
                        expires: durationMs === Infinity ? Infinity : Date.now() + durationMs,
                        reason: banReason
                    });
                    const durationText = durationMs === Infinity ? 'permanently' : `for ${durationStr}`;
                    player.sendMessage(`§aSuccessfully banned ${targetPlayer.name} ${durationText}. Reason: ${banReason}`);
                    // utils.playSoundFromConfig(player, 'adminNotificationReceived');
                    targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" You have been banned ${durationText}. Reason: ${banReason}`);
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['sendTpaRequest'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'sendTpaRequest' called by ${player.name} on ${targetPlayer.name}.`);
        const config = getConfig();
        if (!config.tpa.enabled) {
            player.sendMessage('§cThe TPA system is currently disabled.');
        } else {
            const cooldown = getCooldown(player, 'tpa');
            if (cooldown > 0) {
                player.sendMessage(`§cYou must wait ${cooldown} more seconds before sending another TPA request.`);
            } else {
                const result = tpaManager.createRequest(player, targetPlayer, 'tpa');
                if (result.success) {
                    setCooldown(player, 'tpa');
                    player.sendMessage(`§aTPA request sent to ${targetPlayer.name}. They have ${config.tpa.requestTimeoutSeconds} seconds to accept.`);
                    targetPlayer.sendMessage(`§a${player.name} has requested to teleport to you. Type §e!tpaccept§a to accept or §e!tpadeny§a to deny.`);
                } else {
                    player.sendMessage(`§c${result.message}`);
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showPayForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'showPayForm' called by ${player.name} on ${targetPlayer.name}.`);
        const form = new ModalFormData().title(`Pay ${targetPlayer.name}`).textField('Amount', 'Enter amount to pay');
        const response = await utils.uiWait(player, form);

        if (response && !response.canceled) {
            const [amountStr] = response.formValues;
            const amount = parseInt(amountStr);
            if (isNaN(amount) || amount <= 0) {
                player.sendMessage('§cInvalid amount.');
            } else {
                const config = getConfig();
                const sourceData = getPlayer(player.id);
                if (!sourceData || sourceData.balance < amount) {
                    player.sendMessage('§cYou do not have enough money for this payment.');
                } else {
                    if (amount > config.economy.paymentConfirmationThreshold) {
                        economyManager.createPendingPayment(player.id, targetPlayer.id, amount);
                        player.sendMessage(`§ePayment of $${amount.toFixed(2)} to ${targetPlayer.name} is pending.`);
                        player.sendMessage(`§eType §a!payconfirm§e within ${config.economy.paymentConfirmationTimeout} seconds to complete the transaction.`);
                    } else {
                        const result = economyManager.transfer(player.id, targetPlayer.id, amount);
                        if (result.success) {
                            player.sendMessage(`§aYou paid ${targetPlayer.name} §e$${amount.toFixed(2)}.`);
                            targetPlayer.sendMessage(`§aYou received §e$${amount.toFixed(2)}§a from ${player.name}.`);
                        } else {
                            player.sendMessage(`§c${result.message}`);
                        }
                    }
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['showReportForm'] = async (player, context, panelId) => {
    const { targetPlayerId } = context;
    const targetPlayer = getPlayerFromCache(targetPlayerId);
    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage('§cTarget player not found or has logged off.');
        // utils.playSoundFromConfig(player, 'commandError');
    } else {
        debugLog(`[UIManager] Action 'showReportForm' called by ${player.name} on ${targetPlayer.name}.`);
        const form = new ModalFormData().title(`Report ${targetPlayer.name}`).textField('Reason', 'Enter reason for report');
        const response = await utils.uiWait(player, form);
        if (response && !response.canceled) {
            const [reason] = response.formValues;
            if (!reason) {
                player.sendMessage('§cYou must provide a reason for the report.');
            } else {
                reportManager.createReport(player, targetPlayer, reason);
                player.sendMessage('§aThank you for your report. An admin will review it shortly.');
            }
        }
    }
    return showPanel(player, panelId, context);
};

uiActionFunctions['assignReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) return;
    debugLog(`[UIManager] Action 'assignReport' called by ${player.name} for report ${targetReport.id}.`);
    reportManager.assignReport(targetReport.id, player.id);
    player.sendMessage(`§aReport ${targetReport.id} has been assigned to you.`);
    showPanel(player, panelId, context);
};

uiActionFunctions['resolveReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) return;
    debugLog(`[UIManager] Action 'resolveReport' called by ${player.name} for report ${targetReport.id}.`);
    reportManager.resolveReport(targetReport.id);
    player.sendMessage(`§aReport ${targetReport.id} has been marked as resolved.`);
    showPanel(player, 'reportListPanel'); // This one should probably stay hardcoded, as it navigates to a different panel
};

uiActionFunctions['clearReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) return;
    debugLog(`[UIManager] Action 'clearReport' called by ${player.name} for report ${targetReport.id}.`);
    reportManager.clearReport(targetReport.id);
    player.sendMessage(`§aReport ${targetReport.id} has been cleared.`);
    showPanel(player, 'reportListPanel'); // This one should also stay hardcoded
};

uiActionFunctions['showUnbanForm'] = async (player, context, panelId) => {
    debugLog(`[UIManager] Action 'showUnbanForm' called by ${player.name}.`);
    const form = new ModalFormData().title('Unban Player').textField('Player Name', 'Enter the name of the player to unban');
    const response = await utils.uiWait(player, form);
    if (response && !response.canceled) {
        const [targetName] = response.formValues;
        if (!targetName) {
            player.sendMessage('§cYou must enter a player name.');
            // utils.playSoundFromConfig(player, 'commandError');
        } else {
            const targetId = getPlayerIdByName(targetName);

            if (!targetId) {
                player.sendMessage(`§cPlayer "${targetName}" has never joined the server or name is misspelled.`);
                // utils.playSoundFromConfig(player, 'commandError');
            } else if (targetId === player.id) {
                player.sendMessage('§cYou cannot unban yourself.');
                // utils.playSoundFromConfig(player, 'commandError');
            } else {
                const executorData = getPlayer(player.id);
                const targetData = loadPlayerData(targetId); // Load offline player's data for the check

                if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
                    player.sendMessage('§cYou cannot unban a player with the same or higher rank than you.');
                    // utils.playSoundFromConfig(player, 'commandError');
                } else {
                    punishmentManager.removePunishment(targetId);
                    player.sendMessage(`§aSuccessfully unbanned ${targetName}. They can now rejoin the server.`);
                    // utils.playSoundFromConfig(player, 'adminNotificationReceived');
                }
            }
        }
    }
    return showPanel(player, panelId, context);
};
