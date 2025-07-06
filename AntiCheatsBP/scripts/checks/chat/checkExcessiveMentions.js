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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const enableCheck = config?.enableExcessiveMentionsCheck ?? false;
    if (!enableCheck) {
        return;
    }

    // It's generally better to check pData presence if it's strictly needed for a core part of the check.
    // For now, it's only used for the watched status in logging.
    if (!pData && config?.enableDebugLogging) {
        // Use playerName for consistency, and optional chaining for playerUtils
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, playerName, dependencies);
    }

    const defaultMinMessageLength = 10;
    const defaultMaxUniquePerMessage = 4;
    const defaultMaxRepeatedPerMessage = 3;
    const defaultActionProfileKey = 'chatExcessiveMentions';

    const minMessageLength = config?.mentionsMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxUniquePerMessage = config?.mentionsMaxUniquePerMessage ?? defaultMaxUniquePerMessage;
    const maxRepeatedPerMessage = config?.mentionsMaxRepeatedPerMessage ?? defaultMaxRepeatedPerMessage;

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.mentionsActionProfileName ?? defaultActionProfileKey; // Use the camelCase default
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const mentionRegex = /@([A-Za-z0-9_]{3,16})/g; // Common Minecraft username pattern
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        allMentions.push(match[1]);
    }

    if (allMentions.length === 0) {
        return;
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

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] Flagged ${playerName} for ${flagReasonTexts.join('; ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? playerName : null, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
