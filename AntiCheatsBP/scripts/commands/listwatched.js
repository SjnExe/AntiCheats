/**
 * @file AntiCheatsBP/scripts/commands/listwatched.js
 * @description Command to list all currently online players being watched.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';
import { registerCommand } from './commandRegistry.js';
import { getString } from '../core/i18n.js';
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels

// Command Configuration
const commandName = 'listwatched';
const commandDescriptionKey = 'command.listwatched.description';
const requiredPermissionLevel = permissionLevels.admin; // Use imported permission level

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
        playerUtils.sendMessage(player, getString("command.listwatched.noPlayers"));
    } else {
        const header = getString("command.listwatched.header");
        playerUtils.sendMessage(player, `${header}${watchedPlayersNames.join(', ')}`);
    }
}

// Register the command
registerCommand({
    commandName: commandName,
    aliases: ["lw", "watchedlist"], // Added some example aliases
    descriptionKey: commandDescriptionKey,
    permissionLevel: requiredPermissionLevel,
    execute: async (player, args, dependencies) => {
        // Manual permission check
        if (dependencies.playerUtils.getPlayerPermissionLevel(player) > requiredPermissionLevel) {
            dependencies.playerUtils.sendMessage(player, getString("common.error.noPermissionCommand")); // Corrected key
            return;
        }
        await executeListWatched(player, args, dependencies);
    }
});
