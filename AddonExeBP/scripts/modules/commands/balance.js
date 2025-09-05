import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'balance',
    aliases: ['bal', 'money', 'cash'],
    description: 'Checks your or another player\'s balance.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to check the balance of.', optional: true }
    ],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        if (player.isConsole && (!args.target || args.target.length === 0)) {
            player.sendMessage('§cYou must specify a target player when running this command from the console.');
            return;
        }

        let targetPlayer = player;
        if (args.target && args.target.length > 0) {
            targetPlayer = args.target[0];
        }

        const balance = economyManager.getBalance(targetPlayer.id);

        if (balance === null) {
            player.sendMessage(`§cCould not retrieve balance for ${targetPlayer.name}.`);
            return;
        }

        if (targetPlayer.id === player.id) {
            player.sendMessage(`§aYour balance is: §e$${balance.toFixed(2)}`);
        } else {
            player.sendMessage(`§a${targetPlayer.name}'s balance is: §e$${balance.toFixed(2)}`);
        }
    }
});
