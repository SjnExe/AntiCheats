import { customCommandManager } from './customCommandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getPlayer, savePlayerData } from '../../core/playerDataManager.js';

customCommandManager.register({
    name: 'removebounty',
    aliases: ['rbounty', 'delbounty'],
    description: 'Removes a bounty from a player using your money.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'amount', type: 'float', description: 'The amount to remove from the bounty.' },
        { name: 'target', type: 'player', description: 'The player to remove the bounty from. Defaults to yourself.', optional: true }
    ],
    execute: (player, args) => {
        const { target, amount } = args;
        let targetPlayer = player;

        if (target && target.length > 0) {
            targetPlayer = target[0];
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
