/**
 * @file Implements a check to detect players repeating the same message content.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

const defaultHistoryLength = 5;
const defaultRepeatThreshold = 3;
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
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Checks if a player is repeating the same message content based on their recent chat history.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data, used for storing chat history.
 * @param {CommandDependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkChatContentRepeat(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.chatContentRepeatActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? 'chatContentRepeat';

    if (!config?.enableChatContentRepeatCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[ChatContentRepeatCheck.execute] pData is null for ${playerName}, skipping check.`, playerName, dependencies);
        return;
    }

    const historyLength = config?.chatContentRepeatHistoryLength ?? defaultHistoryLength;
    const triggerThreshold = config?.chatContentRepeatThreshold ?? defaultRepeatThreshold;
    const normalizedMessage = normalizeMessage(rawMessageContent);

    if (normalizedMessage.length === 0) { // Ignore empty or whitespace-only messages after normalization
        return;
    }

    pData.chatMessageHistory = pData.chatMessageHistory || []; // Initialize if undefined
    pData.chatMessageHistory.push(normalizedMessage);
    pData.isDirtyForSave = true;

    // Trim history to the configured length
    while (pData.chatMessageHistory.length > historyLength) {
        pData.chatMessageHistory.shift();
    }

    let matchCount = 0;
    // Count occurrences of the current normalized message in the recent history
    for (const oldMessage of pData.chatMessageHistory) {
        if (oldMessage === normalizedMessage) {
            matchCount++;
        }
    }

    if (matchCount >= triggerThreshold) {
        const violationDetails = {
            repeatedMessageSnippet: normalizedMessage.substring(0, maxSnippetLength),
            matchCountInHistory: matchCount.toString(),
            historyLookback: historyLength.toString(),
            originalMessage: rawMessageContent, // Add original for context
        };
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(
            `[ChatContentRepeatCheck.execute] Flagged ${playerName} for repeating '${normalizedMessage.substring(0, 20)}...'. ` +
            `Count: ${matchCount} in last ${pData.chatMessageHistory.length} (lookback: ${historyLength}).`,
            pData.isWatched ? playerName : null, dependencies
        );

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
