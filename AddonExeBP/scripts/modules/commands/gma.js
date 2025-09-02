import { commandManager } from './commandManager.js';
import { GameMode } from '@minecraft/server';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'gma',
    aliases: ['a', 'adventure'],
    description: 'Sets your or another player\'s gamemode to Adventure.',
    category: 'General',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        let targetPlayer = player;
        if (args.length > 0) {
            const foundPlayer = findPlayerByName(args[0]);
            if (!foundPlayer) {
                player.sendMessage(`§cPlayer "${args[0]}" not found.`);
                return;
            }
            targetPlayer = foundPlayer;

            // Permission check
            const executorData = getPlayer(player.id);
            const targetData = getPlayer(targetPlayer.id);
            if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel && player.id !== targetPlayer.id) {
                player.sendMessage('§cYou cannot change the gamemode of a player with the same or higher rank.');
                return;
            }
        }

        try {
            targetPlayer.setGameMode(GameMode.Adventure);
            if (player.id === targetPlayer.id) {
                player.sendMessage('§aYour gamemode has been set to Adventure.');
            } else {
                player.sendMessage(`§aSet ${targetPlayer.name}'s gamemode to Adventure.`);
                targetPlayer.sendMessage(`§aYour gamemode has been set to Adventure by ${player.name}.`);
            }
        } catch (e) {
            player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
            console.error(`[gma] Failed to set gamemode: ${e.stack}`);
        }
    }
});
