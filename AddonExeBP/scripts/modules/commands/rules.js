import { commandManager } from './commandManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'rules',
    aliases: ['rule'],
    description: 'Displays the server rules.',
    category: 'General',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'ruleNumber', type: 'int', description: 'The specific rule number to display.', optional: true }
    ],
    execute: (player, args) => {
        const config = getConfig();
        const rules = config.serverInfo.rules;

        if (!rules || rules.length === 0) {
            player.sendMessage('§cThe server rules have not been configured by the admin.');
            return;
        }

        if (args.ruleNumber) {
            const ruleNumber = args.ruleNumber;
            if (isNaN(ruleNumber) || ruleNumber < 1 || ruleNumber > rules.length) {
                player.sendMessage('§cInvalid rule number. Use /rules to see all rules.');
                return;
            }
            player.sendMessage('§l§a--- Server Rules ---');
            player.sendMessage(rules[ruleNumber - 1]);
            player.sendMessage('§l§a------------------');
        } else {
            player.sendMessage('§l§a--- Server Rules ---');
            for (const rule of rules) {
                player.sendMessage(rule);
            }
            player.sendMessage('§l§a------------------');
        }
    }
});
