import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'kick',
    description: 'Kicks a player from the server.',
    permissionLevel: 1, // Admins only
    execute: async (player, args) => {
        if (args.length < 1) {
            player.sendMessage("§cUsage: !kick <player> [reason]");
            return;
        }

        const targetName = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';

        const targetPlayer = findPlayerByName(targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage("§cYou cannot kick yourself.");
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage("§cCould not retrieve player data for permission check.");
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage("§cYou cannot kick a player with the same or higher rank than you.");
            return;
        }

        try {
            await world.runCommandAsync(`kick "${targetPlayer.name}" ${reason}`);
            player.sendMessage(`§aSuccessfully kicked ${targetPlayer.name}.`);
        } catch (error) {
            player.sendMessage(`§cFailed to kick ${targetPlayer.name}.`);
            console.error(`[!kick] ${error.stack}`);
        }
    }
});
