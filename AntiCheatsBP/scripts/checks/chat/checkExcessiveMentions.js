/**
 * @file Implements a check to detect excessive user mentions in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a message for excessive user mentions (e.g., @PlayerName).
 * Considers both the number of unique users mentioned and the frequency of mentions for a single user.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {CommandDependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkExcessiveMentions(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    const enableCheck = config.enableExcessiveMentionsCheck ?? false;
    if (!enableCheck) {
        return;
    }

    // pData is not strictly needed for the core logic but is used for watched player logging.
    // A null check isn't critical for functionality here if pData might be missing in some edge cases.
    if (!pData && config.enableDebugLogging) { // Log only if debug is on and pData is missing
        playerUtils.debugLog('[ExcessiveMentionsCheck] pData is null. Watched player status might be unavailable for logging.', player.nameTag, dependencies);
    }

    const minMessageLength = config.mentionsMinMessageLength ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxUniquePerMessage = config.mentionsMaxUniquePerMessage ?? 4;
    const maxRepeatedPerMessage = config.mentionsMaxRepeatedPerMessage ?? 3;
    const actionProfileKey = config.mentionsActionProfileName ?? 'chatExcessiveMentions'; // Standardized key
    const mentionRegex = /@([A-Za-z0-9_]{3,16})/g; // Common Minecraft username pattern
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        allMentions.push(match[1]); // Store only the username part
    }

    if (allMentions.length === 0) {
        return; // No mentions found
    }

    const distinctMentionedUsers = new Set(allMentions);
    const distinctMentionCount = distinctMentionedUsers.size;

    const mentionFrequency = {};
    let maxRepeatCount = 0;
    for (const user of allMentions) {
        mentionFrequency[user] = (mentionFrequency[user] || 0) + 1;
        if (mentionFrequency[user] > maxRepeatCount) {
            maxRepeatCount = mentionFrequency[user];
        }
    }

    const flagReasonTexts = [];
    if (distinctMentionCount > maxUniquePerMessage) {
        flagReasonTexts.push(`too many unique users mentioned (${distinctMentionCount}/${maxUniquePerMessage})`);
    }
    if (maxRepeatCount > maxRepeatedPerMessage) {
        flagReasonTexts.push(`same user mentioned too many times (${maxRepeatCount}/${maxRepeatedPerMessage})`);
    }

    if (flagReasonTexts.length > 0) {
        const violationDetails = {
            messageSnippet: rawMessageContent.length > 75 ? rawMessageContent.substring(0, 72) + '...' : rawMessageContent,
            totalMentionsFound: allMentions.length.toString(),
            uniqueMentionsCount: distinctMentionCount.toString(),
            maxRepeatedMentionCount: maxRepeatCount.toString(),
            distinctUsersSample: Array.from(distinctMentionedUsers).slice(0, 5).join(', '),
            triggerReasons: flagReasonTexts.join('; '),
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[ExcessiveMentionsCheck] Flagged ${player.nameTag} for ${flagReasonTexts.join('; ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? player.nameTag : null, dependencies);

        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
