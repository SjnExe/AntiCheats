import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer, savePlayerData } from '../../core/playerDataManager.js';
import { world } from '@minecraft/server';

commandManager.register({
    name: 'bounty',
    description: 'Place a bounty on a player.',
    aliases: ['setbounty'],
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        if (args.length < 2) {
            player.sendMessage('§cUsage: !bounty <playerName> <amount>');
            return;
        }

        const targetPlayer = findPlayerByName(args[0]);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer '${args[0]}' not found.`);
            return;
        }

        const amount = parseInt(args[1]);
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
