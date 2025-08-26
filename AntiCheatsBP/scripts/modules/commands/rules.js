import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'rules',
    aliases: ['rule'],
    description: 'Displays the server rules.',
    category: '§aGeneral',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        const rules = config.serverInfo.rules;

        if (!rules || rules.length === 0) {
            player.sendMessage('§cThe server rules have not been configured by the admin.');
            return;
        }

        player.sendMessage('§l§a--- Server Rules ---');
        for (const rule of rules) {
            player.sendMessage(`§e- ${rule}`);
        }
        player.sendMessage('§l§a------------------');
    }
});
