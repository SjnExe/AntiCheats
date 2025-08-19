import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { findPlayerByName } from '../modules/utils/playerUtils.js';
import { world } from '@minecraft/server';

const UI_ACTION_FUNCTIONS = {};

export function showPanel(player, panelId) {
    console.log(`[UIManager] Attempting to show panel "${panelId}" to ${player.name}.`);
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID "${panelId}" not found.`);
        return;
    }
    console.log(`[UIManager] Found panel definition for "${panelId}". Title: ${panelDef.title}`);

    const pData = getPlayer(player.id);
    if (!pData) {
        console.error(`[UIManager] Could not get player data for ${player.name}.`);
        return;
    }

    const form = new ActionFormData().title(panelDef.title);

    const validItems = panelDef.items
        .filter(item => pData.permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    console.log(`[UIManager] Found ${validItems.length} valid buttons for player's permission level.`);

    for (const item of validItems) {
        form.button(item.text, item.icon);
    }

    console.log('[UIManager] Calling form.show(player)...');
    form.show(player).then(response => {
        console.log('[UIManager] form.show() promise resolved.');
        if (response.canceled) {
            console.log('[UIManager] Player cancelled the form.');
            return;
        }

        const selectedItem = validItems[response.selection];
        if (!selectedItem) {
            console.error('[UIManager] Selected item was not found in validItems array.');
            return;
        }

        console.log(`[UIManager] Player selected button: "${selectedItem.id}", action: ${selectedItem.actionType}`);

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
    }).catch(e => {
        console.error(`[UIManager] form.show() promise was rejected with error: ${e.stack}`);
    });
}

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
