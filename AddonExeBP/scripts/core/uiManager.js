import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer, savePlayerData } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getAllPlayersFromCache, getPlayerFromCache, findPlayerByName } from './playerCache.js';
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
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name} (ID: ${player.id})`);
        const result = await buildPanelForm(player, panelId, context);
        if (!result) return;

        const form = result.form || result;
        const pageItems = result.pageItems;

        const response = await uiWait(player, form);
        if (!response || response.canceled) return;

        await handleFormResponse(player, panelId, response, context, pageItems);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
    }
}

async function buildPanelForm(player, panelId, context) {
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) return null;
    const pData = getPlayer(player.id);
    if (!pData) return null;

    let title = panelDef.title;
    if (context.targetPlayerId) {
        const targetPlayer = getPlayerFromCache(context.targetPlayerId);
        title = panelDef.title.replace('{playerName}', targetPlayer?.name ?? 'Unknown');
    }

    if (panelId === 'mainPanel') {
        const config = getConfig();
        title = config.serverName || panelDef.title;
    }

    if (['playerListPanel', 'publicPlayerListPanel', 'bountyListPanel', 'reportListPanel'].includes(panelId)) {
        return buildPaginatedListForm(player, panelId, context);
    }

    const form = new ActionFormData().title(title);
    addPanelBody(form, player, panelId, context);
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }
    return form;
}

async function handleFormResponse(player, panelId, response, context, pageItems) {
    if (pageItems) {
        const selectedItem = pageItems[response.selection];
        if (!selectedItem) return;

        if (selectedItem.id === '__back__') return showPanel(player, 'mainPanel');
        if (selectedItem.id === '__prev__') return showPanel(player, panelId, { ...context, page: (context.page || 0) - 1 });
        if (selectedItem.id === '__next__') return showPanel(player, panelId, { ...context, page: (context.page || 0) + 1 });

        let nextPanelId;
        switch (panelId) {
            case 'playerListPanel': nextPanelId = 'playerManagementPanel'; break;
            case 'publicPlayerListPanel': nextPanelId = 'publicPlayerActionsPanel'; break;
            case 'bountyListPanel': nextPanelId = 'bountyActionsPanel'; break;
            case 'reportListPanel': nextPanelId = 'reportActionsPanel'; break;
            default: return;
        }

        const newContext = { ...context, targetPlayerId: selectedItem.id, report: panelId === 'reportListPanel' ? selectedItem : null };
        return showPanel(player, nextPanelId, newContext);
    }

    const pData = getPlayer(player.id);
    if (!pData) return;

    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];
    if (!selectedItem) return;

    if (selectedItem.id === '__back__') {
        return showPanel(player, selectedItem.actionValue, context);
    }

    const actionFunction = uiActionFunctions[selectedItem.actionValue];
    if (actionFunction) {
        return actionFunction(player, context);
    }
}

function getMenuItems(panelDef, permissionLevel) {
    const items = (panelDef.items || []).filter(item => permissionLevel <= item.permissionLevel).sort((a, b) => (a.sortId || 0) - (b.sortId || 0));
    if (panelDef.parentPanelId) {
        items.unshift({ id: '__back__', text: '§l§8< Back', icon: 'textures/gui/controls/left.png', permissionLevel: 1024, actionType: 'openPanel', actionValue: panelDef.parentPanelId });
    }
    return items;
}

function addPanelBody(form, player, panelId, context) {
    if (['playerManagementPanel', 'publicPlayerActionsPanel', 'bountyActionsPanel'].includes(panelId) && context.targetPlayerId) {
        const targetPlayer = getPlayerFromCache(context.targetPlayerId);
        if (!targetPlayer) return form.body("Player not found.");

        const targetPData = getPlayer(targetPlayer.id);
        const rank = getPlayerRank(targetPlayer, getConfig());
        const bounty = targetPData?.bounty?.toFixed(2) ?? '0.00';

        if (panelId === 'playerManagementPanel') {
            const balance = targetPData?.balance?.toFixed(2) ?? '0.00';
            form.body([
                `§fName: §e${targetPlayer.name}`,
                `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`,
                `§fBalance: §a$${balance}`,
                `§fBounty: §e$${bounty}`
            ].join('\n'));
        } else {
            form.body(`§eBounty on this player: $${bounty}`);
        }
    } else if (panelId === 'reportActionsPanel' && context.report) {
        const { report } = context;
        form.body([
            `§fReporter: §e${report.reporterName}`,
            `§fReported: §e${report.reportedPlayerName}`,
            `§fReason: §7${report.reason}`,
            `§fStatus: §e${report.status}`
        ].join('\n'));
    }
}

function buildPaginatedListForm(player, panelId, context) {
    const panelDef = panelDefinitions[panelId];
    const form = new ActionFormData().title(panelDef.title);
    const page = context.page || 0;
    const ITEMS_PER_PAGE = 8;

    let sourceItems = [];
    if (['playerListPanel', 'publicPlayerListPanel'].includes(panelId)) {
        sourceItems = getAllPlayersFromCache().sort((a, b) => a.name.localeCompare(b.name));
    } else if (panelId === 'bountyListPanel') {
        sourceItems = getAllPlayersFromCache()
            .map(p => ({ player: p, data: getPlayer(p.id) }))
            .filter(pInfo => pInfo.data && pInfo.data.bounty > 0)
            .sort((a, b) => b.data.bounty - a.data.bounty)
            .map(pInfo => pInfo.player);
    } else if (panelId === 'reportListPanel') {
        sourceItems = reportManager.getAllReports();
    }

    if (sourceItems.length === 0) {
        form.body('§cNothing to display.');
        form.button('§l§8< Back');
        return { form, pageItems: [{ id: '__back__' }] };
    }

    const totalPages = Math.ceil(sourceItems.length / ITEMS_PER_PAGE);
    const startIndex = page * ITEMS_PER_PAGE;
    const pageItemsData = sourceItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const pageItemsForForm = [{ id: '__back__' }];

    form.button('§l§8< Back');
    if (page > 0) {
        form.button('§l§8< Previous Page');
        pageItemsForForm.push({ id: '__prev__' });
    }

    for (const item of pageItemsData) {
        if (['playerListPanel', 'publicPlayerListPanel'].includes(panelId)) {
            const rank = getPlayerRank(item, getConfig());
            let displayName = `${rank.chatFormatting?.prefixText ?? ''}${item.name}§r`;
            if (item.id === player.id) displayName += ' §7(You)§r';
            form.button(displayName, rank.name === 'Owner' ? 'textures/ui/crown_glyph_color' : undefined);
        } else if (panelId === 'bountyListPanel') {
            const pData = getPlayer(item.id);
            form.button(`${item.name}\n§c$${pData.bounty.toFixed(2)}`);
        } else if (panelId === 'reportListPanel') {
            form.button(`Report against ${item.reportedPlayerName}\n§7Reason: ${item.reason}`);
        }
        pageItemsForForm.push(item);
    }

    if (page < totalPages - 1) {
        form.button('§l§2Next Page >');
        pageItemsForForm.push({ id: '__next__' });
    }

    form.body(`Page ${page + 1} of ${totalPages}`);
    return { form, pageItems: pageItemsForForm };
}

// --- Action Wrappers ---

function withFreshPlayer(action) {
    return (player, context) => {
        const freshPlayer = getPlayerFromCache(player.id);
        if (!freshPlayer || !freshPlayer.isValid()) {
            return console.error(`[UIManager] Stale player object detected for ID ${player.id}. Aborting UI action.`);
        }
        try {
            return action(freshPlayer, context);
        } catch (e) {
            console.error(`[UIManager] CRITICAL ERROR in action for player ${freshPlayer.name}: ${e.message}\n${e.stack}`);
        }
    };
}

function withTargetPlayer(action) {
    return (player, context) => { // Expects a fresh player from withFreshPlayer
        if (!context || !context.targetPlayerId) {
            return player.sendMessage('§cAn error occurred: target player context is missing.');
        }
        const targetPlayer = getPlayerFromCache(context.targetPlayerId);
        if (!targetPlayer || !targetPlayer.isValid()) {
            return player.sendMessage('§cTarget player not found or has logged off.');
        }
        return action(player, targetPlayer, context);
    };
}

const withAdminAction = (action) => withFreshPlayer(withTargetPlayer(action));

// --- UI Action Functions ---

uiActionFunctions['showRules'] = withFreshPlayer(async (player) => {
    const config = getConfig();
    const rulesForm = new ActionFormData().title('§l§eServer Rules').body(config.serverInfo.rules.join('\n')).button('§l§8Close');
    await uiWait(player, rulesForm);
});

uiActionFunctions['teleportTo'] = withAdminAction((player, targetPlayer) => {
    player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
});

uiActionFunctions['teleportHere'] = withAdminAction((player, targetPlayer) => {
    targetPlayer.teleport(player.location, { dimension: player.dimension });
});

uiActionFunctions['toggleFreeze'] = withAdminAction((player, targetPlayer) => {
    const frozenTag = getConfig().playerTags.frozen;
    if (targetPlayer.hasTag(frozenTag)) {
        targetPlayer.removeTag(frozenTag);
        player.sendMessage(`§aUnfroze ${targetPlayer.name}.`);
    } else {
        targetPlayer.addTag(frozenTag);
        player.sendMessage(`§eFroze ${targetPlayer.name}.`);
    }
});

uiActionFunctions['clearInventory'] = withAdminAction((player, targetPlayer) => {
    const inventory = targetPlayer.getComponent('minecraft:inventory').container;
    inventory.clearAll();
    player.sendMessage(`§aCleared inventory for ${targetPlayer.name}.`);
});

uiActionFunctions['showKickForm'] = withAdminAction(async (player, targetPlayer) => {
    const form = new ModalFormData().title(`Kick ${targetPlayer.name}`).textField('Reason', 'Enter kick reason (optional)');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [reason] = response.formValues;
    targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" ${reason || 'Kicked by an admin.'}`);
});

