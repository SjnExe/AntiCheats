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

        // NOTE: This currently only works for online players due to the design of playerDataManager.
        // For a true global baltop, a persistent data storage solution would be needed.
        const allData = playerDataManager.getAllPlayerData();
        const onlinePlayers = new Map();
        for (const p of world.getAllPlayers()) {
            onlinePlayers.set(p.id, p.name);
        }

        const leaderboard = [...allData.entries()]
            .filter(([id, data]) => onlinePlayers.has(id)) // Ensure player is online to get their name
            .map(([id, data]) => ({
                name: onlinePlayers.get(id),
                balance: data.balance,
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10); // Show top 10

        if (leaderboard.length === 0) {
            player.sendMessage('§cNo player balances to show.');
            return;
        }

        let message = '§l§b--- Top Balances ---§r\n';
        leaderboard.forEach((entry, index) => {
            message += `§e#${index + 1}§r ${entry.name}: §a$${entry.balance.toFixed(2)}\n`;
        });

        player.sendMessage(message.trim());
    },
});
