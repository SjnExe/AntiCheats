// AntiCheatsBP/scripts/commands/gmsp.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "gmsp",
    syntax: "!gmsp [playername]",
    description: "Sets Spectator mode for self or [playername].",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the gmsp (gamemode spectator) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog } = dependencies;

    if (playerUtils && typeof playerUtils.setPlayerGameMode === 'function') {
        await playerUtils.setPlayerGameMode(player, args[0], mc.GameMode.spectator, "Spectator", config, addLog);
    } else {
        player.sendMessage("§cError: Game mode setting utility is not available. Please contact an administrator.");
        console.warn("[gmspCmd] playerUtils.setPlayerGameMode is not available in dependencies.");
    }
}
