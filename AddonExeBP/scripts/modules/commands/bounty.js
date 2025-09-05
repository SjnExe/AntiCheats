import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getConfig } from '../../core/configManager.js';
import { getPlayer, incrementPlayerBounty, addPlayerBountyContribution } from '../../core/playerDataManager.js';
import { world } from '@minecraft/server';
import { findPlayerByName } from '../utils/playerUtils.js';

function placeBounty(player, targetPlayer, amount) {
    const config = getConfig();
    if (!config.economy.enabled) {
        player.sendMessage('§cThe economy system is currently disabled.');
        return;
    }
    if (!targetPlayer) {
        player.sendMessage('§cPlayer not found.');
        return;
    }
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
        incrementPlayerBounty(targetPlayer.id, amount);
        addPlayerBountyContribution(player.id, targetPlayer.id, amount);

        player.sendMessage('§aYou have placed a bounty of §e$' + amount + '§a on ' + targetPlayer.name + '.');
        world.sendMessage('§cSomeone has placed a bounty of §e$' + amount + '§c on ' + targetPlayer.name + '!');
    } else {
        player.sendMessage('§cFailed to place bounty.');
    }
}

commandManager.register({
    name: 'bounty',
    description: 'Place a bounty on a player.',
    aliases: ['setbounty', 'addbounty', '+bounty', 'abounty'],
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    parameters: [
        { name: 'target', type: 'player', description: 'The player to place a bounty on.' },
        { name: 'amount', type: 'int', description: 'The amount of the bounty.' }
    ],
    execute: (player, args) => {
        if (Array.isArray(args)) { // Chat command
            if (args.length < 2) {
                player.sendMessage('§cUsage: !bounty <playerName> <amount>');
                return;
            }
            const targetPlayer = findPlayerByName(args[0]);
            const amount = parseInt(args[1]);
            placeBounty(player, targetPlayer, amount);
        } else { // Slash command
            const { target, amount } = args;
            if (!target || target.length === 0) {
                player.sendMessage('§cPlayer not found.');
                return;
            }
            placeBounty(player, target[0], amount);
        }
    }
});
