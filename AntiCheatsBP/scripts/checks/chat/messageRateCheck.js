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
 * @param {CommandDependencies} dependencies - The full dependencies object.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled due to spam, `false` otherwise.
 */
export async function checkMessageRate(
    player,
    eventData, // eventData is now the second parameter
    pData,
    dependencies
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableFastMessageSpamCheck) {
        return false; // Check is disabled.
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    const threshold = config.fastMessageSpamThresholdMs ?? 500;
    const actionProfileName = config.fastMessageSPAMActionProfileName ?? "chatSpamFastMessage";
    // Action profile is typically fetched within executeCheckAction or actionManager itself.
    // If needed directly for `cancelMessage` logic before calling executeCheckAction:
    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = currentTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            if (playerUtils.debugLog) {
                playerUtils.debugLog(`MessageRateCheck: ${player.nameTag} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPrefix);
            }

            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message
            };
            // Pass the main dependencies object to executeCheckAction
            await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            // Check if the action profile (fetched from config or determined by actionManager) resulted in cancellation.
            // This assumes executeCheckAction might modify eventData.cancel or the profile dictates cancellation.
            // For explicit control here, we check the profile.
            if (actionProfile?.cancelMessage) { // This logic might be redundant if executeCheckAction handles cancellation
                shouldCancel = true;
            }
            // If executeCheckAction directly modifies eventData.cancel, then this `shouldCancel` variable might not be needed,
            // and the function could simply not return a boolean, relying on eventData.cancel being set by the action.
            // However, sticking to the requirement of returning boolean for now.
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    pData.isDirtyForSave = true;

    return shouldCancel;
}
