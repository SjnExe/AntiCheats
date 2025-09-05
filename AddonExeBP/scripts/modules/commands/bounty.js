import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import { getPlayer, incrementPlayerBounty, addPlayerBountyContribution, getAllPlayerNameIdMap, loadPlayerData } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';
import { world } from '@minecraft/server';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'removebounty',
    aliases: ['rbounty', 'delbounty', '-bounty'],
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

        if (economyManager.getBalance(player.id) < amount) {
            player.sendMessage('§cYou dont have enough money for this!');
            return;
        }

        const result = economyManager.removeBalance(player.id, amount);
        if (result) {
            incrementPlayerBounty(targetPlayer.id, -amount);
            player.sendMessage('§aYou have removed $' + amount.toFixed(2) + ' from ' + targetPlayer.name + "'s bounty.");
        } else {
            player.sendMessage('§cFailed to remove bounty.');
        }
    }
});

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

commandManager.register({
    name: 'listbounty',
    aliases: ['lbounty', 'bounties', 'bountylist', 'showbounties', 'hitlist'],
    description: 'Lists all active bounties or a specific player\'s bounty.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    allowConsole: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to check the bounty of.', optional: true }
    ],
    execute: (player, args) => {
        if (args.target && args.target.length > 0) {
            const targetPlayer = args.target[0];
            const targetData = getPlayer(targetPlayer.id);
            if (!targetData) {
                player.sendMessage('§cCould not find player data.');
                return;
            }
            player.sendMessage('§aBounty on ' + targetPlayer.name + ': §e$' + targetData.bounty.toFixed(2));
        } else {
            let message = '§a--- All Player Bounties ---\n';
            const playerNameIdMap = getAllPlayerNameIdMap();
            const bounties = [];

            for (const [_, playerId] of playerNameIdMap.entries()) {
                const pData = getPlayer(playerId) ?? loadPlayerData(playerId);
                if (pData && pData.bounty > 0) {
                    bounties.push({ name: pData.name, bounty: pData.bounty });
                }
            }

            if (bounties.length === 0) {
                message += '§7No active bounties.';
            } else {
                bounties.sort((a, b) => b.bounty - a.bounty);
                for (const bounty of bounties) {
                    message += `§e${bounty.name}§r: $${bounty.bounty.toFixed(2)}\n`;
                }
            }
            player.sendMessage(message.trim());
        }
    }
});
