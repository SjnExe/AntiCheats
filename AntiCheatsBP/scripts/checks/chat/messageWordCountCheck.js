/**
 * @file AntiCheatsBP/scripts/checks/chat/messageWordCountCheck.js
 * Implements a check to detect if a player's chat message exceeds the maximum allowed word count.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks if a player's message exceeds the maximum allowed word count.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 * @param {mc.Player} player - The player sending the message.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, containing the message.
 * @param {Config} config - The server configuration object, with thresholds and check toggles.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check).
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled, `false` otherwise.
 */
export async function checkMessageWordCount(
    player,
    pData,
    eventData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // currentTick is not used here but kept for consistent check signature
) {
    if (!config.enableMaxWordsSpamCheck) {
        return false; // Check is disabled.
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const message = eventData.message;

    // Efficiently count words by splitting by whitespace and filtering out empty strings
    // that result from multiple spaces between words.
    const wordCount = message.split(/\s+/).filter(str => str.length > 0).length;

    const threshold = config.maxWordsSpamThreshold ?? 50;
    const actionProfileName = config.maxWordsSPAMActionProfileName ?? "chatSpamMaxWords";
    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (wordCount > threshold) {
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`MessageWordCountCheck: ${player.nameTag}'s message too long. Words: ${wordCount}, Threshold: ${threshold}`, watchedPrefix, dependencies);
        }

        const violationDetails = {
            wordCount: wordCount.toString(),
            maxWords: threshold.toString(),
            // Truncate very long messages for logs/notifications to avoid excessive length
            messageContent: message.length > 100 ? message.substring(0, 97) + "..." : message
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, actionProfileName, violationDetails, dependencies);

        if (actionProfile?.cancelMessage) {
            shouldCancel = true;
        }
    }
    // This check does not modify pData, so no need to mark as dirty.
    return shouldCancel;
}
