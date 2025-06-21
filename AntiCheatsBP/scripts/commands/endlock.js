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
    const { config, playerUtils, logManager, getString, permissionLevels } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const prefix = config.prefix;

    // definition.description = getString("command.endlock.description");
    // definition.permissionLevel = permissionLevels.admin;

    let statusTextKey;

    switch (subCommand) {
        case "on":
        case "lock":
            // setEndLocked might need dependencies if it starts logging or using config for property keys
            if (setEndLocked(true)) {
                player.sendMessage(getString("command.endlock.locked"));
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_on', details: 'The End locked' }, dependencies);
                playerUtils.notifyAdmins(getString("command.endlock.adminNotify.locked", { adminName: player.nameTag }), dependencies, player, null);
            } else {
                player.sendMessage(getString("command.endlock.fail"));
            }
            break;
        case "off":
        case "unlock":
            // setEndLocked might need dependencies
            if (setEndLocked(false)) {
                player.sendMessage(getString("command.endlock.unlocked"));
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_off', details: 'The End unlocked' }, dependencies);
                playerUtils.notifyAdmins(getString("command.endlock.adminNotify.unlocked", { adminName: player.nameTag }), dependencies, player, null);
            } else {
                player.sendMessage(getString("command.endlock.fail"));
            }
            break;
        case "status":
            // isEndLocked might need dependencies
            const locked = isEndLocked();
            statusTextKey = locked ? "common.status.locked" : "common.status.unlocked";
            player.sendMessage(getString("command.endlock.status", { status: getString(statusTextKey) }));
            break;
        default:
            player.sendMessage(getString("command.endlock.usage", { prefix: prefix }));
            return;
    }
}
