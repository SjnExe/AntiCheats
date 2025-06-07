// AntiCheatsBP/scripts/checks/chat/messageRateCheck.js
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is sending messages too frequently.
 * @param {mc.Player} player The player sending the message.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.ChatSendBeforeEvent} eventData The chat event data (used for potential cancellation).
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 * @returns {boolean} Returns true if the message should be cancelled, false otherwise.
 */
export async function checkMessageRate(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableFastMessageSpamCheck) {
        return false; // Message should not be cancelled by this check if disabled
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    const threshold = config.fastMessageSpamThresholdMs || 500; // Default to 500ms
    const actionProfileName = config.fastMessageSpamActionProfileName || "chat_spam_fast_message";
    const actionProfile = config.checkActionProfiles ? config.checkActionProfiles[actionProfileName] : null;

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
                messageContent: eventData.message // Include message content for context
            };
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            await executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (actionProfile && actionProfile.cancelMessage) {
                shouldCancel = true;
            }
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    return shouldCancel;
}
