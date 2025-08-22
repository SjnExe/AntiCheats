import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration } from '../../core/utils.js';

commandManager.register({
    name: 'ban',
    description: 'Bans a player for a specified duration with a reason.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !ban <player> [duration] [reason]');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found. You can only ban online players.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot ban yourself.');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot ban a player with the same or higher rank than you.');
            return;
        }

        const durationString = args[1] || 'perm';
        const reason = args.slice(2).join(' ') || 'No reason provided';

        let durationMs = Infinity;
        if (durationString.toLowerCase() !== 'perm') {
            durationMs = parseDuration(durationString);
            if (durationMs === 0) {
                player.sendMessage(`§cInvalid duration format. Use 'perm' or a format like 10m, 2h, 7d.`);
                return;
            }
        }

        const expires = durationMs === Infinity ? Infinity : Date.now() + durationMs;

        addPunishment(targetPlayer.id, {
            type: 'ban',
            expires,
            reason
        });

        const durationText = durationMs === Infinity ? 'permanently' : `for ${durationString}`;
        player.sendMessage(`§aSuccessfully banned ${targetPlayer.name} ${durationText}. Reason: ${reason}`);

        // Kick the player after banning them
        targetPlayer.runCommandAsync(`kick "${targetPlayer.name}" You have been banned ${durationText}. Reason: ${reason}`);
    },
});

commandManager.register({
    name: 'unban',
    description: 'Unbans a player.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !unban <player>');
            return;
        }

        const targetName = args[0];
        // For unbanning, we need to handle offline players.
        // This simplified version assumes the player is online.
        // A more robust solution would require a way to get a player's ID from their name, even if offline.
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found or is offline.`);
            return;
        }

        removePunishment(targetPlayer.id);
        player.sendMessage(`§aSuccessfully unbanned ${targetPlayer.name}. They can now rejoin the server.`);
    },
});
