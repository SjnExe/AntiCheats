/**
 * @file AntiCheatsBP/scripts/commands/testnotify.js
 * Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: "Sends a test admin notification to verify system functionality.", // Static fallback
    permissionLevel: 2, // Static fallback (Owner)
    enabled: true,
};

/**
 * Executes the testnotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, permissionLevels, config } = dependencies; // getString removed

    // Static definitions are used

    if (playerUtils && playerUtils.notifyAdmins) {
        // "command.testnotify.adminNotification_message" -> "§6This is a test notification from {playerName} via the AntiCheat system."
        playerUtils.notifyAdmins(`§6This is a test notification from ${player.nameTag} via the AntiCheat system.`, dependencies, player, null);
        // "command.testnotify.success" -> "§aTest notification sent to online admins/owners."
        player.sendMessage("§aTest notification sent to online admins/owners.");
    } else {
        // "command.testnotify.error.unavailable" -> "§cError: Notification utility not available."
        player.sendMessage("§cError: Notification utility not available.");
        // Use standardized debugLog
        playerUtils.debugLog("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies.", player.nameTag, dependencies);
        console.warn("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies."); // Keep console for visibility
    }
}
