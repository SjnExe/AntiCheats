import { commandManager } from './commandManager.js';
import { getPlayer, getAllPlayerNameIdMap, loadPlayerData } from '../../core/playerDataManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayerFromCache } from '../../core/playerCache.js';

commandManager.register({
    name: 'listbounty',
    aliases: ['lbounty', 'bounties', 'bountylist'],
    description: 'Lists all active bounties.',
    category: 'Economy',
    permissionLevel: 1024, // Everyone
    execute: (player, args) => {
        if (args.length > 0) {
            const targetPlayer = findPlayerByName(args[0]);
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
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
