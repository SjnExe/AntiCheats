import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';

// Mute command
commandManager.register({
    name: 'mute',
    description: 'Mutes a player, preventing them from sending chat messages.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !mute <player>');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot mute yourself.');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot mute a player with the same or higher rank than you.');
            return;
        }

        try {
            targetPlayer.addTag('muted');
            player.sendMessage(`§aSuccessfully muted ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§cYou have been muted.');
        } catch (error) {
            player.sendMessage(`§cFailed to mute ${targetPlayer.name}.`);
            console.error(`[!mute] ${error.stack}`);
        }
    },
});

// Unmute command
commandManager.register({
    name: 'unmute',
    description: 'Unmutes a player, allowing them to send chat messages.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !unmute <player>');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        try {
            targetPlayer.removeTag('muted');
            player.sendMessage(`§aSuccessfully unmuted ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§aYou have been unmuted.');
        } catch (error) {
            player.sendMessage(`§cFailed to unmute ${targetPlayer.name}.`);
            console.error(`[!unmute] ${error.stack}`);
        }
    },
});
