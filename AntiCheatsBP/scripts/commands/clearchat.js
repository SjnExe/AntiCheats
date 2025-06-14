/**
 * @file AntiCheatsBP/scripts/commands/clearchat.js
 * Defines the !clearchat command for administrators to clear the global chat.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server'; // For world.sendMessage
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "clearchat",
    syntax: "!clearchat",
    description: "command.clearchat.description",
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the clearchat command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) { // args renamed to _args as it's unused
    const { playerUtils, addLog } = dependencies;
    const linesToClear = 150; // As per original logic
    for (let i = 0; i < linesToClear; i++) {
        mc.world.sendMessage("");
    }
    // mc.world.sendMessage("§7Chat cleared by an Administrator."); // Optional public message
    player.sendMessage(getString("command.clearchat.success"));
    if (playerUtils.notifyAdmins) {
        playerUtils.notifyAdmins(getString("command.clearchat.notifyAdmins", { playerName: player.nameTag }), player, null);
    }
    if (addLog) {
        addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'clear_chat',
            targetName: 'Global',
            details: `Chat cleared by ${player.nameTag}`
        });
    }
}
