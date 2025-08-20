import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'panel',
    description: 'Gives you the panel item.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        try {
            player.runCommandAsync('give @s ac:panel');
            player.sendMessage('§aYou have been given the admin panel item.');
        } catch (e) {
            player.sendMessage('§cFailed to give the admin panel item.');
            console.error(`[PanelCommand] Failed to give panel item: ${e.stack}`);
        }
    },
});