uiActionFunctions['showMuteForm'] = withAdminAction(async (player, targetPlayer) => {
    const form = new ModalFormData().title(`Mute ${targetPlayer.name}`).textField('Duration (e.g., 30m, 2h, 7d, perm)', 'perm').textField('Reason', 'Mute reason');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [durationStr, reason] = response.formValues;
    const durationMs = durationStr === 'perm' ? Infinity : parseDuration(durationStr);
    if (durationMs === 0) return player.sendMessage('§cInvalid duration format.');
    punishmentManager.addPunishment(targetPlayer.id, { type: 'mute', expires: Date.now() + durationMs, reason });
    player.sendMessage(`§aMuted ${targetPlayer.name}.`);
});

uiActionFunctions['showUnmuteForm'] = withAdminAction((player, targetPlayer) => {
    punishmentManager.removePunishment(targetPlayer.id, 'mute');
    player.sendMessage(`§aUnmuted ${targetPlayer.name}.`);
});

uiActionFunctions['showBanForm'] = withAdminAction(async (player, targetPlayer) => {
    const form = new ModalFormData().title(`Ban ${targetPlayer.name}`).textField('Duration (e.g., 30m, 2h, 7d, perm)', 'perm').textField('Reason', 'Ban reason');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [durationStr, reason] = response.formValues;
    const durationMs = durationStr === 'perm' ? Infinity : parseDuration(durationStr);
    if (durationMs === 0) return player.sendMessage('§cInvalid duration format.');
    const banReason = reason || 'Banned by an admin.';
    punishmentManager.addPunishment(targetPlayer.id, { type: 'ban', expires: Date.now() + durationMs, reason: banReason });
    targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" ${banReason}`);
});

