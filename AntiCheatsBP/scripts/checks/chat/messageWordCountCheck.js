/**
 * @file Implements a check to detect if a player's chat message exceeds the maximum allowed word count.
 */
import * as mc from '@minecraft/server'; // Not strictly needed here but kept for consistency if mc types were used.

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player's message exceeds the maximum allowed word count.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player sending the message.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data, containing the message.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled, `false` otherwise.
 */
export async function checkMessageWordCount(player, pData, eventData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableMaxWordsSpamCheck) {
        return false;
    }

    if (!pData) { // Ensure pData is available
        playerUtils.debugLog(`[MessageWordCountCheck] pData is null for ${player.nameTag}, skipping check.`, player.nameTag, dependencies);
        return false;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const message = eventData.message;

    // Split by whitespace and filter out empty strings that can result from multiple spaces
    const wordCount = message.split(/\s+/).filter(str => str.length > 0).length;

    const threshold = config.maxWordsSpamThreshold ?? 50;
    // Standardized action profile key
    const actionProfileKey = config.maxWordsSpamActionProfileName || 'chatSpamMaxWords'; // Corrected typo SPAM -> Spam
    const profile = config.checkActionProfiles?.[actionProfileKey]; // Get the profile for cancelMessage check

    let shouldCancel = false;

    if (wordCount > threshold) {
        if (playerUtils.debugLog) { // Check if debugLog exists, good practice
            playerUtils.debugLog(`[MessageWordCountCheck]: ${player.nameTag}'s message too long. Words: ${wordCount}, Threshold: ${threshold}`, watchedPrefix, dependencies);
        }

        const violationDetails = {
            wordCount: wordCount.toString(),
            maxWords: threshold.toString(),
            messageContent: message.length > 100 ? message.substring(0, 97) + '...' : message, // Truncate for logs/notifications
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        if (profile?.cancelMessage) {
            shouldCancel = true;
        }
    }
    return shouldCancel;
}
