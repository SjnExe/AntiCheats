import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { getPlayer } from './playerDataManager.js';
import { world, system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';
import { getPlayerRank } from './rankManager.js';
import { playSound } from './utils.js';

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
        const config = getConfig();
        const onlinePlayers = world.getAllPlayers();
        const form = new ActionFormData().title(title);

        const playerList = onlinePlayers.map(p => {
            const rank = getPlayerRank(p, config);
            let displayName = p.name;
            let icon; // Default icon is undefined

            if (rank.name === 'Owner') {
                displayName += ` §r${rank.chatFormatting?.nameColor ?? '§4'}§lOwner§r`;
                icon = 'textures/ui/crown_glyph_color';
            } else if (rank.name === 'Admin') {
                displayName += ` §r${rank.chatFormatting?.nameColor ?? '§c'}§lAdmin§r`;
            }

            if (p.id === player.id) {
                displayName += ' §7(You)§r';
            }

            return { player: p, rank, displayName, icon };
        });

        playerList.sort((a, b) => {
            if (a.rank.permissionLevel !== b.rank.permissionLevel) {
                return a.rank.permissionLevel - b.rank.permissionLevel;
            }
            return a.displayName.localeCompare(b.displayName);
        });

        // Add a back button
        form.button('§l§8< Back');

        playerList.forEach(p => form.button(p.displayName, p.icon));

        system.runTimeout(() => {
            form.show(player).then(response => {
                if (response.canceled) return;
                if (response.selection === 0) { // Back button
                    showPanel(player, 'mainPanel');
                    return;
                }
                const selectedPlayer = playerList[response.selection - 1].player;
                if (selectedPlayer) {
                    showPanel(player, 'playerManagementPanel', { targetPlayer: selectedPlayer });
                }
            }).catch(e => console.error(`[UIManager] playerListPanel promise rejected: ${e.stack}`));
        }, 10);
        return; // Stop further processing for this panel
    } else if (panelId === 'publicPlayerListPanel') {
        const config = getConfig();
        const onlinePlayers = world.getAllPlayers();
        const form = new ActionFormData().title(title);

        const playerList = onlinePlayers.map(p => {
            const rank = getPlayerRank(p, config);
            // Use the chat prefix for the display name
            const prefix = rank.chatFormatting?.prefixText ?? '';
            let displayName = `${prefix}${p.name}§r`;
            return { rank, displayName };
        });

        playerList.sort((a, b) => {
            if (a.rank.permissionLevel !== b.rank.permissionLevel) {
                return a.rank.permissionLevel - b.rank.permissionLevel;
            }
            return a.displayName.localeCompare(b.displayName);
        });

        // Add a back button
        form.button('§l§8< Back');

        playerList.forEach(p => form.button(p.displayName)); // No icons needed here

        system.runTimeout(() => {
            form.show(player).then(response => {
                if (response.canceled || response.selection === 0) {
                    showPanel(player, 'mainPanel');
                }
                // No action when a player name is clicked
            }).catch(e => console.error(`[UIManager] publicPlayerListPanel promise rejected: ${e.stack}`));
        }, 10);
        return;
    }


    const form = new ActionFormData().title(title);

    // If it's the player management panel, add the profile body
    if (panelId === 'playerManagementPanel') {
        const targetPlayer = context.targetPlayer;
        // This check should always pass if we reached here, but good practice
        if (targetPlayer) {
            const config = getConfig();
            const targetPData = getPlayer(targetPlayer.id);
            const rank = getPlayerRank(targetPlayer, config);
            const profile = [
                `§fName: §e${targetPlayer.name}`,
                `§fRank: §r${rank.chatFormatting?.nameColor ?? '§7'}${rank.name}`,
                `§fBalance: §a$${targetPData?.balance?.toFixed(2) ?? '0.00'}`,
                `§fDimension: §6${targetPlayer.dimension.id.replace('minecraft:', '')}`,
                `§fCoords: §bX: ${Math.floor(targetPlayer.location.x)}, Y: ${Math.floor(targetPlayer.location.y)}, Z: ${Math.floor(targetPlayer.location.z)}`,
            ].join('\n\n'); // Use double newline for spacing
            form.body(profile);
        }
    }

    const menuItems = panelDef.items
        .filter(item => pData.permissionLevel <= item.permissionLevel)
        .sort((a, b) => (a.sortId || 0) - (b.sortId || 0));

    // Add a back button if this is not a top-level panel
    if (panelDef.parentPanelId) {
        menuItems.unshift({
            id: '__back__',
            text: '§l§8< Back',
            icon: 'textures/ui/arrow_left',
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
            playSound(player, 'note.bass');
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
                playSound(player, 'note.bass');
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

uiActionFunctions['showBanForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');

    const form = new ModalFormData()
        .title(`Ban ${targetPlayer.name}`)
        .textField('Duration (e.g., 1d, 2h, 30m)', 'Enter duration, or leave blank for permanent', 'perm')
        .textField('Reason', 'Enter ban reason', 'No reason provided');

    form.show(player).then(response => {
        if (response.canceled) return;
        const [duration, reason] = response.formValues;
        player.runCommandAsync(`ban "${targetPlayer.name}" ${duration} ${reason}`);
    }).catch(e => console.error(`[UIManager] showBanForm promise rejected: ${e.stack}`));
};

uiActionFunctions['showUnmuteForm'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');

    const form = new ModalFormData()
        .title(`Unmute ${targetPlayer.name}?`)
        .toggle('Confirm Unmute', false);

    form.show(player).then(response => {
        if (response.canceled || !response.formValues[0]) return;
        player.runCommandAsync(`unmute "${targetPlayer.name}"`);
    }).catch(e => console.error(`[UIManager] showUnmuteForm promise rejected: ${e.stack}`));
};

uiActionFunctions['toggleFreeze'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    player.runCommandAsync(`freeze "${targetPlayer.name}"`);
};

uiActionFunctions['viewInventory'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    player.runCommandAsync(`invsee "${targetPlayer.name}"`);
};

uiActionFunctions['clearInventory'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    player.runCommandAsync(`clear "${targetPlayer.name}"`);
};

uiActionFunctions['teleportTo'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    player.runCommandAsync(`tp "${player.name}" "${targetPlayer.name}"`);
};

uiActionFunctions['teleportHere'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) return player.sendMessage('§cTarget player not found.');
    player.runCommandAsync(`tp "${targetPlayer.name}" "${player.name}"`);
};

// --- Inventory Viewer Logic ---
// This is kept inside the UI manager to avoid command/UI conflicts.
uiActionFunctions['showInventoryPanel'] = (player, context) => {
    const targetPlayer = context.targetPlayer;
    if (!targetPlayer) {
        player.sendMessage('§cTarget player not found in context.');
        return;
    }

    const targetId = targetPlayer.id;
    const targetName = targetPlayer.name;
    const ITEMS_PER_PAGE = 10;

    function showInventoryPage(viewingPlayer, page = 0) {
        const target = world.getPlayer(targetId);
        if (!target) {
            viewingPlayer.sendMessage(`§cPlayer "${targetName}" is no longer online.`);
            return;
        }

        const inventory = target.getComponent('inventory').container;
        const items = [];
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item) {
                items.push(`§eSlot ${i}: §f${item.typeId.replace('minecraft:', '')} §7x${item.amount}`);
            }
        }

        if (items.length === 0) {
            new MessageFormData()
                .title(`Inventory: ${target.name}`)
                .body('§7(Inventory is empty)')
                .button1('§cClose')
                .show(viewingPlayer).catch(e => console.error(`[InvSeePanel] Empty inv form promise rejected: ${e.stack}`));
            return;
        }

        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
        const startIndex = page * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        const form = new MessageFormData()
            .title(`Inventory: ${target.name} (Page ${page + 1}/${totalPages})`)
            .body(pageItems.join('\n'))
            .button1('Close');

        if (page + 1 < totalPages) {
            form.button2('Next Page');
        }

        form.show(viewingPlayer).then(response => {
            if (response.canceled || response.selection === 0) return;
            if (response.selection === 1) {
                showInventoryPage(viewingPlayer, page + 1);
            }
        }).catch(e => console.error(`[InvSeePanel] form.show promise rejected: ${e.stack}`));
    }

    showInventoryPage(player, 0);
};
