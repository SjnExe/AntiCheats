/**
 * @file Implements a check to detect players repeating the same message content.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

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

    const actionProfileKey = config.chatContentRepeatActionProfileName ?? 'chatContentRepeat';

    if (!config.enableChatContentRepeatCheck) {
        return;
    }
    if (!pData) {
        playerUtils.debugLog('[ChatContentRepeatCheck] pData is null, skipping check.', player.nameTag, dependencies);
        return;
    }

    const historyLength = config.chatContentRepeatHistoryLength ?? 5;
    const triggerThreshold = config.chatContentRepeatThreshold ?? 3;
    const normalizedMessage = normalizeMessage(rawMessageContent);

    if (normalizedMessage.length === 0) {
        return;
    }

    pData.chatMessageHistory = pData.chatMessageHistory || [];
    pData.chatMessageHistory.push(normalizedMessage);
    pData.isDirtyForSave = true;

    while (pData.chatMessageHistory.length > historyLength) {
        pData.chatMessageHistory.shift();
    }

    let matchCount = 0;
    for (const oldMessage of pData.chatMessageHistory) {
        if (oldMessage === normalizedMessage) {
            matchCount++;
        }
    }

    if (matchCount >= triggerThreshold) {
        const violationDetails = {
            repeatedMessageSnippet: normalizedMessage.substring(0, 50),
            matchCountInHistory: matchCount.toString(),
            historyLookback: historyLength.toString(),
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[ChatContentRepeatCheck] Flagged ${player.nameTag} for repeating '${normalizedMessage.substring(0, 20)}...'. Count: ${matchCount}/${historyLength}`, pData.isWatched ? player.nameTag : null, dependencies);

        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
