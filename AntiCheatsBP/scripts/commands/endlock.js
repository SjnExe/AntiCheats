import { permissionLevels } from '../core/rankManager.js';
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js'; // Corrected import path

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "endlock",
    syntax: "!endlock <on|off|status>",
    description: "Manages the lock state for the End dimension. Prevents non-admins from entering when locked.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the endlock command.
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
            setEndLocked(true);
            player.sendMessage("§cThe End dimension is now LOCKED.§r Non-admins will be prevented from entering.");
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_on', details: 'The End locked' });
            if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(`§cThe End dimension was LOCKED by ${player.nameTag}.`, player, null);
            break;
        case "off":
        case "unlock":
            setEndLocked(false);
            player.sendMessage("§aThe End dimension is now UNLOCKED.§r All players can enter.");
            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_off', details: 'The End unlocked' });
            if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(`§aThe End dimension was UNLOCKED by ${player.nameTag}.`, player, null);
            break;
        case "status":
            const locked = isEndLocked();
            player.sendMessage(`§eThe End dimension lock status: ${locked ? "§cLOCKED" : "§aUNLOCKED"}§e.`);
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} <on|off|status>`);
            return;
    }
}
