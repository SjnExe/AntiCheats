import { commandManager } from './commandManager.js';
import { getPlayer, getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSound } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';

function mutePlayer(player, targetPlayer, duration, reason) {
    if (!targetPlayer) {
        player.sendMessage('§cPlayer not found.');
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

commandManager.register({
    name: 'mute',
    description: 'Mutes a player for a specified duration with a reason.',
    aliases: ['silence'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to mute.' },
        { name: 'duration', type: 'string', description: 'The duration of the mute (e.g., 1d, 2h, 30m). Default: perm', optional: true },
        { name: 'reason', type: 'text', description: 'The reason for the mute.', optional: true }
    ],
    execute: (player, args) => {
        const { duration, reason } = args;

        // Check if the optional 'duration' argument was provided, but is not a valid duration string.
        // This indicates the user tried to type a multi-word reason without quotes in a slash command.
        if (duration && parseDuration(duration) === 0) {
            player.sendMessage('§cInvalid duration format. If you are providing a multi-word reason, please enclose it in "quotes".');
            return;
        }

        const targetPlayer = Array.isArray(args.target) ? args.target[0] : findPlayerByName(args.target);

        mutePlayer(player, targetPlayer, duration, reason || 'No reason provided.');
    }
});

commandManager.register({
    name: 'unmute',
    description: 'Unmutes a player.',
    aliases: ['um'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'string', description: 'The name of the player to unmute.' }
    ],
    execute: (player, args) => {
        const { target: targetName } = args;
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
