/**
 * @file Implements a check to detect players sending chat messages too frequently (spamming).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is sending messages too frequently.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data, used for message content and cancellation.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastChatMessageTimestamp`.
 * @param {Dependencies} dependencies - The full dependencies object.
 * @returns {Promise<void>} A promise that resolves when the check is complete.
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
    const threshold = config?.fastMessageSpamThresholdMs ?? 500;

    const rawActionProfileKey = config?.fastMessageSpamActionProfileName ?? 'chatSpamFastMessage';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const { playerDataManager } = dependencies; // Ensure playerDataManager is available
    let shouldCancelBasedOnProfile = false;
    let actionWasAwaited = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = initialTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            playerUtils?.debugLog(`[MessageRateCheck] ${playerName} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPlayerName, dependencies);

            const messageSnippetLimit = 100;
            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message.length > messageSnippetLimit ? eventData.message.substring(0, messageSnippetLimit - 3) + '...' : eventData.message,
                originalMessage: eventData.message,
            };

            const profile = dependencies.checkActionProfiles?.[actionProfileKey];
            if (profile?.cancelMessage) {
                shouldCancelBasedOnProfile = true;
            }

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            actionWasAwaited = true;
        }
    }

    // Re-fetch pData if an await occurred, to ensure atomicity for updates
    const pDataForUpdate = actionWasAwaited ? playerDataManager.getPlayerData(player.id) : pData;

    if (pDataForUpdate) {
        pDataForUpdate.lastChatMessageTimestamp = initialTime;
        pDataForUpdate.isDirtyForSave = true;
    }
    else if (actionWasAwaited) { // Corrected brace style
        // pData became null after await, log this potential issue
        playerUtils?.debugLog(`[MessageRateCheck] pData for ${playerName} became null after await. Cannot update timestamps.`, watchedPlayerName, dependencies);
    }


    if (shouldCancelBasedOnProfile) {
        eventData.cancel = true;
    }
}
