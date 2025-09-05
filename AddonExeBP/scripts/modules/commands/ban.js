import { system } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getPlayer, getPlayerIdByName } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { errorLog } from '../../core/errorLogger.js';

function banPlayer(player, targetPlayer, duration, reason) {
    // Console execution does not have a player object with an id
    if (player && player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot ban yourself.');
        return;
    }

    // Permission check for player execution
    if (player && !player.isConsole) {
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

    if (player && !player.isConsole) {
        playSoundFromConfig(player, 'adminNotificationReceived');
        try {
            // Player can run kick command
            player.runCommand(`kick "${targetPlayer.name}" You have been banned ${durationText}. Reason: ${reason}`);
        } catch (error) {
            player.sendMessage(`§eWarning: Could not kick ${targetPlayer.name} after banning. They will be kicked on next join.`);
            errorLog(`[/x:ban] Failed to run kick command for ${targetPlayer.name} after banning:`, error);
        }
    } else {
        // Console cannot use runCommand, but can use world.getDimension().runCommand()
        try {
            world.getDimension('overworld').runCommand(`kick "${targetPlayer.name}" You have been banned ${durationText}. Reason: ${reason}`);
        } catch (error) {
            // Log warning to console
            console.warn(`[Commands:Ban] Could not kick ${targetPlayer.name} after banning. They will be kicked on next join.`);
            errorLog(`[/x:ban] Failed to run kick command from console for ${targetPlayer.name} after banning:`, error);
        }
    }
}

commandManager.register({
    name: 'ban',
    description: 'Bans a player for a specified duration with a reason.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    allowConsole: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to ban.' },
        { name: 'duration', type: 'string', description: 'The duration of the ban (e.g., 1d, 2h, 30m). Default: perm', optional: true },
        { name: 'reason', type: 'text', description: 'The reason for the ban.', optional: true }
    ],
    execute: (player, args) => {
        // For slash commands (from player or console), target is a player object array.
        // For chat commands, it's a name string.
        const targetPlayer = Array.isArray(args.target) ? args.target[0] : findPlayerByName(args.target);

        if (!targetPlayer) {
            player.sendMessage('§cPlayer not found. If they are offline, use the /offlineban command.');
            return;
        }

        // Prevent console from banning itself (it has no ID)
        if (player.isConsole && !targetPlayer.id) {
            player.sendMessage('§cCannot target the console for a ban.');
            return;
        }

        let duration = args.duration;
        let reason = args.reason;

        // The command manager can't distinguish between an optional duration and the reason.
        // We need to check if the 'duration' argument is actually a duration or the start of the reason.
        if (duration && parseDuration(duration) === 0) {
            // It's not a valid duration, so it must be the start of the reason.
            reason = `${duration}${reason ? ' ' + reason : ''}`;
            duration = undefined; // Reset duration
        }

        banPlayer(player, targetPlayer, duration, reason || 'No reason provided.');
    }
});

commandManager.register({
    name: 'unban',
    aliases: ['pardon'],
    description: 'Unbans a player.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    allowConsole: true,
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
        if (!player.isConsole) {
            playSoundFromConfig(player, 'adminNotificationReceived');
        }
    }
});
