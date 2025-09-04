import { commandManager } from './commandManager.js';
import { GameMode } from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';
import { errorLog } from '../../core/errorLogger.js';

commandManager.register({
    name: 'gma',
    aliases: ['a', 'adventure'],
    description: 'Sets your or another player\'s gamemode to Adventure.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        let targetPlayer = player;
        if (args.target && args.target.length > 0) {
            targetPlayer = args.target[0];

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
            errorLog(`[/x:gma] Failed to set gamemode: ${e.stack}`);
        }
    }
});
