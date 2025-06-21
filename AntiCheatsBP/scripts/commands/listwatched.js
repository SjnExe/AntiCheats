/**
 * @file AntiCheatsBP/scripts/commands/listwatched.js
 * @description Command to list all currently online players being watched.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
// getString and permissionLevels will be accessed via dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "listwatched",
    syntax: "!listwatched", // Assuming prefix is '!'
    description: "command.listwatched.description", // Localization key
    aliases: ["lw", "watchedlist"],
    permissionLevel: null, // To be set dynamically from dependencies.permissionLevels.admin
    enabled: true,
};

/**
 * Executes the listwatched command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerDataManager, playerUtils, getString, permissionLevels, config } = dependencies;

    // Dynamically set permission level if not already set by command manager
    // (Though command manager should ideally handle this based on initial definition)
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.admin;
    }
    // Description would be resolved by the help command using getString.

    // Permission check is handled by commandManager, so no need for manual check here.

    const onlinePlayers = mc.world.getAllPlayers();
    const watchedPlayersNames = [];

    for (const p of onlinePlayers) {
        const pData = playerDataManager.getPlayerData(p.id); // Does not require full dependencies for simple get
        if (pData && pData.isWatched) {
            watchedPlayersNames.push(p.nameTag);
        }
    }

    if (watchedPlayersNames.length === 0) {
        playerUtils.sendMessage(player, getString("command.listwatched.noPlayers"));
    } else {
        const header = getString("command.listwatched.header");
        // Ensure sendMessage is a valid function on playerUtils or directly use player.sendMessage
        if (playerUtils.sendMessage && typeof playerUtils.sendMessage === 'function') {
            playerUtils.sendMessage(player, `${header}${watchedPlayersNames.join(', ')}`);
        } else {
            player.sendMessage(`${header}${watchedPlayersNames.join(', ')}`); // Fallback
        }
    }
    // Optional: Log command usage
    if (dependencies.logManager && dependencies.logManager.addLog) {
        dependencies.logManager.addLog({
            adminName: player.nameTag,
            actionType: 'command_listwatched',
            details: `Listed watched players. Count: ${watchedPlayersNames.length}`
        }, dependencies);
    }
}

// Remove the old registerCommand call if it existed in the original file.
// The commandManager in core will load this module based on its exported definition and execute.
