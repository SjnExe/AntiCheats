import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'setbalance',
    aliases: ['setbal'],
    description: 'Sets a player\'s balance to a specific amount. (Owner only)',
    category: '§eEconomy & Kits',
    permissionLevel: 0, // Owner-only, will be checked manually
    execute: (player, args) => {
        const config = getConfig();
        // Owner check
        if (!config.ownerPlayerNames.includes(player.name)) {
            player.sendMessage('§cYou do not have permission to use this command.');
            return;
        }

        if (args.length < 2) {
            player.sendMessage('§cUsage: !setbalance <playerName> <amount>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        const amount = parseFloat(args[1]);
        if (isNaN(amount) || amount < 0) {
            player.sendMessage('§cInvalid amount. Please enter a non-negative number.');
            return;
        }

        const result = economyManager.setBalance(targetPlayer.id, amount);

        if (result) {
            player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s balance to §e$${amount.toFixed(2)}§a.`);
            targetPlayer.sendMessage(`§aYour balance has been set to §e$${amount.toFixed(2)}§a by an administrator.`);
        } else {
            player.sendMessage('§cFailed to set balance. Could not find player data.');
        }
    }
});
