/**
 * @file AntiCheatsBP/scripts/commands/version.js
 * Defines the !version command to display the AntiCheat addon version.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "version",
    syntax: "!version",
    description: getString("command.version.description"),
    permissionLevel: permissionLevels.admin, // Changed from normal to admin as per typical usage
    enabled: true,
};

/**
 * Executes the version command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(getString("command.version.message", { version: config.acVersion || getString("command.myflags.value.notApplicable") }));
}
