import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'rules',
    aliases: ['rule'],
    description: 'Displays the server rules.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        const rules = config.serverInfo.rules;

        if (!rules || rules.length === 0) {
            player.sendMessage('§cThe server rules have not been configured by the admin.');
            return;
        }

        if (args.length > 0) {
            const ruleNumber = parseInt(args[0], 10);
            if (isNaN(ruleNumber) || ruleNumber < 1 || ruleNumber > rules.length) {
                player.sendMessage('§cInvalid rule number. Use !rules to see all rules.');
                return;
            }
            player.sendMessage(`§l§a--- Rule ${ruleNumber} ---`);
            player.sendMessage(`§e- ${rules[ruleNumber - 1]}`);
            player.sendMessage('§l§a------------------');
        } else {
            player.sendMessage('§l§a--- Server Rules ---');
            rules.forEach((rule, index) => {
                player.sendMessage(`§e${index + 1}: ${rule}`);
            });
            player.sendMessage('§l§a------------------');
        }
    }
});
