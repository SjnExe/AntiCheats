import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getPlayerRank } from './rankManager.js';
import { playSound } from './utils.js';

const uiActionFunctions = {};

/**
 * Builds and shows a panel to a player.
 * @param {import('@minecraft/server').Player} player The player to show the panel to.
 * @param {string} panelId The ID of the panel from panelLayoutConfig.js.
 * @param {object} context Contextual data, e.g., { targetPlayer: Player }.
 */
export function showPanel(player, panelId, context = {}) {
    debugLog(`[UIManager] Attempting to show panel '${panelId}'`);
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID '${panelId}' not found.`);
        return;
    }

    const pData = getPlayer(player.id);
    if (!pData) {
        console.error(`[UIManager] Could not get player data for ${player.name}.`);
        return;
    }

    const form = buildPanelForm(player, panelId, context, pData);

    form.show(player).then(response => {
        if (response.canceled) {
            // Check if the form was cancelled because the chat UI is open
            if (response.cancelationReason === 'UserBusy') {
                player.sendMessage("§cPlease close the chat to view the UI.");
            }
            return;
        }
        handleFormResponse(player, panelId, response, context);
    }).catch(e => {
        console.error(`[UIManager] form.show() promise rejected for panel '${panelId}': ${e.stack}`);
    });
}

/**
 * Builds a form object based on a panel definition.
 * @returns {ActionFormData | ModalFormData | MessageFormData}
 */
function buildPanelForm(player, panelId, context, pData) {
    const panelDef = panelDefinitions[panelId];
    let title = panelDef.title.replace('{playerName}', context.targetPlayer?.name ?? '');

    // Handle dynamic panels
    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        const form = new ActionFormData().title(title);
        const onlinePlayers = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
        form.button('§l§8< Back', 'textures/gui/controls/left.png');
        for (const p of onlinePlayers) {
            const rank = getPlayerRank(p, getConfig());
            const prefix = rank.chatFormatting?.prefixText ?? '';
            let displayName = `${prefix}${p.name}§r`;
            let icon = (panelId === 'playerListPanel' && rank.name === 'Owner') ? 'textures/ui/crown_glyph_color' : undefined;
            if (p.id === player.id) displayName += ' §7(You)§r';
            form.button(displayName, icon);
        }
        return form;
    }

    // Standard panels
    const form = new ActionFormData().title(title);
    addPanelBody(form, panelId, context);

    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }
    return form;
}

/**
 * Processes the response from a submitted form.
 */
function handleFormResponse(player, panelId, response, context) {
    const pData = getPlayer(player.id);
    if (!pData) return;

    if (panelId === 'playerListPanel' || panelId === 'publicPlayerListPanel') {
        if (response.selection === 0) return showPanel(player, 'mainPanel', context);
        const playerList = world.getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
        const selectedPlayer = playerList[response.selection - 1];
        if (selectedPlayer) {
            const nextPanel = panelId === 'playerListPanel' ? 'playerManagementPanel' : 'publicPlayerActionsPanel';
            return showPanel(player, nextPanel, { ...context, targetPlayer: selectedPlayer });
        }
        return;
    }

    const panelDef = panelDefinitions[panelId];
    const menuItems = getMenuItems(panelDef, pData.permissionLevel);
    const selectedItem = menuItems[response.selection];

    if (!selectedItem) return;

    if (selectedItem.id === '__back__') {
        return showPanel(player, selectedItem.actionValue, context);
    }

    if (selectedItem.actionType === 'openPanel') {
        return showPanel(player, selectedItem.actionValue, context);
    } else if (selectedItem.actionType === 'functionCall') {
        const actionFunction = uiActionFunctions[selectedItem.actionValue];
        if (actionFunction) {
            actionFunction(player, context);
        } else {
            player.sendMessage(`§cFunctionality for '${selectedItem.text}' is not implemented yet.`);
        }
    }
}

function getMenuItems(panelDef, permissionLevel) {
    const items = (panelDef.items || [])
        .filter(item => permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    if (panelDef.parentPanelId) {
        items.unshift({
            id: '__back__',
            text: '§l§8< Back',
            icon: 'textures/gui/controls/left.png',
            permissionLevel: 1024,
            actionType: 'openPanel',
            actionValue: panelDef.parentPanelId
        });
    }
    return items;
}

function addPanelBody(form, panelId, context) {
    if (panelId === 'playerManagementPanel' && context.targetPlayer) {
        const { targetPlayer } = context;
        const targetPData = getPlayer(targetPlayer.id);
        const rank = getPlayerRank(targetPlayer, getConfig());
        const profile = [
            `§fName: §e${targetPlayer.name}`,
            `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`,
            `§fBalance: §a$${targetPData?.balance?.toFixed(2) ?? '0.00'}`
        ].join('\n\n');
        form.body(profile);
    }
}

// UI Action functions still need to be defined, but they will be simpler now.
// They will just build and show a modal/message form.

uiActionFunctions['showKickForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return;

    const form = new ModalFormData().title(`Kick ${targetPlayer.name}`).textField('Reason', 'Kick reason', 'No reason provided');
    form.show(player).then(response => {
        if (response.canceled) return;
        const [reason] = response.formValues;
        const freshTarget = world.getPlayer(targetPlayer.id);
        if (freshTarget) {
            freshTarget.kick(reason);
            player.sendMessage(`§aKicked ${freshTarget.name}.`);
        } else {
            player.sendMessage('§cTarget player is no longer online.');
        }
    }).catch(e => {
        if (e.cancelationReason === 'UserBusy') {
            player.sendMessage("§cPlease close the chat to view the UI.");
        }
    });
};

uiActionFunctions['clearInventory'] = (player, context) => {
    const targetPlayerId = context.targetPlayer?.id;
    if (!targetPlayerId) return player.sendMessage('§cTarget not found.');

    const freshTarget = world.getPlayer(targetPlayerId);
    if (!freshTarget) return player.sendMessage('§cTarget player is no longer online.');

    const inventory = freshTarget.getComponent('inventory')?.container;
    if (inventory) {
        for (let i = 0; i < inventory.size; i++) {
            inventory.setItem(i);
        }
        player.sendMessage(`§aCleared ${freshTarget.name}'s inventory.`);
        freshTarget.sendMessage('§eYour inventory was cleared by an admin.');
    }
};

// ... other action functions would follow a similar pattern ...
// For brevity, only a few are shown.
