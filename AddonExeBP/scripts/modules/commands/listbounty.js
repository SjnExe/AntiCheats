import { customCommandManager } from './customCommandManager.js';
import { getPlayer, getAllPlayerNameIdMap, loadPlayerData } from '../../core/playerDataManager.js';
import { getPlayerFromCache } from '../../core/playerCache.js';

customCommandManager.register({
    name: 'listbounty',
    aliases: ['lbounty', 'bounties', 'bountylist'],
    description: 'Lists all active bounties or a specific player\'s bounty.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
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

            for (const [playerName, playerId] of playerNameIdMap.entries()) {
                const pData = getPlayer(playerId) ?? loadPlayerData(playerId);
                if (pData && pData.bounty > 0) {
                    const onlinePlayer = getPlayerFromCache(playerId);
                    const displayName = onlinePlayer ? onlinePlayer.name : playerName;
                    bounties.push({ name: displayName, bounty: pData.bounty });
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
