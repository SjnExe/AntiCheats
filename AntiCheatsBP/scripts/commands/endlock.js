/**
 * @file AntiCheatsBP/scripts/commands/endlock.js
 * Defines the !endlock command for administrators to manage End dimension access.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js'; // These utilities might need their own refactor if they use config/log

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "endlock",
    syntax: "!endlock <on|off|status>",
    description: "Manages End dimension access.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the endlock command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels } = dependencies; // getString removed
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const prefix = config.prefix;

    // Static definitions are used

    let statusText;

    switch (subCommand) {
        case "on":
        case "lock":
            if (setEndLocked(true)) {
                // Placeholder for "command.endlock.locked"
                player.sendMessage("§cThe End dimension is now LOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_on', details: 'The End locked' }, dependencies);
                // Placeholder for "command.endlock.adminNotify.locked"
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has LOCKED The End.`, dependencies, player, null);
            } else {
                // Placeholder for "command.endlock.fail"
                player.sendMessage("§cFailed to update The End lock state.");
            }
            break;
        case "off":
        case "unlock":
            if (setEndLocked(false)) {
                // Placeholder for "command.endlock.unlocked"
                player.sendMessage("§aThe End dimension is now UNLOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_off', details: 'The End unlocked' }, dependencies);
                // Placeholder for "command.endlock.adminNotify.unlocked"
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has UNLOCKED The End.`, dependencies, player, null);
            } else {
                // Placeholder for "command.endlock.fail"
                player.sendMessage("§cFailed to update The End lock state.");
            }
            break;
        case "status":
            const locked = isEndLocked();
            // "common.status.locked" -> "§cLOCKED"
            // "common.status.unlocked" -> "§aUNLOCKED"
            statusText = locked ? "§cLOCKED" : "§aUNLOCKED";
            // Placeholder for "command.endlock.status"
            player.sendMessage(`§eThe End dimension status: ${statusText}`);
            break;
        default:
            // Placeholder for "command.endlock.usage"
            player.sendMessage(`§cUsage: ${prefix}endlock <on|off|status>`);
            return;
    }
}
