// AntiCheatsBP/scripts/commands/testnotify.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: "Sends a test admin notification.",
    permissionLevel: permissionLevels.owner
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
