import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'panel',
    description: 'Opens the admin control panel.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        // Show the main admin panel by default
        showPanel(player, 'mainAdminPanel');
    }
});
