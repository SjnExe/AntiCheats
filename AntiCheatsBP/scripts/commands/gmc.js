/**
 * @file AntiCheatsBP/scripts/commands/gmc.js
 * Defines the !gmc command for administrators to set a player's gamemode to Creative.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/gmc.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmc",
    syntax: "!gmc [playername]",
    description: "Sets Creative mode for self or [playername].",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the gmc (gamemode creative) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog } = dependencies; // setPlayerGameMode is expected in playerUtils

    if (playerUtils && typeof playerUtils.setPlayerGameMode === 'function') {
        // playerUtils.setPlayerGameMode will handle messages, logging, etc.
        await playerUtils.setPlayerGameMode(player, args[0], mc.GameMode.creative, "Creative", config, addLog);
    } else {
        player.sendMessage("§cError: Game mode setting utility is not available. Please contact an administrator.");
        console.warn("[gmcCmd] playerUtils.setPlayerGameMode is not available in dependencies.");
    }
}
