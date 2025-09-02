import { customCommandManager } from './customCommandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { getPlayer, savePlayerData } from '../../core/playerDataManager.js';
import { world } from '@minecraft/server';

customCommandManager.register({
    name: 'bounty',
    description: 'Place a bounty on a player.',
    aliases: ['setbounty'],
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to place a bounty on.' },
        { name: 'amount', type: 'int', description: 'The amount of the bounty.' }
    ],
    execute: (player, args) => {
        const { target, amount } = args;
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        const targetPlayer = target[0];

        if (isNaN(amount) || amount < config.economy.minimumBounty) {
            player.sendMessage(`§cInvalid amount. The minimum bounty is $${config.economy.minimumBounty}.`);
            return;
        }

        const sourceData = getPlayer(player.id);
        if (!sourceData) {
            player.sendMessage('§cCould not find your player data.');
            return;
        }

        if (economyManager.getBalance(player.id) < amount) {
            player.sendMessage('§cYou do not have enough money for this bounty.');
            return;
        }

        const targetData = getPlayer(targetPlayer.id);
        if (!targetData) {
            player.sendMessage('§cCould not find the target player\'s data.');
            return;
        }

        const result = economyManager.removeBalance(player.id, amount);

        if (result) {
            targetData.bounty += amount;
            if (!sourceData.bounties) {
                sourceData.bounties = {};
            }
            sourceData.bounties[targetPlayer.id] = (sourceData.bounties[targetPlayer.id] || 0) + amount;
            savePlayerData(player.id);
            savePlayerData(targetPlayer.id);
            player.sendMessage('§aYou have placed a bounty of §e$' + amount + '§a on ' + targetPlayer.name + '.');
            world.sendMessage('§cSomeone has placed a bounty of §e$' + amount + '§c on ' + targetPlayer.name + '!');
        } else {
            player.sendMessage('§cFailed to place bounty.');
        }
    }
});
