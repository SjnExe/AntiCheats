import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { findPlayerByName } from '../modules/utils/playerUtils.js';
import { world } from '@minecraft/server';

// This object will map actionValue strings from the config to actual functions.
// We will populate this with functions for kicking, muting, etc.
const UI_ACTION_FUNCTIONS = {};

/**
 * Shows a panel to a player based on a panelId from the panelLayoutConfig.
 * @param {import('@minecraft/server').Player} player The player to show the panel to.
 * @param {string} panelId The ID of the panel to show.
 */
export function showPanel(player, panelId) {
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID "${panelId}" not found.`);
        return;
    }

    const pData = getPlayer(player.id);
    if (!pData) {
        console.error(`[UIManager] Could not get player data for ${player.name}.`);
        return;
    }

    const form = new ActionFormData()
        .title(panelDef.title);

    // Filter items based on player's permission level and add them to the form
    const validItems = panelDef.items
        .filter(item => pData.permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    for (const item of validItems) {
        form.button(item.text, item.icon);
    }

    form.show(player).then(response => {
        if (response.canceled) return;

        const selectedItem = validItems[response.selection];
        if (!selectedItem) return;

        if (selectedItem.actionType === 'openPanel') {
            showPanel(player, selectedItem.actionValue);
        } else if (selectedItem.actionType === 'functionCall') {
            const actionFunction = UI_ACTION_FUNCTIONS[selectedItem.actionValue];
            if (actionFunction) {
                actionFunction(player);
            } else {
                console.warn(`[UIManager] No UI action function found for "${selectedItem.actionValue}"`);
                player.sendMessage(`§cFunctionality for "${selectedItem.text}" is not implemented yet.`);
            }
        }
    });
}

// --- Define Action Functions ---

// These functions will be called by the panel buttons.
// We will add more here as we implement more features.

UI_ACTION_FUNCTIONS['showKickForm'] = (player) => {
    const form = new ModalFormData()
        .title("Kick Player")
        .textField("Player Name", "Enter name of player to kick")
        .textField("Reason", "Enter kick reason", "No reason provided");

    form.show(player).then(async response => {
        if (response.canceled) return;
        const [targetName, reason] = response.formValues;
        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }
        try {
            await world.runCommandAsync(`kick "${targetPlayer.name}" ${reason}`);
            player.sendMessage(`§aSuccessfully kicked ${targetPlayer.name}.`);
        } catch (e) {
            player.sendMessage(`§cFailed to kick player.`);
        }
    });
};

UI_ACTION_FUNCTIONS['showMuteForm'] = (player) => {
    const form = new ModalFormData()
        .title("Mute Player")
        .textField("Player Name", "Enter name of player to mute");

    form.show(player).then(response => {
        if (response.canceled) return;
        const [targetName] = response.formValues;
        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }
        try {
            targetPlayer.addTag('muted');
            player.sendMessage(`§aSuccessfully muted ${targetPlayer.name}.`);
            targetPlayer.sendMessage("§cYou have been muted.");
        } catch (e) {
            player.sendMessage(`§cFailed to mute player.`);
        }
    });
};
