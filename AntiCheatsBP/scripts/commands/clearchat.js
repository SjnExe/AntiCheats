/**
 * @file Defines the !clearchat command for administrators to clear the global chat.
 */
import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'clearchat',
    syntax: '!clearchat',
    description: 'Clears the global chat for all players.',
    permissionLevel: permissionLevels.admin, // Use a defined level from rankManager
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
    const { playerUtils, logManager, config, getString } = dependencies; // Added getString

    const linesToClear = 150; // Number of empty lines to send
    for (let i = 0; i < linesToClear; i++) {
        try {
            // Use dependencies.mc for API calls
            dependencies.mc.world.sendMessage('');
        } catch (error) {
            console.warn(`[ClearChatCommand] Error sending empty message line ${i + 1}: ${error}`);
            // Optionally break or log more formally if sendMessage fails repeatedly
            if (i > 5) { // Example: Stop if it fails multiple times
                player.sendMessage(getString('clearchat.error.partial'));
                return;
            }
        }
    }
    player.sendMessage(getString('clearchat.success'));

    try {
        playerUtils.notifyAdmins(getString('clearchat.adminNotification', { playerName: player.nameTag }), dependencies, player, null);

        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'clearChat', // Standardized actionType
            targetName: 'Global', // Target is the global chat
            details: `Chat cleared by ${player.nameTag}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ClearChatCommand] Error during logging or admin notification: ${logError.stack || logError}`);
        playerUtils.debugLog(`[ClearChatCommand] Logging/Notify Error: ${logError.message}`, player.nameTag, dependencies);
    }
}
