import { customCommandManager } from './customCommandManager.js';
import { getPlayer, getPlayerIdByName } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';

customCommandManager.register({
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
        const { target, duration, reason: reasonArg } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found. You can only ban online players.');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        const targetPlayer = target[0];

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot ban yourself.');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot ban a player with the same or higher rank than you.');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        let durationString = 'perm';
        let reason;
        let durationMs = Infinity;

        if (duration) {
            const parsedMs = parseDuration(duration);
            if (parsedMs > 0) {
                durationString = duration;
                durationMs = parsedMs;
                reason = reasonArg || 'No reason provided.';
            } else {
                // Invalid duration format, treat it as part of the reason
                reason = reasonArg ? `${duration} ${reasonArg}` : duration;
            }
        } else {
            reason = reasonArg || 'No reason provided.';
        }

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
            console.error(`[/exe:ban] Failed to run kick command for ${targetPlayer.name} after banning:`, error);
        }
    }
});

customCommandManager.register({
    name: 'unban',
    aliases: ['pardon'],
    description: 'Unbans a player.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to unban.' }
    ],
    execute: (player, args) => {
        const { target: targetName } = args;

        const targetId = getPlayerIdByName(targetName);

        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" not found in the database. Make sure the name is correct (case-insensitive).`);
            playSoundFromConfig(player, 'commandError');
            return;
        }

        removePunishment(targetId);
        player.sendMessage(`§aSuccessfully unbanned ${targetName}. They can now rejoin the server.`);
        playSoundFromConfig(player, 'adminNotificationReceived');
    }
});
