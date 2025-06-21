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
    const { playerUtils, getString, permissionLevels, config } = dependencies; // Destructure all needed

    // definition.description = getString("command.testnotify.description");
    // definition.permissionLevel = permissionLevels.owner;

    if (playerUtils && playerUtils.notifyAdmins) {
        playerUtils.notifyAdmins(getString("command.testnotify.adminNotification.message", { playerName: player.nameTag }), dependencies, player, null);
        player.sendMessage(getString("command.testnotify.success"));
    } else {
        player.sendMessage(getString("command.testnotify.error.unavailable"));
        // Use standardized debugLog
        playerUtils.debugLog("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies.", player.nameTag, dependencies);
        console.warn("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies."); // Keep console for visibility
    }
}
