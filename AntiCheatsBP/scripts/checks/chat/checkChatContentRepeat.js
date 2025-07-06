/**
 * @file Implements a check to detect players repeating the same message content.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

const defaultHistoryLength = 5;
const defaultRepeatThreshold = 3; // Number of times message must appear in history to trigger
const defaultMinMessageLengthForRepeatCheck = 3; // Minimum length of a message to be considered for repeat check
const maxSnippetLength = 50; // For violation details

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
    // Further normalization: remove common punctuation that might be added to bypass
    // This is a simple version; more complex normalization might be needed for advanced bypasses.
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

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.chatContentRepeatActionProfileName ?? 'chatContentRepeat'; // Default is already camelCase
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

    // Ignore very short or empty messages after normalization
    if (normalizedMessage.length < minMessageLength) {
        // Still add to history if it's not purely whitespace, for context, but don't check for repeat.
        if (rawMessageContent.trim().length > 0) {
            pData.chatMessageHistory ??= [];
            pData.chatMessageHistory.push(normalizedMessage); // Add normalized version for future comparisons
             while (pData.chatMessageHistory.length > historyLength) {
                pData.chatMessageHistory.shift();
            }
            pData.isDirtyForSave = true;
        }
        return;
    }

    pData.chatMessageHistory ??= [];
    // Count occurrences of the current normalized message in the existing history *before* adding current one
    let matchCount = 0;
    for (const oldMessage of pData.chatMessageHistory) {
        if (oldMessage === normalizedMessage) {
            matchCount++;
        }
    }

    // Add current message to history *after* checking against past messages
    pData.chatMessageHistory.push(normalizedMessage);
    while (pData.chatMessageHistory.length > historyLength) {
        pData.chatMessageHistory.shift();
    }
    pData.isDirtyForSave = true;


    // The flag triggers if the message (already in history `matchCount` times) is now being sent again,
    // meeting or exceeding the threshold. So, check `matchCount + 1`.
    if ((matchCount + 1) >= triggerThreshold) {
        const watchedPlayerName = pData.isWatched ? playerName : null;
        const violationDetails = {
            repeatedMessageSnippet: normalizedMessage.substring(0, maxSnippetLength) + (normalizedMessage.length > maxSnippetLength ? '...' : ''),
            matchCountInHistory: (matchCount + 1).toString(), // Current attempt included
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
