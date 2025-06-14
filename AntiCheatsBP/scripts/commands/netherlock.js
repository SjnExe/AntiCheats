/**
 * @file AntiCheatsBP/scripts/commands/netherlock.js
 * Defines the !netherlock command for administrators to manage Nether dimension access.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { isNetherLocked, setNetherLocked } from '../utils/worldStateUtils.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "netherlock",
    syntax: "!netherlock <on|off|status>",
    description: getString("command.netherlock.description"),
    permissionLevel: permissionLevels.admin,
    enabled: true,
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
    const prefix = config.prefix;

    let statusTextKey; // For locked/unlocked status text

    switch (subCommand) {
        case "on":
        case "lock":
            if (setNetherLocked(true)) {
                player.sendMessage(getString("command.netherlock.locked"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_on', details: 'Nether locked' });
                if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(getString("command.netherlock.adminNotify.locked", { adminName: player.nameTag }), player, null);
            } else {
                player.sendMessage(getString("command.netherlock.fail")); // Generic fail, or could be more specific if setNetherLocked returned more info
            }
            break;
        case "off":
        case "unlock":
            if (setNetherLocked(false)) {
                player.sendMessage(getString("command.netherlock.unlocked"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_off', details: 'Nether unlocked' });
                if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(getString("command.netherlock.adminNotify.unlocked", { adminName: player.nameTag }), player, null);
            } else {
                player.sendMessage(getString("command.netherlock.fail"));
            }
            break;
        case "status":
            const locked = isNetherLocked();
            statusTextKey = locked ? "common.status.locked" : "common.status.unlocked";
            player.sendMessage(getString("command.netherlock.status", { status: getString(statusTextKey) }));
            break;
        default:
            player.sendMessage(getString("command.netherlock.usage", { prefix: prefix }));
            return;
    }
}
