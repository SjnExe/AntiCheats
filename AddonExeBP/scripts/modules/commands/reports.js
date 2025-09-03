import { customCommandManager } from './customCommandManager.js';
import { showPanel } from '../../core/uiManager.js';

customCommandManager.register({
    name: 'reports',
    description: 'Views the list of active reports.',
    category: 'Moderation',
    permissionLevel: 1, // Admin and above
    parameters: [],
    execute: (player, args) => {
        showPanel(player, 'reportListPanel');
    }
});
