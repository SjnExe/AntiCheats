import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import * as economyManager from '../../core/economyManager.js';
import * as playerDataManager from '../../core/playerDataManager.js';
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

commandManager.register({
    name: 'baltop',
    aliases: ['topbal', 'leaderboard', 'richlist'],
    description: 'Shows the players with the highest balances on the server.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    allowConsole: true,
    parameters: [],
    execute: (player, args) => {
        const config = getConfig();
        if (!config.economy.enabled) {
            player.sendMessage('§cThe economy system is currently disabled.');
            return;
        }

        const allData = playerDataManager.getAllPlayerData();
        if (allData.size === 0) {
            player.sendMessage('§cNo player balances to show.');
            return;
        }

        const allPlayers = world.getAllPlayers();

        const leaderboard = [...allData.entries()]
            .map(([playerId, pData]) => ({
                name: allPlayers.find(p => p.id === playerId)?.name ?? 'Unknown',
                balance: pData.balance ?? 0
            }))
            .filter(p => p.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, config.economy.baltopLimit);

        if (leaderboard.length === 0) {
            player.sendMessage('§cAll players are broke and no one has money.');
            return;
        }

        let message = '§l§b--- Top Balances ---\n';
        leaderboard.forEach((entry, index) => {
            message += `§e#${index + 1}§r ${entry.name}: §a$${entry.balance.toFixed(2)}\n`;
        });

        player.sendMessage(message.trim());
    }
});
