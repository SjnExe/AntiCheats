import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { world, system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';

const uiActionFunctions = {};

export function showPanel(player, panelId, context = {}) {
    debugLog(`[UIManager] Attempting to show panel "${panelId}" to ${player.name} with context: ${JSON.stringify(context)}`);
    const panelDef = panelDefinitions[panelId];
    if (!panelDef) {
        console.error(`[UIManager] Panel with ID "${panelId}" not found.`);
        return;
    }

    let title = panelDef.title;
    if (context.targetPlayer) {
        title = title.replace('{playerName}', context.targetPlayer.name);
    }
    debugLog(`[UIManager] Found panel definition for "${panelId}". Title: ${title}`);

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

    const menuItems = panelDef.items
        .filter(item => pData.permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    // Add a back button if this is not a top-level panel
    if (panelDef.parentPanelId) {
        menuItems.unshift({
            id: '__back__',
            text: '§l§8< Back',
            icon: 'textures/ui/icon_left_arrow',
            permissionLevel: 1024,
            actionType: 'openPanel', // This is a placeholder, the logic is handled specially
            actionValue: panelDef.parentPanelId,
        });
    }

    debugLog(`[UIManager] Found ${menuItems.length} valid buttons for player's permission level.`);

    for (const item of menuItems) {
        form.button(item.text, item.icon);
    }

    form.show(player).then(response => {
        debugLog('[UIManager] form.show() promise resolved.');
        if (response.canceled) {
            debugLog('[UIManager] Player cancelled the form.');
            return;
        }

        const selectedItem = menuItems[response.selection];
        if (!selectedItem) {
            console.error('[UIManager] Selected item was not found in validItems array.');
            return;
        }

        debugLog(`[UIManager] Player selected button: "${selectedItem.id}", action: ${selectedItem.actionType}`);

        // Special handling for the back button
        if (selectedItem.id === '__back__') {
            showPanel(player, selectedItem.actionValue, context); // Pass context back
            return;
        }

        if (selectedItem.actionType === 'openPanel') {
            showPanel(player, selectedItem.actionValue, context);
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
}

uiActionFunctions['showKickForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) {
        player.sendMessage('§cTarget player not found in context.');
        return;
    }

    if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot kick yourself.');
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
        player.sendMessage('§cYou cannot mute yourself.');
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

uiActionFunctions['showRules'] = (player) => {
    const config = getConfig();
    const rules = config.serverInfo.rules;

    if (!rules || rules.length === 0) {
        const form = new MessageFormData()
            .title('§lServer Rules§r')
            .body('§cThe server rules have not been configured.')
            .button1('§l§cClose§r');
        form.show(player).catch(e => console.error(`[UIManager] showRules promise rejected: ${e.stack}`));
        return;
    }

    const form = new MessageFormData()
        .title('§lServer Rules§r')
        .body(rules.join('\n\n'))
        .button1('Back')
        .button2('Close');

    form.show(player).then(response => {
        if (response.selection === 0) { // Back button
            showPanel(player, 'mainPanel');
        }
    }).catch(e => console.error(`[UIManager] showRules promise rejected: ${e.stack}`));
};

uiActionFunctions['showStatus'] = (player) => {
    const onlinePlayers = world.getAllPlayers().length;
    const statusText = [
        '§l§bServer Status§r',
        `§eOnline Players: §f${onlinePlayers}`,
        `§eCurrent Tick: §f${system.currentTick}`,
        // Add more status info here later
    ].join('\n\n');

    const form = new MessageFormData()
        .title('§lServer Status§r')
        .body(statusText)
        .button1('Back')
        .button2('Close');

    form.show(player).then(response => {
        if (response.selection === 0) { // Back button
            showPanel(player, 'mainPanel');
        }
    }).catch(e => console.error(`[UIManager] showStatus promise rejected: ${e.stack}`));
};