uiActionFunctions['sendTpaRequest'] = withAdminAction((player, targetPlayer) => {
    if (player.id === targetPlayer.id) return player.sendMessage('§cYou cannot send a TPA request to yourself.');
    const result = tpaManager.createRequest(player, targetPlayer, 'tpa');
    player.sendMessage(result.success ? `§aTPA request sent to ${targetPlayer.name}.` : `§c${result.message}`);
});

uiActionFunctions['showPayForm'] = withAdminAction(async (player, targetPlayer) => {
    if (player.id === targetPlayer.id) return player.sendMessage('§cYou cannot pay yourself.');
    const form = new ModalFormData().title(`Pay ${targetPlayer.name}`).textField('Amount', 'Enter amount to pay');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return player.sendMessage('§cInvalid amount.');
    const result = economyManager.transfer(player.id, targetPlayer.id, amount);
    player.sendMessage(result.success ? `§aYou paid ${targetPlayer.name} §e$${amount.toFixed(2)}.` : `§c${result.message}`);
});

uiActionFunctions['showBountyForm'] = withAdminAction(async (player, targetPlayer) => {
    const form = new ModalFormData().title(`Set Bounty on ${targetPlayer.name}`).textField('Amount', 'Enter bounty amount');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [amountStr] = response.formValues;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount < getConfig().economy.minimumBounty) return player.sendMessage(`§cMinimum bounty is $${getConfig().economy.minimumBounty}.`);
    if (economyManager.getBalance(player.id) < amount) return player.sendMessage('§cYou do not have enough money.');
    const result = economyManager.addBounty(player.id, targetPlayer.id, amount);
    player.sendMessage(result.success ? `§aYou placed a bounty of §e$${amount.toFixed(2)}§a on ${targetPlayer.name}.` : `§c${result.message}`);
});

