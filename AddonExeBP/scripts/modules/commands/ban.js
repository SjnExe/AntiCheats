import { commandManager } from './commandManager.js';
import { getPlayer, getPlayerIdByName } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';

function banPlayer(player, targetPlayer, duration, reason) {
    if (!targetPlayer) {
        player.sendMessage(`§cPlayer not found.`);
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

    const durationString = duration || 'perm';
    const durationMs = duration ? parseDuration(duration) : Infinity;

    const expires = durationMs === Infinity ? Infinity : Date.now() + durationMs;

    addPunishment(targetPlayer.id, {
        type: 'ban',
        expires,
        reason
    });

    const durationText = durationMs === Infinity ? 'permanently' : `for ${durationString}`;
    player.sendMessage(`§aSuccessfully banned ${targetPlayer.name} ${durationText}. Reason: ${reason}`);
    playSoundFromConfig(player, 'adminNotificationReceived');

    try {
        player.runCommand(`kick "${targetPlayer.name}" You have been banned ${durationText}. Reason: ${reason}`);
    } catch (error) {
        player.sendMessage(`§eWarning: Could not kick ${targetPlayer.name} after banning. They will be kicked on next join.`);
        console.error(`[/x:ban] Failed to run kick command for ${targetPlayer.name} after banning:`, error);
    }
}

commandManager.register({
    name: 'ban',
    description: 'Bans a player for a specified duration with a reason.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to ban.' },
        { name: 'duration', type: 'string', description: 'The duration of the ban (e.g., 1d, 2h, 30m). Default: perm', optional: true },
        { name: 'reason', type: 'string', description: 'The reason for the ban.', optional: true }
    ],
    execute: (player, args) => {
        if (Array.isArray(args)) { // Chat command
            if (args.length < 1) {
                player.sendMessage('§cUsage: !ban <player> [duration] [reason]');
                return;
            }
            const targetName = args[0];
            const targetPlayer = findPlayerByName(targetName);
            let duration;
            let reason;

            if (args.length > 1) {
                const parsedMs = parseDuration(args[1]);
                if (parsedMs > 0) {
                    duration = args[1];
                    reason = args.slice(2).join(' ') || 'No reason provided.';
                } else {
                    reason = args.slice(1).join(' ');
                }
            } else {
                reason = 'No reason provided.';
            }
            banPlayer(player, targetPlayer, duration, reason);
        } else { // Slash command
            const { target, duration, reason } = args;
            if (!target || target.length === 0) {
                player.sendMessage('§cPlayer not found.');
                return;
            }
            banPlayer(player, target[0], duration, reason || 'No reason provided.');
        }
    }
});

commandManager.register({
    name: 'unban',
    aliases: ['pardon'],
    description: 'Unbans a player.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to unban.' }
    ],
    execute: (player, args) => {
        let targetName;
        if (Array.isArray(args)) {
            if (args.length < 1) {
                player.sendMessage('§cUsage: !unban <player>');
                return;
            }
            targetName = args[0];
        } else {
            targetName = args.target;
        }

        const targetId = getPlayerIdByName(targetName);

        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" not found in the database. Make sure the name is correct (case-insensitive).`);
            return;
        }

        removePunishment(targetId);
        player.sendMessage(`§aSuccessfully unbanned ${targetName}. They can now rejoin the server.`);
        playSoundFromConfig(player, 'adminNotificationReceived');
    }
});
