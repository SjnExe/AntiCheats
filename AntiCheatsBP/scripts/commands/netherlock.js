/**
 * @file AntiCheatsBP/scripts/commands/netherlock.js
 * Defines the !netherlock command for administrators to manage Nether dimension access.
 * @version 1.0.0
 */
import { permissionLevels } from '../core/rankManager.js';
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js'; // Corrected import path

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "netherlock",
    syntax: "!netherlock <on|off|status>",
    description: "Manages the lock state for the Nether dimension. Prevents non-admins from entering when locked.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the netherlock command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";

    switch (subCommand) {
        case "on":
        case "lock":
            setNetherLocked(true);
            player.sendMessage("§cNether dimension is now LOCKED.§r Non-admins will be prevented from entering.");
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_on', details: 'Nether locked' });
            if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(`§cNether dimension was LOCKED by ${player.nameTag}.`, player, null);
            break;
        case "off":
        case "unlock":
            setNetherLocked(false);
            player.sendMessage("§aNether dimension is now UNLOCKED.§r All players can enter.");
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_off', details: 'Nether unlocked' });
            if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(`§aNether dimension was UNLOCKED by ${player.nameTag}.`, player, null);
            break;
        case "status":
            const locked = isNetherLocked();
            player.sendMessage(`§eNether dimension lock status: ${locked ? "§cLOCKED" : "§aUNLOCKED"}§e.`);
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <on|off|status>`);
            return;
    }
}
