import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { findPlayerByName } from '../modules/utils/playerUtils.js';
import { world, system } from '@minecraft/server';

const uiActionFunctions = {};

export function showPanel(player, panelId, context = {}) {
    console.log(`[UIManager] Attempting to show panel "${panelId}" to ${player.name} with context: ${JSON.stringify(context)}`);
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID "${panelId}" not found.`);
        return;
    }

    let title = panelDef.title;
    if (context.targetPlayer) {
        title = title.replace('{playerName}', context.targetPlayer.name);
    }
    console.log(`[UIManager] Found panel definition for "${panelId}". Title: ${title}`);

    const pData = getPlayer(player.id);
    if (!pData) {
        console.error(`[UIManager] Could not get player data for ${player.name}.`);
        return;
    }

    // Special handling for dynamic panels
    if (panelId === 'playerListPanel') {
        const onlinePlayers = world.getAllPlayers();
        const form = new ActionFormData().title(title);
        for (const p of onlinePlayers) {
            form.button(p.name);
        }

        system.runTimeout(() => {
            form.show(player).then(response => {
                if (response.canceled) return;
                const selectedPlayer = onlinePlayers[response.selection];
                if (selectedPlayer) {
                    showPanel(player, 'playerManagementPanel', { targetPlayer: selectedPlayer });
                }
            }).catch(e => console.error(`[UIManager] playerListPanel promise rejected: ${e.stack}`));
        }, 10);
        return; // Stop further processing for this panel
    }


    const form = new ActionFormData().title(title);

    const validItems = panelDef.items
        .filter(item => pData.permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    console.log(`[UIManager] Found ${validItems.length} valid buttons for player's permission level.`);

    for (const item of validItems) {
        form.button(item.text, item.icon);
    }

    console.log('[UIManager] Calling form.show(player) after a short delay...');
    system.runTimeout(() => {
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
                const actionFunction = uiActionFunctions[selectedItem.actionValue];
                if (actionFunction) {
                    actionFunction(player, context);
                } else {
                    console.warn(`[UIManager] No UI action function found for "${selectedItem.actionValue}"`);
                    player.sendMessage(`§cFunctionality for "${selectedItem.text}" is not implemented yet.`);
                }
            }
        }).catch(e => {
            console.error(`[UIManager] form.show() promise was rejected with error: ${e.stack}`);
        });
    }, 10);
}

uiActionFunctions['showKickForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) {
        player.sendMessage('§cTarget player not found in context.');
        return;
    }

    if (player.id === targetPlayer.id) {
        player.sendMessage("§cYou cannot kick yourself.");
        return;
    }

    const form = new ModalFormData()
        .title(`Kick ${targetPlayer.name}`)
        .textField('Reason', 'Enter kick reason', 'No reason provided');

    form.show(player).then(async response => {
        if (response.canceled) return;
        const [reason] = response.formValues;
        try {
            // Re-fetch the player object to ensure it's still valid
            const freshTarget = world.getPlayer(targetPlayer.id);
            if (!freshTarget) {
                player.sendMessage(`§cPlayer ${targetPlayer.name} is no longer online.`);
                return;
            }
            await world.runCommandAsync(`kick "${freshTarget.name}" ${reason}`);
            player.sendMessage(`§aSuccessfully kicked ${freshTarget.name}.`);
        } catch {
            player.sendMessage('§cFailed to kick player.');
        }
    }).catch(e => {
        console.error(`[UIManager] showKickForm promise rejected: ${e.stack}`);
    });
};

uiActionFunctions['showMuteForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) {
        player.sendMessage('§cTarget player not found in context.');
        return;
    }

    if (player.id === targetPlayer.id) {
        player.sendMessage("§cYou cannot mute yourself.");
        return;
    }

    const form = new ModalFormData()
        .title(`Mute ${targetPlayer.name}?`)
        .toggle('Confirm Mute', false);

    form.show(player).then(response => {
        if (response.canceled || !response.formValues[0]) return;

        try {
            // Re-fetch the player object to ensure it's still valid
            const freshTarget = world.getPlayer(targetPlayer.id);
            if (!freshTarget) {
                player.sendMessage(`§cPlayer ${targetPlayer.name} is no longer online.`);
                return;
            }
            freshTarget.addTag('muted');
            player.sendMessage(`§aSuccessfully muted ${freshTarget.name}.`);
            freshTarget.sendMessage('§cYou have been muted.');
        } catch {
            player.sendMessage('§cFailed to mute player.');
        }
    }).catch(e => {
        console.error(`[UIManager] showMuteForm promise rejected: ${e.stack}`);
    });
};
