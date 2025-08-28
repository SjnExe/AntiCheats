import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer, savePlayerData } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getAllPlayersFromCache } from './playerCache.js';
import { getPlayerRank } from './rankManager.js';
import { uiWait, parseDuration, playSoundFromConfig } from './utils.js';
import * as economyManager from './economyManager.js';
import * as punishmentManager from './punishmentManager.js';
import * as tpaManager from './tpaManager.js';
import * as reportManager from './reportManager.js';
import { world } from '@minecraft/server';

const uiActionFunctions = {};

// Main entry point for showing a panel.
export async function showPanel(player, panelId, context = {}) {
    try {
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name} with context: ${JSON.stringify(context)}`);
        const form = await buildPanelForm(player, panelId, context);
        if (!form) {
            debugLog(`[UIManager] buildPanelForm returned null for panel '${panelId}'. Aborting.`);
            return;
        }

        const response = await uiWait(player, form);
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

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel' || panelId === 'bountyListPanel') {
        debugLog(`[UIManager] Building dynamic list form for panel '${panelId}'.`);
        // These are special cases that build their own forms
        if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') return buildPlayerListForm(title, player, panelId, context);
        if (panelId === 'bountyListPanel') return buildBountyListForm(title);
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

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        const onlinePlayers = getAllPlayersFromCache().sort((a, b) => a.name.localeCompare(b.name));
        const ITEMS_PER_PAGE = 8;
        const page = context.page || 0;
        const totalPages = Math.ceil(onlinePlayers.length / ITEMS_PER_PAGE);
        let selection = response.selection;

        if (selection === 0) { // Back button
            debugLog(`[UIManager] Player ${player.name} selected 'Back' from player list.`);
            return showPanel(player, 'mainPanel', context);
        }
        selection--;

        if (page > 0) {
            if (selection === 0) { // Previous Page button
                debugLog(`[UIManager] Player ${player.name} selected 'Previous Page' from player list.`);
                return showPanel(player, panelId, { ...context, page: page - 1 });
            }
            selection--;
        }

        const startIndex = page * ITEMS_PER_PAGE;
        const pagePlayers = onlinePlayers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        if (selection < pagePlayers.length) {
            const selectedPlayer = pagePlayers[selection];
            if (selectedPlayer) {
                const nextPanel = panelId === 'playerListPanel' ? 'playerManagementPanel' : 'publicPlayerActionsPanel';
                debugLog(`[UIManager] Player ${player.name} selected player ${selectedPlayer.name}. Opening '${nextPanel}'.`);
                return showPanel(player, nextPanel, { ...context, targetPlayer: selectedPlayer });
            }
        } else {
            if (page < totalPages - 1) {
                debugLog(`[UIManager] Player ${player.name} selected 'Next Page' from player list.`);
                return showPanel(player, panelId, { ...context, page: page + 1 });
            }
        }
        return;
    }

    if (panelId === 'bountyListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel');
        const playersWithBounty = getAllPlayersFromCache().map(p => ({ player: p, data: getPlayer(p.id) })).filter(pInfo => pInfo.data && pInfo.data.bounty > 0).sort((a, b) => b.data.bounty - a.data.bounty);
        const selectedBountyPlayer = playersWithBounty[response.selection - 1]?.player;
        if (selectedBountyPlayer) {
            debugLog(`[UIManager] Player ${player.name} selected bounty player ${selectedBountyPlayer.name}.`);
            return showPanel(player, 'bountyActionsPanel', { ...context, targetPlayer: selectedBountyPlayer });
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
            return actionFunction(player, context);
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
    if (panelId === 'playerManagementPanel' && context.targetPlayer) {
        const { targetPlayer } = context;
        const targetPData = getPlayer(targetPlayer.id);
        if (!targetPData) {
            form.body('§cCould not retrieve player data.');
            return;
        }
        const rank = getPlayerRank(targetPlayer, getConfig());
        form.body([`§fName: §e${targetPlayer.name}`, `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`, `§fBalance: §a$${targetPData.balance?.toFixed(2) ?? '0.00'}`, `§fBounty: §e$${targetPData.bounty?.toFixed(2) ?? '0.00'}`].join('\n'));
    } else if (panelId === 'publicPlayerActionsPanel' && context.targetPlayer) {
        const targetPData = getPlayer(context.targetPlayer.id);
        if (!targetPData) {
            form.body('§cCould not retrieve player data.');
        } else {
            const bounty = targetPData.bounty?.toFixed(2) ?? '0.00';
            form.body(`§eBounty on this player: $${bounty}`);
        }
    } else if (panelId === 'myStatsPanel') {
        const pData = getPlayer(player.id);
        const rank = getPlayerRank(player, getConfig());
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
        const config = getConfig();
        const linksBody = [
            '§fHere are some helpful links:',
            `§9Discord: §r${config.serverInfo.discordLink}`,
            `§1Website: §r${config.serverInfo.websiteLink}`
        ].join('\n\n');
        form.body(linksBody);
    }
}

function buildPlayerListForm(title, player, panelId, context) {
    const form = new ActionFormData().title(title);
    const onlinePlayers = getAllPlayersFromCache().sort((a, b) => a.name.localeCompare(b.name));
    const ITEMS_PER_PAGE = 8;
    const page = context.page || 0;
    const totalPages = Math.ceil(onlinePlayers.length / ITEMS_PER_PAGE);
    const startIndex = page * ITEMS_PER_PAGE;
    const pagePlayers = onlinePlayers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    form.button('§l§8< Back', 'textures/gui/controls/left.png');

    if (page > 0) {
        form.button('§l§8< Previous Page', 'textures/gui/controls/left.png');
    }

    for (const p of pagePlayers) {
        const rank = getPlayerRank(p, getConfig());
        let displayName = `${rank.chatFormatting?.prefixText ?? ''}${p.name}§r`;
        let icon;
        if (panelId === 'playerListPanel' && rank.name === 'Owner') icon = 'textures/ui/crown_glyph_color';
        if (p.id === player.id) displayName += ' §7(You)§r';
        form.button(displayName, icon);
    }

    if (page < totalPages - 1) {
        form.button('§l§2Next Page >', 'textures/gui/controls/right.png');
    }

    form.body(`Page ${page + 1} of ${totalPages}`);
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

// --- UI Action Functions ---

function withTargetPlayer(action) {
    return (player, context) => {
        const { targetPlayer } = context;
        if (!targetPlayer || !targetPlayer.isValid()) {
            player.sendMessage('§cTarget player not found or has logged off.');
            playSoundFromConfig(player, 'commandError');
            debugLog(`[UIManager] Action blocked for ${player.name}: Target player invalid. Context: ${JSON.stringify(context)}`);
            return;
        }
        debugLog(`[UIManager] Executing targeted action for ${player.name} on target ${targetPlayer.name}.`);
        return action(player, targetPlayer, context);
    };
}

uiActionFunctions['showRules'] = async (player, context) => {
    debugLog(`[UIManager] Action 'showRules' called by ${player.name}.`);
    const config = getConfig();
    const rulesForm = new ActionFormData()
        .title('§l§eServer Rules')
        .body(config.serverInfo.rules.join('\n'))
        .button('§l§8Close');
    await uiWait(player, rulesForm);
};

uiActionFunctions['teleportTo'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'teleportTo' called by ${player.name} on ${targetPlayer.name}.`);
    player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
    player.sendMessage(`§aTeleported to ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['teleportHere'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'teleportHere' called by ${player.name} on ${targetPlayer.name}.`);
    targetPlayer.teleport(player.location, { dimension: player.dimension });
    player.sendMessage(`§aTeleported ${targetPlayer.name} to you.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['showBountyForm'] = withTargetPlayer(async (player, targetPlayer, context) => {
    debugLog(`[UIManager] Action 'showBountyForm' called by ${player.name} on ${targetPlayer.name}.`);
    const form = new ModalFormData().title(`Set Bounty on ${targetPlayer.name}`).textField('Amount', 'Enter bounty amount');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    const config = getConfig();
    if (isNaN(amount) || amount < config.economy.minimumBounty) return player.sendMessage(`§cMinimum bounty is $${config.economy.minimumBounty}.`);
    if (economyManager.getBalance(player.id) < amount) return player.sendMessage('§cYou do not have enough money.');
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
        playSoundFromConfig(player, 'commandError');
    }
});

uiActionFunctions['toggleFreeze'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'toggleFreeze' called by ${player.name} on ${targetPlayer.name}.`);

    const executorData = getPlayer(player.id);
    const targetData = getPlayer(targetPlayer.id);

    if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
        player.sendMessage('§cYou cannot freeze a player with the same or higher rank than you.');
        playSoundFromConfig(player, 'commandError');
        return;
    }

    const config = getConfig();
    const frozenTag = config.playerTags.frozen;
    if (targetPlayer.hasTag(frozenTag)) {
        targetPlayer.removeTag(frozenTag);
        player.sendMessage(`§aUnfroze ${targetPlayer.name}.`);
    } else {
        targetPlayer.addTag(frozenTag);
        player.sendMessage(`§eFroze ${targetPlayer.name}.`);
    }
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['clearInventory'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'clearInventory' called by ${player.name} on ${targetPlayer.name}.`);
    const inventory = targetPlayer.getComponent('minecraft:inventory').container;
    inventory.clearAll();
    player.sendMessage(`§aCleared inventory for ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['showKickForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showKickForm' called by ${player.name} on ${targetPlayer.name}.`);

    const executorData = getPlayer(player.id);
    const targetData = getPlayer(targetPlayer.id);

    if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
        player.sendMessage('§cYou cannot kick a player with the same or higher rank than you.');
        playSoundFromConfig(player, 'commandError');
        return;
    }

    const form = new ModalFormData().title(`Kick ${targetPlayer.name}`).textField('Reason', 'Enter kick reason (optional)');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [reason] = response.formValues;
    targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" ${reason || 'Kicked by an admin.'}`);
    player.sendMessage(`§aKicked ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['showReduceBountyForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showReduceBountyForm' called by ${player.name} on ${targetPlayer.name}.`);
    const targetData = getPlayer(targetPlayer.id);
    if (!targetData || targetData.bounty === 0) return player.sendMessage('§cThis player has no bounty.');
    const form = new ModalFormData().title(`Reduce Bounty on ${targetPlayer.name}`).textField('Amount', `Max: $${targetData.bounty.toFixed(2)}`);
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return player.sendMessage('§cInvalid amount.');
    if (amount > targetData.bounty) return player.sendMessage('§cCannot reduce more than the total bounty.');
    if (economyManager.getBalance(player.id) < amount) return player.sendMessage('§cYou do not have enough money.');
    const result = economyManager.removeBalance(player.id, amount);
    if (result) {
        targetData.bounty -= amount;
        savePlayerData(player.id);
        savePlayerData(targetPlayer.id);
        player.sendMessage(`§aYou reduced the bounty on ${targetPlayer.name} by §e$${amount.toFixed(2)}.`);
    } else {
        player.sendMessage('§cFailed to reduce bounty.');
        playSoundFromConfig(player, 'commandError');
    }
});

