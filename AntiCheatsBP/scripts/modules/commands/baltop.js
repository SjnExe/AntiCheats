import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import * as playerDataManager from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

commandManager.register({
    name: 'baltop',
    aliases: ['topbal'],
    description: 'Shows the players with the highest balances on the server.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
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
                balance: pData.balance ?? 0,
            }))
            .filter(p => p.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, config.economy.baltopLimit);

        if (leaderboard.length === 0) {
            player.sendMessage('§cAll players are broke and no one has money.');
            return;
        }

        let message = '§l§b--- Top Balances ---§r\n';
        leaderboard.forEach((entry, index) => {
            message += `§e#${index + 1}§r ${entry.name}: §a$${entry.balance.toFixed(2)}\n`;
        });

        player.sendMessage(message.trim());
    },
});
