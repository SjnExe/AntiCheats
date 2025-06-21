/**
 * @file AntiCheatsBP/scripts/commands/clearchat.js
 * Defines the !clearchat command for administrators to clear the global chat.
 * @version 1.0.2
 */
// permissionLevels and getString are now accessed via dependencies
import * as mc from '@minecraft/server'; // For world.sendMessage

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "clearchat",
    syntax: "!clearchat",
    description: "Clears the global chat for all players.", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the clearchat command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, logManager, getString, permissionLevels, config } = dependencies; // Destructure all needed

    // definition.description = getString("command.clearchat.description");
    // definition.permissionLevel = permissionLevels.admin;

    const linesToClear = 150;
    for (let i = 0; i < linesToClear; i++) {
        mc.world.sendMessage("");
    }
    player.sendMessage(getString("command.clearchat.success"));

    playerUtils.notifyAdmins(getString("command.clearchat.notifyAdmins", { playerName: player.nameTag }), dependencies, player, null);

    logManager.addLog({
        timestamp: Date.now(),
        adminName: player.nameTag,
        actionType: 'clear_chat',
        targetName: 'Global',
        details: `Chat cleared by ${player.nameTag}`
    }, dependencies);
}
