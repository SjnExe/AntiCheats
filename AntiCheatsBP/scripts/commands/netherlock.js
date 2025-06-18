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
    const { config, playerUtils, logManager, getString, permissionLevels } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "status";
    const prefix = config.prefix;

    // definition.description = getString("command.netherlock.description");
    // definition.permissionLevel = permissionLevels.admin;

    let statusTextKey;

    switch (subCommand) {
        case "on":
        case "lock":
            // setNetherLocked might need dependencies if it starts logging or using config
            if (setNetherLocked(true)) {
                player.sendMessage(getString("command.netherlock.locked"));
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_on', details: 'Nether locked' }, dependencies);
                playerUtils.notifyAdmins(getString("command.netherlock.adminNotify.locked", { adminName: player.nameTag }), dependencies, player, null);
            } else {
                player.sendMessage(getString("command.netherlock.fail"));
            }
            break;
        case "off":
        case "unlock":
            // setNetherLocked might need dependencies
            if (setNetherLocked(false)) {
                player.sendMessage(getString("command.netherlock.unlocked"));
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'nether_lock_off', details: 'Nether unlocked' }, dependencies);
                playerUtils.notifyAdmins(getString("command.netherlock.adminNotify.unlocked", { adminName: player.nameTag }), dependencies, player, null);
            } else {
                player.sendMessage(getString("command.netherlock.fail"));
            }
            break;
        case "status":
            // isNetherLocked might need dependencies
            const locked = isNetherLocked();
            statusTextKey = locked ? "common.status.locked" : "common.status.unlocked";
            player.sendMessage(getString("command.netherlock.status", { status: getString(statusTextKey) }));
            break;
        default:
            player.sendMessage(getString("command.netherlock.usage", { prefix: prefix }));
            return;
    }
}
