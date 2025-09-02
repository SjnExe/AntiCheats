import { customCommandManager } from './customCommandManager.js';
import { getPlayer, getPlayerIdByName } from '../../core/playerDataManager.js';
import { addPunishment, removePunishment } from '../../core/punishmentManager.js';
import { parseDuration, playSoundFromConfig } from '../../core/utils.js';

customCommandManager.register({
    name: 'ban',
    description: 'Bans a player for a specified duration with a reason.',
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !ban <player> [duration] [reason]');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        const targetName = args[0];
        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found. You can only ban online players.`);
            playSoundFromConfig(player, 'commandError');
            return;
        }

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
    disableSlashCommand: true,
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !unban <player>');
            playSoundFromConfig(player, 'commandError');
            return;
        }

        const targetName = args[0];

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
