import { commandManager } from './commandManager.js';
import { showPanel } from '../../core/uiManager.js';

commandManager.register({
    name: 'reports',
    description: 'Views the list of active reports.',
    category: '§cModeration',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        showPanel(player, 'reportListPanel');
    }
});
