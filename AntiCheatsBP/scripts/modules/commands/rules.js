import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'rules',
    aliases: ['rule'],
    description: 'Displays the server rules.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        showPanel(player, 'rulesPanel');
    }
});
