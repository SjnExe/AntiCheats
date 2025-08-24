import { commandManager } from './commandManager.js';
import { ItemStack } from '@minecraft/server';
import * as playerDataManager from '../../core/playerDataManager.js';

commandManager.register({
    name: 'panel',
    aliases: ['ui'],
    description: 'Gives you the panel item or shows you how to craft it.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const pData = playerDataManager.getPlayer(player.id);
        if (!pData) {
            player.sendMessage('§cCould not retrieve your player data.');
            return;
        }

        // Permission level 1 or lower (e.g., 0 for Owner) are considered admins
        if (pData.permissionLevel <= 1) {
            try {
                const inventory = player.getComponent('inventory');
                if (!inventory) {
                    player.sendMessage('§cCould not get your inventory.');
                    return;
                }

                const panelItem = new ItemStack('ac:panel', 1);
                inventory.container.addItem(panelItem);

                player.sendMessage('§aYou have been given the panel item.');
            } catch (e) {
                player.sendMessage(`§cFailed to give the panel item. Please report this to an admin. Error: ${e.stack}`);
                console.error(`[PanelCommand] Failed to give panel item: ${e.stack}`);
            }
        } else {
            player.sendMessage('§eYou can obtain the panel by crafting it with a single stick in the crafting menu.');
        }
    }
});
