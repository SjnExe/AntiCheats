/**
 * @file Implements a check to detect players repeating the same message content.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

const defaultHistoryLength = 5;
const defaultRepeatThreshold = 3;
const defaultMinMessageLengthForRepeatCheck = 3;
const maxSnippetLength = 50;

/**
 * Normalizes a chat message for comparison by converting to lowercase,
 * trimming whitespace, and collapsing multiple spaces into single spaces.
 * @param {string} message - The message to normalize.
 * @returns {string} The normalized message, or an empty string if input is not a string.
 */
function normalizeMessage(message) {
    if (typeof message !== 'string') {
        return '';
    }
    return message.toLowerCase().trim().replace(/[.,!?"';:]/g, '').replace(/\s+/g, ' ');
}

/**
 * Checks if a player is repeating the same message content based on their recent chat history.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data, used for storing chat history.
 * @param {Dependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkChatContentRepeat(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableChatContentRepeatCheck) {
        return;
    }

    const rawActionProfileKey = config?.chatContentRepeatActionProfileName ?? 'chatContentRepeat';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

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
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(
            `[ChatContentRepeatCheck] Flagged ${playerName} for repeating '${normalizedMessage.substring(0, 20)}...'. ` +
            `Count: ${matchCount + 1} in last ${pData.chatMessageHistory.length} (lookback: ${historyLength}, threshold: ${triggerThreshold}).`,
            watchedPlayerName, dependencies
        );

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
