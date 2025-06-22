/**
 * @file AntiCheatsBP/scripts/commands/netherlock.js
 * Defines the !netherlock command for administrators to manage Nether dimension access.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js'; // These utilities might need their own refactor

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "netherlock",
    syntax: "!netherlock <on|off|status>",
    description: "Manages Nether dimension access.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the netherlock command.
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
            if (setNetherLocked(true)) {
                // Placeholder for "command.netherlock.locked"
                player.sendMessage("§cNether dimension is now LOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_on', details: 'Nether locked' }, dependencies);
                // Placeholder for "command.netherlock.adminNotify.locked"
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has LOCKED the Nether.`, dependencies, player, null);
            } else {
                // Placeholder for "command.netherlock.fail"
                player.sendMessage("§cFailed to update Nether lock state.");
            }
            break;
        case "off":
        case "unlock":
            if (setNetherLocked(false)) {
                // Placeholder for "command.netherlock.unlocked"
                player.sendMessage("§aNether dimension is now UNLOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_off', details: 'Nether unlocked' }, dependencies);
                // Placeholder for "command.netherlock.adminNotify.unlocked"
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has UNLOCKED the Nether.`, dependencies, player, null);
            } else {
                // Placeholder for "command.netherlock.fail"
                player.sendMessage("§cFailed to update Nether lock state.");
            }
            break;
        case "status":
            const locked = isNetherLocked();
            // "common.status.locked" -> "§cLOCKED"
            // "common.status.unlocked" -> "§aUNLOCKED"
            statusText = locked ? "§cLOCKED" : "§aUNLOCKED";
            // Placeholder for "command.netherlock.status"
            player.sendMessage(`§eNether dimension status: ${statusText}`);
            break;
        default:
            // Placeholder for "command.netherlock.usage"
            player.sendMessage(`§cUsage: ${prefix}netherlock <on|off|status>`);
            return;
    }
}