uiActionFunctions['showMuteForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showMuteForm' called by ${player.name} on ${targetPlayer.name}.`);

    const executorData = getPlayer(player.id);
    const targetData = getPlayer(targetPlayer.id);

    if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
        player.sendMessage('§cYou cannot mute a player with the same or higher rank than you.');
        playSoundFromConfig(player, 'commandError');
        return;
    }

    const form = new ModalFormData().title(`Mute ${targetPlayer.name}`)
        .textField('Duration', 'e.g., 30m, 2h, 7d, perm', 'perm')
        .textField('Reason', 'Enter mute reason (optional)');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [durationStr, reason] = response.formValues;
    const durationMs = durationStr === 'perm' ? Infinity : parseDuration(durationStr);
    if (durationMs === 0 && durationStr !== 'perm') return player.sendMessage('§cInvalid duration format.');

    punishmentManager.addPunishment(targetPlayer.id, {
        type: 'mute',
        expires: durationMs === Infinity ? Infinity : Date.now() + durationMs,
        reason: reason || 'Muted by an admin.'
    });

    player.sendMessage(`§aMuted ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['showUnmuteForm'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showUnmuteForm' called by ${player.name} on ${targetPlayer.name}.`);
    punishmentManager.removePunishment(targetPlayer.id);
    player.sendMessage(`§aUnmuted ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
});

uiActionFunctions['showBanForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showBanForm' called by ${player.name} on ${targetPlayer.name}.`);

    const executorData = getPlayer(player.id);
    const targetData = getPlayer(targetPlayer.id);

    if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
        player.sendMessage('§cYou cannot ban a player with the same or higher rank than you.');
        playSoundFromConfig(player, 'commandError');
        return;
    }

    const form = new ModalFormData().title(`Ban ${targetPlayer.name}`)
        .textField('Duration', 'e.g., 30m, 2h, 7d, perm', 'perm')
        .textField('Reason', 'Enter ban reason (optional)');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [durationStr, reason] = response.formValues;
    const durationMs = durationStr === 'perm' ? Infinity : parseDuration(durationStr);
    if (durationMs === 0 && durationStr !== 'perm') return player.sendMessage('§cInvalid duration format.');

    const banReason = reason || 'Banned by an admin.';
    punishmentManager.addPunishment(targetPlayer.id, {
        type: 'ban',
        expires: durationMs === Infinity ? Infinity : Date.now() + durationMs,
        reason: banReason
    });

    player.sendMessage(`§aBanned ${targetPlayer.name}.`);
    playSoundFromConfig(player, 'adminNotificationReceived');
    targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" ${banReason}`);
});

