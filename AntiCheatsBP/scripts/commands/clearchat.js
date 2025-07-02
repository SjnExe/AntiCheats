/**
 * @file Defines the !clearchat command for administrators to clear the global chat.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'clearchat',
    syntax: '!clearchat',
    description: 'Clears the global chat for all players.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !clearchat command.
 * Sends a large number of empty messages to effectively clear the chat screen for all players.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, logManager, getString, config } = dependencies;

    const linesToClear = config.chatClearLinesCount ?? 150; // Use config or default
    for (let i = 0; i < linesToClear; i++) {
        try {
            dependencies.mc.world.sendMessage('');
        } catch (error) {
            console.warn(`[ClearChatCommand] Error sending empty message line ${i + 1}: ${error}`);
            if (i > 5) { // Arbitrary threshold for giving up
                player.sendMessage(getString('command.clearchat.failPartial'));
                return;
            }
        }
    }
    player.sendMessage(getString('command.clearchat.success'));

    try {
        playerUtils.notifyAdmins(`§7[Admin] Chat cleared by §e${player.nameTag}§7.`, dependencies, player, null); // Admin notification can remain as is

        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'clearChat',
            targetName: 'Global',
            details: `Chat cleared by ${player.nameTag}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ClearChatCommand] Error during logging or admin notification: ${logError.stack || logError}`);
        playerUtils.debugLog(`[ClearChatCommand] Logging/Notify Error: ${logError.message}`, player.nameTag, dependencies);
    }
}
