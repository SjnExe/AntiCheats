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

        const leaderboard = [...allData.values()]
            .map(pData => ({
                name: pData.name,
                balance: pData.balance,
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, config.economy.baltopLimit);

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
