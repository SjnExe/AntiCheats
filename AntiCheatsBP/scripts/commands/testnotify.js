/**
 * @file AntiCheatsBP/scripts/commands/testnotify.js
 * Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: getString("command.testnotify.description"),
    permissionLevel: permissionLevels.owner, // Restricted to owner for system testing
    enabled: true,
};

/**
 * Executes the testnotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) { // args renamed to _args
    const { playerUtils } = dependencies;
    if (playerUtils && playerUtils.notifyAdmins) {
        // Pass player.nameTag to the notification message
        playerUtils.notifyAdmins(getString("command.testnotify.adminNotification.message", { playerName: player.nameTag }), player, null);
        player.sendMessage(getString("command.testnotify.success"));
    } else {
        player.sendMessage(getString("command.testnotify.error.unavailable"));
        console.warn("[testnotify] playerUtils.notifyAdmins is not available in dependencies.");
    }
}