uiActionFunctions['showReportForm'] = withAdminAction(async (player, targetPlayer) => {
    const form = new ModalFormData().title(`Report ${targetPlayer.name}`).textField('Reason', 'Enter reason for report');
    const response = await uiWait(player, form);
    if (!response || response.canceled) return;
    const [reason] = response.formValues;
    if (!reason) return player.sendMessage('§cYou must provide a reason for the report.');
    reportManager.createReport(player, targetPlayer, reason);
    player.sendMessage('§aThank you for your report. An admin will review it shortly.');
});

uiActionFunctions['showMyStats'] = withFreshPlayer(async (player) => {
    const pData = getPlayer(player.id);
    const rank = getPlayerRank(player, getConfig());
    const statsBody = `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}\n§fBalance: §a$${pData.balance.toFixed(2)}\n§fBounty on you: §e$${pData.bounty.toFixed(2)}`;
    const form = new ActionFormData().title('§l§3Your Stats').body(statsBody).button('§l§8< Back');
    const response = await uiWait(player, form);
    if (response && !response.canceled) {
        showPanel(player, 'mainPanel');
    }
});

uiActionFunctions['showHelpfulLinks'] = withFreshPlayer(async (player) => {
    const config = getConfig();
    const linksBody = `§9Discord: §r${config.serverInfo.discordLink}\n§1Website: §r${config.serverInfo.websiteLink}`;
    const form = new ActionFormData().title('§l§9Helpful Links').body(linksBody).button('§l§8< Back');
    await uiWait(player, form);
});

// Report-specific actions (don't need target player wrapper)
uiActionFunctions['assignReport'] = withFreshPlayer((player, context) => {
    if (!context.report) return player.sendMessage("§cReport context missing.");
    reportManager.assignReport(context.report.id, player.id);
    player.sendMessage("§aReport assigned to you.");
});

uiActionFunctions['resolveReport'] = withFreshPlayer((player, context) => {
    if (!context.report) return player.sendMessage("§cReport context missing.");
    reportManager.resolveReport(context.report.id);
    player.sendMessage("§aReport marked as resolved.");
});

uiActionFunctions['clearReport'] = withFreshPlayer((player, context) => {
    if (!context.report) return player.sendMessage("§cReport context missing.");
    reportManager.clearReport(context.report.id);
    player.sendMessage("§aReport cleared.");
});
