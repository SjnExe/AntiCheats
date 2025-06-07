/**
 * @file AntiCheatsBP/scripts/commands/testnotify.js
 * Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/testnotify.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: "Sends a test admin notification.",
    permissionLevel: permissionLevels.owner // Restricted to owner for system testing
};

/**
 * Executes the testnotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils } = dependencies;
    if (playerUtils && playerUtils.notifyAdmins) {
        playerUtils.notifyAdmins("§6This is a test notification from the AntiCheat system.", player, null);
        player.sendMessage("§aTest notification sent to online admins/owners.");
    } else {
        player.sendMessage("§cError: Notification utility not available.");
        console.warn("[testnotify] playerUtils.notifyAdmins is not available in dependencies.");
    }
}
