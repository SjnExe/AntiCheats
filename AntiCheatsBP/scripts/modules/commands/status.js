import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'status',
    aliases: ['stats'],
    description: 'Displays the server status.',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        showPanel(player, 'statusPanel');
    },
});