uiActionFunctions['sendTpaRequest'] = withTargetPlayer((player, targetPlayer) => {
    debugLog(`[UIManager] Action 'sendTpaRequest' called by ${player.name} on ${targetPlayer.name}.`);
    const result = tpaManager.createRequest(player, targetPlayer, 'tpa');
    if (result.success) {
        player.sendMessage(`§aTPA request sent to ${targetPlayer.name}.`);
        targetPlayer.sendMessage(`§a${player.name} has sent you a TPA request. Use !tpaccept or !tpadeny.`);
    } else {
        player.sendMessage(`§c${result.message}`);
    }
});

uiActionFunctions['showPayForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showPayForm' called by ${player.name} on ${targetPlayer.name}.`);
    const form = new ModalFormData().title(`Pay ${targetPlayer.name}`).textField('Amount', 'Enter amount to pay');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return player.sendMessage('§cInvalid amount.');
    const result = economyManager.transfer(player.id, targetPlayer.id, amount);
    if (result.success) {
        player.sendMessage(`§aYou paid ${targetPlayer.name} §e$${amount.toFixed(2)}.`);
        targetPlayer.sendMessage(`§aYou received §e$${amount.toFixed(2)}§a from ${player.name}.`);
    } else {
        player.sendMessage(`§c${result.message}`);
    }
});

uiActionFunctions['showReportForm'] = withTargetPlayer(async (player, targetPlayer) => {
    debugLog(`[UIManager] Action 'showReportForm' called by ${player.name} on ${targetPlayer.name}.`);
    const form = new ModalFormData().title(`Report ${targetPlayer.name}`).textField('Reason', 'Enter reason for report');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [reason] = response.formValues;
    if (!reason) return player.sendMessage('§cYou must provide a reason for the report.');
    reportManager.createReport(player, targetPlayer, reason);
    player.sendMessage('§aThank you for your report. An admin will review it shortly.');
});
