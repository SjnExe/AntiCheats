import { customCommandManager } from './customCommandManager.js';
import { getConfig } from '../../core/configManager.js';

customCommandManager.register({
    name: 'version',
    aliases: ['ver'],
    description: 'Displays the current version of the addon.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [],
    execute: (player, args) => {
        const config = getConfig();
        player.sendMessage(`§7AddonExe Version: §e${config.version}`);
    }
});
