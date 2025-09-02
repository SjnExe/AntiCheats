import { customCommandManager } from './customCommandManager.js';
import { getPlayer, getPlayerIdByName, loadPlayerData } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSound } from '../../core/utils.js';
import { findPlayerByName } from '../utils/playerUtils.js';

customCommandManager.register({
    name: 'mute',
    description: 'Mutes a player for a specified duration with a reason.',
    aliases: ['silence'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !mute <player> [duration] [reason]');
            playSound(player, 'note.bass');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
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

        let durationString = 'perm';
        let reason;
        let durationMs = Infinity;

        if (args.length > 1) {
            const parsedMs = parseDuration(args[1]);
            if (parsedMs > 0) {
                durationString = args[1];
                durationMs = parsedMs;
                reason = args.slice(2).join(' ') || 'No reason provided.';
            } else {
                reason = args.slice(1).join(' ');
            }
        } else {
            reason = 'No reason provided.';
        }

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
});

customCommandManager.register({
    name: 'unmute',
    description: 'Unmutes a player.',
    aliases: ['um'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !unmute <player>');
            playSound(player, 'note.bass');
            return;
        }

        const targetName = args[0];
        const targetId = getPlayerIdByName(targetName);

        if (!targetId) {
            player.sendMessage(`§cPlayer "${targetName}" has never joined the server or name is misspelled.`);
            playSound(player, 'note.bass');
            return;
        }

        if (targetId === player.id) {
            player.sendMessage('§cYou cannot unmute yourself.');
            playSound(player, 'note.bass');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = loadPlayerData(targetId);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            playSound(player, 'note.bass');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot unmute a player with the same or higher rank than you.');
            playSound(player, 'note.bass');
            return;
        }

        removePunishment(targetId);
        player.sendMessage(`§aSuccessfully unmuted ${targetName}.`);
        playSound(player, 'random.orb');
    }
});
