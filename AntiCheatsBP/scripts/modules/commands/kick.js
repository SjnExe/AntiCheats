import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

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

        try {
            // Use world.runCommandAsync to ensure the command has permissions.
            await world.runCommandAsync(`kick "${targetPlayer.name}" ${reason}`);
            // The kick command has its own public message, so we don't need to send one.
            // We can send a confirmation to the admin who ran it.
            player.sendMessage(`§aSuccessfully kicked ${targetPlayer.name}.`);
        } catch (error) {
            player.sendMessage(`§cFailed to kick ${targetPlayer.name}.`);
            console.error(`[!kick] ${error.stack}`);
        }
    }
});
