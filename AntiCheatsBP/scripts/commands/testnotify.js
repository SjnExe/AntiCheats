// AntiCheatsBP/scripts/commands/testnotify.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "testnotify",
    syntax: "!testnotify",
    description: "Sends a test admin notification.",
    permissionLevel: permissionLevels.OWNER
};

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
