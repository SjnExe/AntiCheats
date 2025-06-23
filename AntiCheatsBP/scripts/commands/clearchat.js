/**
 * Defines the !clearchat command for administrators to clear the global chat.
 */
import * as mc from '@minecraft/server';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "clearchat",
    syntax: "!clearchat",
    description: "Clears the global chat for all players.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the clearchat command.
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, logManager, permissionLevels, config } = dependencies;

    const linesToClear = 150;
    for (let i = 0; i < linesToClear; i++) {
        mc.world.sendMessage("");
    }
    player.sendMessage("§aChat has been cleared.");

    playerUtils.notifyAdmins(`Chat was cleared by ${player.nameTag}.`, dependencies, player, null);

    logManager.addLog({
        timestamp: Date.now(),
        adminName: player.nameTag,
        actionType: 'clear_chat',
        targetName: 'Global',
        details: `Chat cleared by ${player.nameTag}`
    }, dependencies);
}
