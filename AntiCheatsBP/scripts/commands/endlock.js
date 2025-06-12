/**
 * @file AntiCheatsBP/scripts/commands/endlock.js
 * Defines the !endlock command for administrators to manage End dimension access.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "endlock",
    syntax: "!endlock <on|off|status>",
    description: getString("command.endlock.description"),
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
    const prefix = config.prefix;

    let statusTextKey; // For locked/unlocked status text

    switch (subCommand) {
        case "on":
        case "lock":
            if (setEndLocked(true)) {
                player.sendMessage(getString("command.endlock.locked"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_on', details: 'The End locked' });
                if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(getString("command.endlock.adminNotify.locked", { adminName: player.nameTag }), player, null);
            } else {
                player.sendMessage(getString("command.endlock.fail"));
            }
            break;
        case "off":
        case "unlock":
            if (setEndLocked(false)) {
                player.sendMessage(getString("command.endlock.unlocked"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_off', details: 'The End unlocked' });
                if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(getString("command.endlock.adminNotify.unlocked", { adminName: player.nameTag }), player, null);
            } else {
                player.sendMessage(getString("command.endlock.fail"));
            }
            break;
        case "status":
            const locked = isEndLocked();
            statusTextKey = locked ? "common.status.locked" : "common.status.unlocked";
            player.sendMessage(getString("command.endlock.status", { status: getString(statusTextKey) }));
            break;
        default:
            player.sendMessage(getString("command.endlock.usage", { prefix: prefix }));
            return;
    }
}
