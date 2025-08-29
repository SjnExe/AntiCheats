import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { getConfig } from './configManager.js';
import { getPlayerRank } from './rankManager.js'; // This will need to be re-created
import { uiWait } from './utils.js'; // This will need to be re-created
import { debugLog } from './logger.js';

// For now, this is empty as we have no functionCall actions yet.
export const uiActionFunctions = {};

// --- Main UI Logic ---

export async function showPanel(player, panelId, context = {}) {
    try {
        debugLog(`[UIManager] Showing panel '${panelId}' to ${player.name}`);
        const form = await buildPanelForm(player, panelId, context);
        if (!form) {
            debugLog(`[UIManager] buildPanelForm returned null for panel '${panelId}'.`);
            return;
        }

        const response = await uiWait(player, form);
        if (!response || response.canceled) {
            debugLog(`[UIManager] Panel '${panelId}' was canceled by ${player.name}.`);
            return;
        }

        // We don't need to await this. Let it run in the background.
        handleFormResponse(player, panelId, response, context);
    } catch (e) {
        console.error(`[UIManager] showPanel failed for panel '${panelId}': ${e.stack}`);
    }
}

async function buildPanelForm(player, panelId, context) {
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) return null;

    const pData = getPlayer(player.id);
    if (!pData) return null; // Should not happen due to playerSpawn logic

    let title = panelDef.title.replace('{playerName}', context.targetPlayer?.name ?? '');
    const form = new ActionFormData().title(title);

    addPanelBody(form, player, panelId, context);
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }

    return form;
}

function handleFormResponse(player, panelId, response, context) {
    const pData = getPlayer(player.id);
    if (!pData) return;

    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];

    if (!selectedItem) return;

    debugLog(`[UIManager] Player ${player.name} selected item '${selectedItem.id}' on panel '${panelId}'.`);

    if (selectedItem.actionType === 'openPanel') {
        showPanel(player, selectedItem.actionValue, context);
    } else if (selectedItem.actionType === 'functionCall') {
        const actionFunction = uiActionFunctions[selectedItem.actionValue];
        if (actionFunction) {
            actionFunction(player, context);
        }
    }
}


// --- Helper & Builder Functions ---

function getMenuItems(panelDef, pData) {
    const items = (panelDef.items || []).filter(item => pData.permissionLevel <= item.permissionLevel);
    if (panelDef.parentPanelId) {
        items.unshift({ id: '__back__', text: '§l§8< Back', icon: 'textures/gui/controls/left.png', permissionLevel: 1024, actionType: 'openPanel', actionValue: panelDef.parentPanelId });
    }
    return items;
}

function addPanelBody(form, player, panelId, context) {
    if (panelId === 'myStatsPanel') {
        const pData = getPlayer(player.id);
        const rank = getPlayerRank(player); // Simplified for now
        if (!pData || !rank) {
            form.body('§cCould not retrieve your stats.');
        } else {
            const statsBody = [
                `§fRank: §r${rank.name}`,
                `§fBalance: §a$${pData.balance.toFixed(2)}`
            ].join('\n');
            form.body(statsBody);
        }
    }
}
