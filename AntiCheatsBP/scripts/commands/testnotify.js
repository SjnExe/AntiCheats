/**
 * @file AntiCheatsBP/scripts/commands/testnotify.js
 * Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
 * @version 1.0.3
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: "Sends a test admin notification to verify system functionality.",
    permissionLevel: 2,
    enabled: true,
};
/**
 * Executes the testnotify command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, permissionLevels, config } = dependencies;

    if (playerUtils && playerUtils.notifyAdmins) {
        playerUtils.notifyAdmins(`§6This is a test notification from ${player.nameTag} via the AntiCheat system.`, dependencies, player, null);
        player.sendMessage("§aTest notification sent to online admins/owners.");
    } else {
        player.sendMessage("§cError: Notification utility not available.");
        playerUtils.debugLog("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies.", player.nameTag, dependencies);
        console.warn("[TestNotifyCommand] playerUtils.notifyAdmins is not available in dependencies.");
    }
}
