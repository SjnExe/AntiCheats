import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'panel',
    aliases: ['ui', 'gui'],
    description: 'Opens the main UI panel.',
    category: '§aGeneral',
    permissionLevel: 1024, // Everyone can access the panel
    execute: (player, args) => {
        // The command now directly opens the panel for the player.
        showPanel(player, 'mainPanel');
    }
});
