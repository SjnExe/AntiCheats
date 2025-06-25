/**
 * @file Implements a check to detect players sending chat messages too frequently (spamming).
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player is sending messages too frequently.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 *
 * @async
 * @param {mc.Player} player - The player sending the message.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, used for message content and cancellation.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastChatMessageTimestamp`.
 * @param {CommandDependencies} dependencies - The full dependencies object.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled due to spam, `false` otherwise.
 */
export async function checkMessageRate(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager

    if (!config.enableFastMessageSpamCheck) {
        return false;
    }

    if (!pData) { // Ensure pData is available
        playerUtils.debugLog(`[MessageRateCheck] pData is null for ${player.nameTag}, skipping check.`, player.nameTag, dependencies);
        return false;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    const threshold = config.fastMessageSpamThresholdMs ?? 500;
    // Standardized action profile key (ensure this matches actionProfiles.js)
    const actionProfileKey = config.fastMessageSpamActionProfileName || 'chatSpamFastMessage'; // Corrected typo SPAM -> Spam
    const profile = config.checkActionProfiles?.[actionProfileKey]; // Get the profile for cancelMessage check

    let shouldCancel = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = currentTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            playerUtils.debugLog(`[MessageRateCheck] ${player.nameTag} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPrefix, dependencies);

            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message.length > 100 ? eventData.message.substring(0, 97) + '...' : eventData.message, // Truncate long messages
            };
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            if (profile?.cancelMessage) {
                shouldCancel = true;
            }
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    pData.isDirtyForSave = true; // Mark data as dirty since a timestamp was updated

    return shouldCancel;
}
