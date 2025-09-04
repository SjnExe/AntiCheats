import { commandManager } from './commandManager.js';
import { getPlayer, getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { addPunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';

function offlineBanPlayer(player, targetId, targetName, duration, reason) {
    if (player.id === targetId) {
        player.sendMessage('§cYou cannot ban yourself.');
        return;
    }

    const executorData = getPlayer(player.id);
    const targetData = loadPlayerData(targetId);

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

    addPunishment(targetId, {
        type: 'ban',
        expires,
        reason
    });

    const durationText = durationMs === Infinity ? 'permanently' : `for ${durationString}`;
    player.sendMessage(`§aSuccessfully banned ${targetName} ${durationText}. Reason: ${reason}`);
    playSoundFromConfig(player, 'adminNotificationReceived');

    try {
        player.runCommand(`kick "${targetName}" You have been banned ${durationText}. Reason: ${reason}`);
    } catch {
        // Player is likely offline, which is fine.
    }
}

commandManager.register({
    name: 'offlineban',
    aliases: ['oban'],
    description: 'Bans a player who is currently offline.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to ban.' },
        { name: 'duration', type: 'string', description: 'The duration of the ban (e.g., 1d, 2h, 30m). Default: perm', optional: true },
        { name: 'reason', type: 'text', description: 'The reason for the ban.', optional: true }
    ],
    execute: (player, args) => {
        const { target: targetName } = args;

        const targetId = getPlayerIdByName(targetName);
        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" has never joined this server.`);
            return;
        }

        const targetData = loadPlayerData(targetId);
        const correctTargetName = targetData ? targetData.name : targetName;

        let duration = args.duration;
        let reason = args.reason;

        if (duration && parseDuration(duration) === 0) {
            reason = `${duration}${reason ? ' ' + reason : ''}`;
            duration = undefined;
        }

        offlineBanPlayer(player, targetId, correctTargetName, duration, reason || 'No reason provided.');
    }
});
