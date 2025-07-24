/**
 * @file Defines the !clearchat command for administrators to clear the global chat.
 */

// Default configuration values
const defaultChatClearLinesCount = 150;
const clearChatFailureThresholdMessages = 5;

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'clearchat',
    syntax: '',
    description: 'Clears the global chat for all players.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !clearchat command.
 * Sends a large number of empty messages to effectively clear the chat screen for all players.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, _args, dependencies) {
    const { playerUtils, logManager, getString, config, mc } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    const linesToClear = config?.chatClearLinesCount ?? defaultChatClearLinesCount;
    let allMessagesSent = true;
    let messagesAttempted = 0;

    if (!mc?.world?.sendMessage) {
        console.error('[ClearChatCommand.execute CRITICAL] mc.world.sendMessage is not available. Cannot clear chat.');
        player?.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'System chat function unavailable.' }));
        return;
    }

    for (let i = 0; i < linesToClear; i++) {
        messagesAttempted++;
        try {
            mc.world.sendMessage(' ');
        } catch (error) {
            console.warn(`[ClearChatCommand.execute WARNING] Error sending empty message line ${i + 1} for ${adminName}: ${error.stack || error}`);
            if (i > clearChatFailureThresholdMessages) {
                player?.sendMessage(getString('command.clearchat.failPartial'));
                allMessagesSent = false;
                break;
            }
        }
    }

    if (allMessagesSent && messagesAttempted > 0) {
        player?.sendMessage(getString('command.clearchat.success'));
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
    } else if (messagesAttempted === 0) {
        player?.sendMessage(getString('command.clearchat.failPartial'));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    } else {
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    }


    try {
        if (config?.notifyOnAdminUtilCommandUsage !== false) {
            const baseNotifyMsg = getString('command.clearchat.notify.cleared', { adminName });
            playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
        }

        logManager?.addLog({
            adminName,
            actionType: 'chatCleared',
            targetName: 'Global',
            details: `Chat cleared by ${adminName} (${linesToClear} lines attempted).`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ClearChatCommand.execute CRITICAL] Error during logging/notification for ${adminName}: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ClearChatCommand.execute CRITICAL] Logging/Notify Error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
