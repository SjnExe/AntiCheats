/**
 * @file AntiCheatsBP/scripts/commands/endlock.js
 * Defines the !endlock command for administrators to manage End dimension access.
 * @version 1.0.3
 */
import { isEndLocked, setEndLocked } from '../utils/worldStateUtils.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "endlock",
    syntax: "!endlock <on|off|status>",
    description: "Manages End dimension access.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the endlock command.
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
            if (setEndLocked(true)) {
                player.sendMessage("§cThe End dimension is now LOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_on', details: 'The End locked' }, dependencies);
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has LOCKED The End.`, dependencies, player, null);
            } else {
                player.sendMessage("§cFailed to update The End lock state.");
            }
            break;
        case "off":
        case "unlock":
            if (setEndLocked(false)) {
                player.sendMessage("§aThe End dimension is now UNLOCKED.");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'end_lock_off', details: 'The End unlocked' }, dependencies);
                playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has UNLOCKED The End.`, dependencies, player, null);
            } else {
                player.sendMessage("§cFailed to update The End lock state.");
            }
            break;
        case "status":
            const locked = isEndLocked();
            statusText = locked ? "§cLOCKED" : "§aUNLOCKED";
            player.sendMessage(`§eThe End dimension status: ${statusText}`);
            break;
        default:
            player.sendMessage(`§cUsage: ${prefix}endlock <on|off|status>`);
            return;
    }
}
