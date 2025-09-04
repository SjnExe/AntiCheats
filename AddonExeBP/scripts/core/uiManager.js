import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer, getPlayerIdByName, loadPlayerData, getAllPlayerNameIdMap } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { errorLog } from './errorLogger.js';
import { getPlayerRank } from './rankManager.js';
import { getPlayerFromCache } from './playerCache.js';
import * as utils from './utils.js';
import * as punishmentManager from './punishmentManager.js';
import * as reportManager from './reportManager.js';

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
        errorLog(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
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

    if (panelDef.formType === 'modal') {
        return buildModalForm(title, panelDef, context);
    }

    if (panelId === 'mainPanel') {
        const config = getConfig();
        title = config.serverName || panelDef.title;
    }

    if (panelId === 'bountyListPanel') {
        debugLog(`[UIManager] Building dynamic list form for panel '${panelId}'.`);
        return buildBountyListForm(title);
    }

    if (panelId === 'reportListPanel') {
        debugLog(`[UIManager] Building dynamic list form for panel '${panelId}'.`);
        return buildReportListForm(title);
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
    debugLog(`[UIManager] Handling form response for panel '${panelId}' from ${player.name}.`);
    const pData = getPlayer(player.id);
    if (!pData) {
        debugLog(`[UIManager] Player data not found for ${player.name} during form response. Aborting.`);
        return;
    }

    const panelDef = panelDefinitions[panelId];

    // Handle modal form submissions
    if (panelDef.formType === 'modal') {
        if (panelDef.onSubmit) {
            const actionFunction = uiActionFunctions[panelDef.onSubmit];
            if (actionFunction) {
                debugLog(`[UIManager] Calling modal onSubmit function: ${panelDef.onSubmit}`);
                await actionFunction(player, context, response.formValues);
            } else {
                debugLog(`[UIManager] ERROR: Modal onSubmit function '${panelDef.onSubmit}' not found.`);
            }
        }
        return;
    }

    if (panelId === 'bountyListPanel') {
        // The first button (selection 0) is 'Back'. For now, clicking a bounty
        // also just returns to the main menu as there is no action defined.
        return showPanel(player, 'mainPanel');
    }

    if (panelId === 'reportListPanel') {
        if (response.selection === 0) {return showPanel(player, 'mainPanel');}
        const reports = reportManager.getAllReports().filter(r => r.status === 'open' || r.status === 'assigned').sort((a, b) => a.timestamp - b.timestamp);
        const selectedReport = reports[response.selection - 1];
        if (selectedReport) {
            debugLog(`[UIManager] Player ${player.name} selected report ${selectedReport.id}.`);
            return showPanel(player, 'reportActionsPanel', { ...context, targetReport: selectedReport });
        }
        return;
    }

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
            const shouldReload = await actionFunction(player, context, panelId);
            if (shouldReload) {
            // If the action function returns true, it signals that the panel should be re-shown.
            // This is to avoid a nested showPanel call which seems to cause issues.
                showPanel(player, panelId, context);
            }
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

function buildModalForm(title, panelDef) {
    const form = new ModalFormData().title(title);
    (panelDef.controls || []).forEach(control => {
        switch (control.type) {
            case 'textField':
                form.textField(control.label, control.placeholder || '', control.defaultValue || '');
                break;
            case 'toggle':
                form.toggle(control.label, control.defaultValue || false);
                break;
            // Add other control types like slider, dropdown here if needed
        }
    });
    return form;
}

function getReportedPlayerName(report) {
    if (report.reportedPlayerName) {
        return report.reportedPlayerName;
    }
    // Fallback for old reports that didn't store the name
    const allNames = getAllPlayerNameIdMap();
    for (const [name, id] of allNames.entries()) {
        if (id === report.reportedPlayerId) {
            // This is not the original casing, but it's better than nothing.
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }
    return 'Unknown Player';
}

function addPanelBody(form, player, panelId, context) {
    const config = getConfig();
    if (panelId === 'myStatsPanel') {
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
        const reportedPlayerName = getReportedPlayerName(targetReport);
        const body = [
            `§fReport ID: §e${targetReport.id}`,
            `§fReported Player: §e${reportedPlayerName}`,
            `§fReporter: §e${targetReport.reporterName}`,
            `§fReason: §e${targetReport.reason}`,
            `§fStatus: §e${targetReport.status}`,
            `§fDate: §e${reportDate}`
        ].join('\n');
        form.body(body);
    }
}

async function buildBountyListForm(title) {
    const form = new ActionFormData().title(title);
    form.button('§l§8< Back', 'textures/gui/controls/left.png');

    const playerNameIdMap = getAllPlayerNameIdMap();
    const bounties = [];

    // This could be slow if there are many players who have ever joined.
    // A better implementation would be a dedicated bounty manager.
    for (const [playerName, playerId] of playerNameIdMap.entries()) {
        const pData = getPlayer(playerId) ?? loadPlayerData(playerId);
        if (pData && pData.bounty > 0) {
            // Find the original casing for the player name if possible
            const onlinePlayer = getPlayerFromCache(playerId);
            const displayName = onlinePlayer ? onlinePlayer.name : playerName;
            bounties.push({ name: displayName, bounty: pData.bounty });
        }
    }

    if (bounties.length === 0) {
        form.body('§aThere are currently no active bounties.');
    } else {
        bounties.sort((a, b) => b.bounty - a.bounty); // Sort descending by bounty amount
        for (const bounty of bounties) {
            form.button(`§e${bounty.name}\n§e$${bounty.bounty.toFixed(2)}`);
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
            const reportedPlayerName = getReportedPlayerName(report);
            form.button(`[${statusColor}${report.status.toUpperCase()}§r] §e${reportedPlayerName}\n§7Reported by: ${report.reporterName}`);
        }
    }
    return form;
}

// --- UI Action Functions ---

uiActionFunctions['submitReport'] = async (player, context, formValues) => {
    const { targetPlayer } = context;
    const [reason] = formValues;

    if (!targetPlayer) {
        errorLog('[UIManager] submitReport action called without a targetPlayer in context.');
        return;
    }
    if (!reason) {
        player.sendMessage('§cYou must provide a reason for the report.');
        return;
    }

    reportManager.createReport(player, targetPlayer, reason);
    player.sendMessage('§aReport submitted. Thank you for your help.');
};

uiActionFunctions['showRules'] = async (player, context) => {
    debugLog(`[UIManager] Action 'showRules' called by ${player.name}.`);
    const config = getConfig();
    const rulesForm = new ActionFormData()
        .title('§l§eServer Rules')
        .body(config.serverInfo.rules.join('\n'))
        .button('§l§8Close');
    await utils.uiWait(player, rulesForm);
};


uiActionFunctions['assignReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) {return;}
    debugLog(`[UIManager] Action 'assignReport' called by ${player.name} for report ${targetReport.id}.`);
    reportManager.assignReport(targetReport.id, player.id);
    player.sendMessage(`§aReport ${targetReport.id} has been assigned to you.`);
    showPanel(player, panelId, context);
};

uiActionFunctions['resolveReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) {return;}
    debugLog(`[UIManager] Action 'resolveReport' called by ${player.name} for report ${targetReport.id}.`);
    reportManager.resolveReport(targetReport.id);
    player.sendMessage(`§aReport ${targetReport.id} has been marked as resolved.`);
    showPanel(player, 'reportListPanel'); // This one should probably stay hardcoded, as it navigates to a different panel
};

uiActionFunctions['clearReport'] = (player, context, panelId) => {
    const { targetReport } = context;
    if (!targetReport) {return;}
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
        } else {
            const targetId = getPlayerIdByName(targetName);

            if (!targetId) {
                player.sendMessage(`§cPlayer "${targetName}" has never joined the server or name is misspelled.`);
            } else if (targetId === player.id) {
                player.sendMessage('§cYou cannot unban yourself.');
            } else {
                const executorData = getPlayer(player.id);
                const targetData = loadPlayerData(targetId); // Load offline player's data for the check

                if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel) {
                    player.sendMessage('§cYou cannot unban a player with the same or higher rank than you.');
                } else {
                    punishmentManager.removePunishment(targetId);
                    player.sendMessage(`§aSuccessfully unbanned ${targetName}. They can now rejoin the server.`);
                }
            }
        }
    }
    return true;
};
