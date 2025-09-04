import { commandManager } from './commandManager.js';
import { getPlayer, getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';

function banPlayer(player, targetId, targetName, duration, reason) {
    if (player.id === targetId) {
        player.sendMessage('§cYou cannot ban yourself.');
        return;
    }

    const executorData = getPlayer(player.id);
    // Load offline player data for permission check
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

    // Try to kick the player if they are online. This will fail silently if they are not.
    try {
        player.runCommand(`kick "${targetName}" You have been banned ${durationText}. Reason: ${reason}`);
    } catch {
        // Player is likely offline, which is fine. No need to log this as an error.
    }
}

commandManager.register({
    name: 'ban',
    description: 'Bans a player, even if they are offline.',
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

        // Load data to get the correctly-cased name
        const targetData = loadPlayerData(targetId);
        const correctTargetName = targetData ? targetData.name : targetName;

        let duration = args.duration;
        let reason = args.reason;

        // Handle case where duration is omitted and reason is provided
        if (duration && parseDuration(duration) === 0) {
            reason = `${duration}${reason ? ' ' + reason : ''}`;
            duration = undefined;
        }

        banPlayer(player, targetId, correctTargetName, duration, reason || 'No reason provided.');
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
        const targetName = args.target;
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
