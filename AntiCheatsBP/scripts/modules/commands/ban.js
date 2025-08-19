import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { addBan, removeBan } from '../../core/banManager.js';

// Ban command
commandManager.register({
    name: 'ban',
    description: 'Bans a player from the server.',
    permissionLevel: 1, // Admins only
    execute: async (player, args) => {
        if (args.length < 1) {
            player.sendMessage("§cUsage: !ban <player> [reason]");
            return;
        }

        const targetName = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';

        // Find player (they must be online to get the player object for the ban manager)
        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found. You can only ban online players.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage("§cYou cannot ban yourself.");
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage("§cCould not retrieve player data for permission check.");
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage("§cYou cannot ban a player with the same or higher rank than you.");
            return;
        }

        try {
            addBan(targetPlayer, { reason: reason, bannedBy: player.name });
            player.sendMessage(`§aSuccessfully banned ${targetPlayer.name}.`);
            // Kick the player after banning them
            await world.runCommandAsync(`kick "${targetPlayer.name}" ${reason}`);
        } catch (error) {
            player.sendMessage(`§cFailed to ban ${targetPlayer.name}.`);
            console.error(`[!ban] ${error.stack}`);
        }
    }
});

// Unban command
commandManager.register({
    name: 'unban',
    description: 'Unbans a player, allowing them to rejoin.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage("§cUsage: !unban <player>");
            return;
        }

        const targetName = args[0];

        if (removeBan(targetName)) {
            player.sendMessage(`§aSuccessfully unbanned ${targetName}. They can now rejoin the server.`);
        } else {
            player.sendMessage(`§cPlayer "${targetName}" was not found in the ban list.`);
        }
    }
});
