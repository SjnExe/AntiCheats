/**
 * @file AntiCheatsBP/scripts/commands/listwatched.js
 * @description Command to list all currently online players being watched.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';
import { registerCommand } from './commandRegistry.js';
// getString and permissionLevels will be accessed via dependencies

// Command Configuration
const commandName = 'listwatched';
const commandDescriptionKey = "Lists all currently online players being watched."; // Static fallback
const requiredPermissionLevel = 1; // Static fallback (Admin)

async function executeListWatched(player, args, dependencies) {
    const { playerDataManager, playerUtils } = dependencies;

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData && pData.isWatched) {
            watchedPlayersNames.push(p.nameTag);
        }
    }

    if (watchedPlayersNames.length === 0) {
        playerUtils.sendMessage(player, "No players are currently being watched.");
    } else {
        const header = "Currently watched players: ";
        playerUtils.sendMessage(player, `${header}${watchedPlayersNames.join(', ')}`);
    }
}

// Register the command
registerCommand({
    commandName: commandName,
    aliases: ["lw", "watchedlist"],
    descriptionKey: commandDescriptionKey, // commandManager should handle localization if this is a key
    permissionLevel: requiredPermissionLevel, // commandManager uses this
    execute: async (player, args, dependencies) => {
        const { playerUtils, permissionLevels, rankManager } = dependencies; // Ensure all are here

        // Manual permission check using rankManager from dependencies
        if (rankManager.getPlayerPermissionLevel(player, dependencies) > (permissionLevels.admin /* or static 1 */)) {
            playerUtils.sendMessage(player, "You do not have permission to use this command.");
            return;
        }
        await executeListWatched(player, args, dependencies);
    }
});
