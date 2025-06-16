/**
 * @file AntiCheatsBP/scripts/checks/chat/messageRateCheck.js
 * Implements a check to detect players sending chat messages too frequently (spamming).
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
 * Checks if a player is sending messages too frequently.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 * @param {mc.Player} player - The player sending the message.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastChatMessageTimestamp`.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, used for message content and cancellation.
 * @param {Config} config - The server configuration object, containing thresholds and check toggles.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check but part of standard signature).
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled due to spam, `false` otherwise.
 */
export async function checkMessageRate(
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
    if (!config.enableFastMessageSpamCheck) {
        return false; // Check is disabled, so message should not be cancelled by it.
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    // Use nullish coalescing for robust default values, in case config values could be 0 or false.
    const threshold = config.fastMessageSpamThresholdMs ?? 500;
    const actionProfileName = config.fastMessageSPAMActionProfileName ?? "chatSpamFastMessage";
    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = currentTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            if (playerUtils.debugLog) { // Ensure debugLog exists before calling
                playerUtils.debugLog(`MessageRateCheck: ${player.nameTag} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPrefix);
            }

            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message // Include message content for context in logs/notifications
            };
            // Construct dependencies for executeCheckAction consistently
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            await executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (actionProfile?.cancelMessage) {
                shouldCancel = true;
            }
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    pData.isDirtyForSave = true;

    return shouldCancel;
}
