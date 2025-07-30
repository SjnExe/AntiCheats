/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

const defaultHistoryLength = 5;
const defaultRepeatThreshold = 3;
const defaultMinMessageLengthForRepeatCheck = 3;
const maxSnippetLength = 50;
const debugLogMessageSnippetLength = 20;

/**
 * Normalizes a chat message for comparison.
 * @param {string} message The message to normalize.
 * @returns {string} The normalized message.
 */
function normalizeMessage(message) {
    if (typeof message !== 'string') {
        return '';
    }
    return message.toLowerCase().trim().replace(/[.,!?"';:]/g, '').replace(/\s+/g, ' ');
}

/**
 * Checks if a player is repeating the same message content.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkChatContentRepeat(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableChatContentRepeatCheck) {
        return;
    }

    const actionProfileKey = config?.chatContentRepeatActionProfileName ?? 'chatContentRepeat';

    if (!pData) {
        playerUtils?.debugLog(`[ChatContentRepeatCheck] pData is null for ${playerName}, skipping check.`, playerName, dependencies);
        return;
    }

    pData.chatMessageHistory ??= [];
    const historyLength = config?.chatContentRepeatHistoryLength ?? defaultHistoryLength;
    const triggerThreshold = config?.chatContentRepeatThreshold ?? defaultRepeatThreshold;
    const minMessageLength = config?.chatContentRepeatMinMessageLength ?? defaultMinMessageLengthForRepeatCheck;

    const normalizedMessage = normalizeMessage(rawMessageContent);

    // Only check for repeats if the message is long enough
    if (normalizedMessage.length >= minMessageLength) {
        const matchCount = pData.chatMessageHistory.filter(oldMessage => oldMessage === normalizedMessage).length;

        // The current message is the (matchCount + 1)-th occurrence.
        // We flag when this number reaches the threshold.
        if ((matchCount + 1) >= triggerThreshold) {
            const watchedPlayerName = pData.isWatched ? playerName : null;
            const violationDetails = {
                repeatedMessageSnippet: normalizedMessage.substring(0, maxSnippetLength) + (normalizedMessage.length > maxSnippetLength ? '...' : ''),
                matchCountInHistory: (matchCount + 1).toString(),
                historyLookback: historyLength.toString(),
                triggerThreshold: triggerThreshold.toString(),
                originalMessage: rawMessageContent,
            };

            const profile = dependencies.checkActionProfiles?.[actionProfileKey];
            if (profile?.cancelMessage) {
                eventData.cancel = true;
            }

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            playerUtils?.debugLog(
                `[ChatContentRepeatCheck] Flagged ${playerName} for repeating '${normalizedMessage.substring(0, debugLogMessageSnippetLength)}...'. ` +
                `Count: ${matchCount + 1} in last ${pData.chatMessageHistory.length + 1} (lookback: ${historyLength}, threshold: ${triggerThreshold}).`,
                watchedPlayerName, dependencies,
            );
        }
    }

    // Always add the message to history (if it's not empty) and manage history size *after* the check.
    if (normalizedMessage.length > 0) {
        pData.chatMessageHistory.push(normalizedMessage);
        while (pData.chatMessageHistory.length > historyLength) {
            pData.chatMessageHistory.shift();
        }
        pData.isDirtyForSave = true;
    }
}
