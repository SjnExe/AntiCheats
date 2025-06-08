/**
 * @file AntiCheatsBP/scripts/commands/version.js
 * Defines the !version command to display the AntiCheat addon version.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/version.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "version",
    syntax: "!version",
    description: "Displays addon version.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the version command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§7AntiCheat Addon Version: §e${config.acVersion || 'Not Set'}`);
}
