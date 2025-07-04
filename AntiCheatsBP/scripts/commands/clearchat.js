/**
 * @file Defines the !clearchat command for administrators to clear the global chat.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'clearchat', // Already camelCase
    syntax: '!clearchat',
    description: 'Clears the global chat for all players.',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
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
    const { playerUtils, logManager, getString, config, mc } = dependencies; // mc from dependencies
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    const linesToClear = config?.chatClearLinesCount ?? 150;
    let allMessagesSent = true;
    for (let i = 0; i < linesToClear; i++) {
        try {
            mc.world.sendMessage(''); // Use mc from dependencies
        } catch (error) {
            console.warn(`[ClearChatCommand.execute] Error sending empty message line ${i + 1} for ${adminName}: ${error.stack || error}`);
            if (i > 5) { // Arbitrary threshold for giving up if errors persist
                player?.sendMessage(getString('command.clearchat.failPartial'));
                allMessagesSent = false;
                break; // Stop trying if multiple errors occur
            }
        }
    }

    if (allMessagesSent) {
        player?.sendMessage(getString('command.clearchat.success'));
    }

    try {
        // Configurable notification
        if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) { // Default true
            const baseNotifyMsg = `Chat cleared by §e${adminName}§r.`;
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

        logManager?.addLog({
            // timestamp: Date.now(), // logManager should handle timestamp
            adminName: adminName,
            actionType: 'chatCleared', // Standardized to camelCase
            targetName: 'Global',
            details: `Chat cleared by ${adminName}`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ClearChatCommand.execute] Error during logging/notification for ${adminName}: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ClearChatCommand.execute] Logging/Notify Error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
