/**
 * @file AntiCheatsBP/scripts/commands/netherlock.js
 * Defines the !netherlock command for administrators to manage Nether dimension access.
 * @version 1.0.3
 */
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "netherlock",
    syntax: "!netherlock <on|off|status>",
    description: "Manages Nether dimension access.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the netherlock command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, permissionLevels } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const prefix = config.prefix;

    let statusText;

    switch (subCommand) {
        case "on":
        case "lock":
            if (setNetherLocked(true)) {
                player.sendMessage("§cNether dimension is now LOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_on', details: 'Nether locked' }, dependencies);
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has LOCKED the Nether.`, dependencies, player, null);
            } else {
                player.sendMessage("§cFailed to update Nether lock state.");
            }
            break;
        case "off":
        case "unlock":
            if (setNetherLocked(false)) {
                player.sendMessage("§aNether dimension is now UNLOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_off', details: 'Nether unlocked' }, dependencies);
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has UNLOCKED the Nether.`, dependencies, player, null);
            } else {
                player.sendMessage("§cFailed to update Nether lock state.");
            }
            break;
        case "status":
            const locked = isNetherLocked();
            statusText = locked ? "§cLOCKED" : "§aUNLOCKED";
            player.sendMessage(`§eNether dimension status: ${statusText}`);
            break;
        default:
            player.sendMessage(`§cUsage: ${prefix}netherlock <on|off|status>`);
            return;
    }
}
