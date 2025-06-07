// AntiCheatsBP/scripts/checks/chat/messageWordCountCheck.js
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player's message exceeds the maximum allowed word count.
 * @param {mc.Player} player The player sending the message.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.ChatSendBeforeEvent} eventData The chat event data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 * @returns {boolean} Returns true if the message should be cancelled, false otherwise.
 */
export async function checkMessageWordCount(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableMaxWordsSpamCheck) {
        return false; // Message should not be cancelled by this check if disabled
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const message = eventData.message;
    // Split by any whitespace characters and filter out empty strings from multiple spaces
    const wordCount = message.split(/\s+/).filter(Boolean).length;
    const threshold = config.maxWordsSpamThreshold || 50; // Default to 50 words
    const actionProfileName = config.maxWordsSpamActionProfileName || "chat_spam_max_words";
    const actionProfile = config.checkActionProfiles ? config.checkActionProfiles[actionProfileName] : null;

    let shouldCancel = false;

    if (wordCount > threshold) {
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`MessageWordCountCheck: ${player.nameTag} message too long. Words: ${wordCount}, Threshold: ${threshold}`, watchedPrefix);
        }

        const violationDetails = {
            wordCount: wordCount.toString(),
            maxWords: threshold.toString(),
            messageContent: message.length > 100 ? message.substring(0, 97) + "..." : message // Truncate long messages for logs/notifications
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, actionProfileName, violationDetails, dependencies);

        if (actionProfile && actionProfile.cancelMessage) {
            shouldCancel = true;
        }
    }
    return shouldCancel;
}
