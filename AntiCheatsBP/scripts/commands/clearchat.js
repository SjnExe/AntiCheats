/**
 * @file Defines the !clearchat command for administrators to clear the global chat.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'clearchat',
    syntax: '', // No arguments needed, prefix handled by commandManager
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
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { playerUtils, logManager, getString, config, mc } = dependencies; // mc from dependencies
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    const linesToClear = config?.chatClearLinesCount ?? 150; // Default 150 lines
    let allMessagesSent = true;
    let messagesAttempted = 0;

    // Check if mc.world and mc.world.sendMessage are available
    if (!mc?.world?.sendMessage) {
        console.error('[ClearChatCommand.execute CRITICAL] mc.world.sendMessage is not available. Cannot clear chat.');
        player?.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'System chat function unavailable.' }));
        return;
    }

    for (let i = 0; i < linesToClear; i++) {
        messagesAttempted++;
        try {
            // Sending an empty string might be optimized out by some chat systems.
            // A non-breaking space or similar might be more reliable if "" doesn't work.
            // For now, assuming "" is sufficient for Bedrock Scripting API's world.sendMessage.
            mc.world.sendMessage(' '); // Send a single space to ensure it's not optimized out
        } catch (error) {
            console.warn(`[ClearChatCommand.execute WARNING] Error sending empty message line ${i + 1} for ${adminName}: ${error.stack || error}`);
            if (i > 5) { // Arbitrary threshold for giving up if errors persist
                player?.sendMessage(getString('command.clearchat.failPartial'));
                allMessagesSent = false;
                break; // Stop trying if multiple errors occur
            }
        }
    }

    if (allMessagesSent && messagesAttempted > 0) { // Ensure at least one message was attempted
        player?.sendMessage(getString('command.clearchat.success'));
        playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);
    } else if (messagesAttempted === 0) { // linesToClear might have been 0 or negative
        player?.sendMessage(getString('command.clearchat.failPartial')); // Or a more specific "no lines to clear" message
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
    } else { // Partial failure
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
    }


    try {
        // Notify admins if configured
        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseNotifyMsg = getString('command.clearchat.notify.cleared', { adminName: adminName });
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

        logManager?.addLog({
            adminName: adminName,
            actionType: 'chatCleared', // Standardized camelCase
            targetName: 'Global', // Target is global chat
            details: `Chat cleared by ${adminName} (${linesToClear} lines attempted).`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ClearChatCommand.execute CRITICAL] Error during logging/notification for ${adminName}: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ClearChatCommand.execute CRITICAL] Logging/Notify Error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
