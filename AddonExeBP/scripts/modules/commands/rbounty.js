import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getPlayer, savePlayerData } from '../../core/playerDataManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'removebounty',
    aliases: ['rbounty', 'delbounty'],
    description: 'Removes a bounty from a player using your money.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        let targetPlayer;
        let amount;

        if (args.length === 1) {
            targetPlayer = player;
            amount = parseFloat(args[0]);
        } else if (args.length === 2) {
            targetPlayer = findPlayerByName(args[0]);
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
            amount = parseFloat(args[1]);
        } else {
            player.sendMessage('§cUsage: !rbounty [playerName] <amount>');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            player.sendMessage('§cInvalid amount. Please enter a positive number.');
            return;
        }

        const targetData = getPlayer(targetPlayer.id);
        if (!targetData) {
            player.sendMessage('§cCould not find player data.');
            return;
        }

        if (targetData.bounty === 0) {
            player.sendMessage('§cThis player has no bounty on them.');
            return;
        }

        if (amount > targetData.bounty) {
            player.sendMessage('§cYou cannot remove more than the bounty amount ($' + targetData.bounty.toFixed(2) + ').');
            return;
        }

        if (economyManager.getBalance(player.id) < amount){
            player.sendMessage('§cYou dont have enough money for this!');
            return;
        }

        const result = economyManager.removeBalance(player.id, amount);
        if (result) {
            targetData.bounty -= amount;
            savePlayerData(player.id);
            savePlayerData(targetPlayer.id);
            player.sendMessage('§aYou have removed $' + amount.toFixed(2) + ' from ' + targetPlayer.name + "'s bounty.");
        } else {
            player.sendMessage('§cFailed to remove bounty.');
        }
    }
});
