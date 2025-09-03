import { customCommandManager } from './customCommandManager.js';
import { getPlayer, getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSound } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';

function mutePlayer(player, targetPlayer, duration, reason) {
    if (!targetPlayer) {
        player.sendMessage(`§cPlayer not found.`);
        playSound(player, 'note.bass');
        return;
    }
    if (player.id === targetPlayer.id) {
        player.sendMessage('§cYou cannot mute yourself.');
        playSound(player, 'note.bass');
        return;
    }
    const executorData = getPlayer(player.id);
    const targetData = getPlayer(targetPlayer.id);
    if (!executorData || !targetData) {
        player.sendMessage('§cCould not retrieve player data for permission check.');
        playSound(player, 'note.bass');
        return;
    }
    if (executorData.permissionLevel >= targetData.permissionLevel) {
        player.sendMessage('§cYou cannot mute a player with the same or higher rank than you.');
        playSound(player, 'note.bass');
        return;
    }
    const durationString = duration || 'perm';
    const durationMs = duration ? parseDuration(duration) : Infinity;
    const expires = durationMs === Infinity ? Infinity : Date.now() + durationMs;
    addPunishment(targetPlayer.id, {
        type: 'mute',
        expires,
        reason
    });
    const durationText = durationMs === Infinity ? 'permanently' : `for ${durationString}`;
    player.sendMessage(`§aSuccessfully muted ${targetPlayer.name} ${durationText}. Reason: ${reason}`);
    targetPlayer.sendMessage(`§cYou have been muted ${durationText}. Reason: ${reason}`);
    playSound(player, 'random.orb');
}

customCommandManager.register({
    name: 'mute',
    description: 'Mutes a player for a specified duration with a reason.',
    aliases: ['silence'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to mute.' },
        { name: 'duration', type: 'string', description: 'The duration of the mute (e.g., 1d, 2h, 30m). Default: perm', optional: true },
        { name: 'reason', type: 'string', description: 'The reason for the mute.', optional: true }
    ],
    execute: (player, args) => {
        if (Array.isArray(args)) { // Chat command
            if (args.length < 1) {
                player.sendMessage('§cUsage: !mute <player> [duration] [reason]');
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
            mutePlayer(player, targetPlayer, duration, reason);
        } else { // Slash command
            const { target, duration, reason } = args;
            if (!target || target.length === 0) {
                player.sendMessage('§cPlayer not found.');
                return;
            }
            mutePlayer(player, target[0], duration, reason || 'No reason provided.');
        }
    }
});

customCommandManager.register({
    name: 'unmute',
    description: 'Unmutes a player.',
    aliases: ['um'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to unmute.' }
    ],
    execute: (player, args) => {
        let targetName;
        if (Array.isArray(args)) {
            if (args.length < 1) {
                player.sendMessage('§cUsage: !unmute <player>');
                return;
            }
            targetName = args[0];
        } else {
            targetName = args.target;
        }
        const targetId = getPlayerIdByName(targetName);
        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" has never joined the server or name is misspelled.`);
            return;
        }
        if (targetId === player.id) {
            player.sendMessage('§cYou cannot unmute yourself.');
            return;
        }
        const executorData = getPlayer(player.id);
        const targetData = loadPlayerData(targetId);
        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            return;
        }
        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot unmute a player with the same or higher rank than you.');
            return;
        }
        removePunishment(targetId);
        player.sendMessage(`§aSuccessfully unmuted ${targetName}.`);
        playSound(player, 'random.orb');
    }
});
