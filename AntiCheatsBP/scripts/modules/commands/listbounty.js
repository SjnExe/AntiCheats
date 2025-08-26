import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { world } from '@minecraft/server';

commandManager.register({
    name: 'listbounty',
    aliases: ['lbounty'],
    description: 'Lists the bounties on online players.',
    category: '§bPlayer Utilities',
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
            let message = '§a--- Online Player Bounties ---\n';
            const onlinePlayers = world.getAllPlayers();
            let foundBounty = false;
            onlinePlayers.forEach(p => {
                const pData = getPlayer(p.id);
                if (pData && pData.bounty > 0) {
                    message += '§e' + p.name + '§r: $' + pData.bounty.toFixed(2) + '\n';
                    foundBounty = true;
                }
            });
            if (!foundBounty) {
                message += '§7No active bounties.';
            }
            player.sendMessage(message);
        }
    }
});
