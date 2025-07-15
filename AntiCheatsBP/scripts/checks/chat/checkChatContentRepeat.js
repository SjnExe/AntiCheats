/**
 * @file Detects players repeating the same message content.
 * @module AntiCheatsBP/scripts/checks/chat/checkChatContentRepeat
 */

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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableChatContentRepeatCheck) {
        return;
    }

    const actionProfileKey = config?.chatContentRepeatActionProfileName ?? 'chatContentRepeat';

    if (!pData) {
        playerUtils?.debugLog(`[ChatContentRepeatCheck] pData is null for ${playerName}, skipping check.`, playerName, dependencies);
        return;
    }

    const historyLength = config?.chatContentRepeatHistoryLength ?? defaultHistoryLength;
    const triggerThreshold = config?.chatContentRepeatThreshold ?? defaultRepeatThreshold;
    const minMessageLength = config?.chatContentRepeatMinMessageLength ?? defaultMinMessageLengthForRepeatCheck;

    const normalizedMessage = normalizeMessage(rawMessageContent);

    if (normalizedMessage.length < minMessageLength) {
        if (rawMessageContent.trim().length > 0) {
            pData.chatMessageHistory ??= [];
            pData.chatMessageHistory.push(normalizedMessage);
            while (pData.chatMessageHistory.length > historyLength) {
                pData.chatMessageHistory.shift();
            }
            pData.isDirtyForSave = true;
        }
        return;
    }

    pData.chatMessageHistory ??= [];
    let matchCount = 0;
    for (const oldMessage of pData.chatMessageHistory) {
        if (oldMessage === normalizedMessage) {
            matchCount++;
        }
    }

    pData.chatMessageHistory.push(normalizedMessage);
    while (pData.chatMessageHistory.length > historyLength) {
        pData.chatMessageHistory.shift();
    }
    pData.isDirtyForSave = true;

    if ((matchCount + 1) >= triggerThreshold) {
        const watchedPlayerName = pData.isWatched ? playerName : null;
        const violationDetails = {
            repeatedMessageSnippet: normalizedMessage.substring(0, maxSnippetLength) + (normalizedMessage.length > maxSnippetLength ? '...' : ''),
            matchCountInHistory: (matchCount + 1).toString(),
            historyLookback: historyLength.toString(),
            triggerThreshold: triggerThreshold.toString(),
            originalMessage: rawMessageContent,
        };

        // Determine if message should be cancelled before awaiting actionManager
        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(
            `[ChatContentRepeatCheck] Flagged ${playerName} for repeating '${normalizedMessage.substring(0, debugLogMessageSnippetLength)}...'. ` +
            `Count: ${matchCount + 1} in last ${pData.chatMessageHistory.length} (lookback: ${historyLength}, threshold: ${triggerThreshold}).`,
            watchedPlayerName, dependencies,
        );
    }
}
