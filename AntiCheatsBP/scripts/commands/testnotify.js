/**
 * Defines the !testnotify command for owners to send a test admin notification.
 * Useful for verifying that the admin notification system is working correctly.
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
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, permissionLevels, config } = dependencies;

    playerUtils.notifyAdmins(`§6This is a test notification from ${player.nameTag} via the AntiCheat system.`, dependencies, player, null);
    player.sendMessage("§aTest notification sent to online admins/owners.");
}
