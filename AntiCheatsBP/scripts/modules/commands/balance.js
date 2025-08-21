import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'balance',
    aliases: ['bal', 'money'],
    description: 'Checks your or another player\'s balance.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        let targetPlayer = player;
        if (args.length > 0) {
            const foundPlayer = findPlayerByName(args[0]);
            if (!foundPlayer) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
            targetPlayer = foundPlayer;
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
    },
});
