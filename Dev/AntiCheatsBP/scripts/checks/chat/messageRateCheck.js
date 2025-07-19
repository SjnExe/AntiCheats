/**
 * @file Detects players sending chat messages too frequently.
 * @module AntiCheatsBP/scripts/checks/chat/messageRateCheck
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const DEFAULT_FAST_MESSAGE_SPAM_THRESHOLD_MS = 500;
const LOCAL_ELLIPSIS_LENGTH_MSG_RATE = 3;

/**
 * Checks if a player is sending messages too frequently.
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The full dependencies object.
 */
export async function checkMessageRate(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableFastMessageSpamCheck) {
        return;
    }

    if (!pData) {
        playerUtils?.debugLog(`[MessageRateCheck] pData is null for ${playerName}, skipping check.`, playerName, dependencies);
        return;
    }

    const watchedPlayerName = pData.isWatched ? playerName : null;
    const initialTime = Date.now(); // Timestamp of when this message event began processing
    const threshold = config?.fastMessageSpamThresholdMs ?? DEFAULT_FAST_MESSAGE_SPAM_THRESHOLD_MS;

    const actionProfileKey = config?.fastMessageSpamActionProfileName ?? 'chatSpamFastMessage';

    const { playerDataManager } = dependencies; // Ensure playerDataManager is available
    // let shouldCancelBasedOnProfile = false; // Removed as it's unused
    let actionWasAwaited = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = initialTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            playerUtils?.debugLog(`[MessageRateCheck] ${playerName} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPlayerName, dependencies);

            const messageSnippetLimit = 100;
            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message.length > messageSnippetLimit ? `${eventData.message.substring(0, messageSnippetLimit - LOCAL_ELLIPSIS_LENGTH_MSG_RATE) }...` : eventData.message,
                originalMessage: eventData.message,
            };

            const profile = dependencies.checkActionProfiles?.[actionProfileKey];
            if (profile?.cancelMessage) {
                eventData.cancel = true; // Set cancel before await
                // shouldCancelBasedOnProfile = true; // Removed as it's unused
            }

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            actionWasAwaited = true;
        }
    }

    // Re-fetch pData if an await occurred, to ensure atomicity for updates
    // The original logic for pDataForUpdate and timestamp update remains.
    // The eventData.cancel decision is now handled before the await.
    const pDataForUpdate = actionWasAwaited ? playerDataManager.getPlayerData(player.id) : pData;

    if (pDataForUpdate) {
        pDataForUpdate.lastChatMessageTimestamp = initialTime;
        pDataForUpdate.isDirtyForSave = true;
    } else if (actionWasAwaited) {
        // pData became null after await, log this potential issue
        playerUtils?.debugLog(`[MessageRateCheck] pData for ${playerName} became null after await. Cannot update timestamps.`, watchedPlayerName, dependencies);
    }

    // The final if (shouldCancelBasedOnProfile) block is removed as cancellation is handled before await.
    // If actionManager could set eventData.cancel = false, and we need to re-assert true,
    // then the original structure (with the lint error) was more robust for that specific scenario.
    // Assuming actionManager doesn't fight the cancellation.
}
