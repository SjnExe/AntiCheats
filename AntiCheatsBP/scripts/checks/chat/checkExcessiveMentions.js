/**
 * @file Implements a check to detect excessive user mentions in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const DISTINCT_USERS_SAMPLE_LIMIT = 5;
const ELLIPSIS_LENGTH = 3;
const DEBUG_LOG_SNIPPET_LENGTH_MENTIONS = 20;

/**
 * Checks a message for excessive user mentions (e.g., @PlayerName).
 * Considers both the number of unique users mentioned and the frequency of mentions for a single user.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {Dependencies} dependencies - Shared command dependencies.
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

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
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

    const rawActionProfileKey = config?.mentionsActionProfileName ?? defaultActionProfileKey;
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const mentionRegex = /@([A-Za-z0-9_]{3,24})/g;
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        allMentions.push(match[1]);
    }

    if (allMentions.length === 0) {
        return;
    }

    const distinctMentionedUsers = new Set(allMentions.map(u => u.toLowerCase()));
    const distinctMentionCount = distinctMentionedUsers.size;

    const mentionFrequency = {};
    let maxRepeatCount = 0;
    let mostRepeatedUser = '';

    for (const user of allMentions) {
        const lowerUser = user.toLowerCase();
        mentionFrequency[lowerUser] = (mentionFrequency[lowerUser] || 0) + 1;
        if (mentionFrequency[lowerUser] > maxRepeatCount) {
            maxRepeatCount = mentionFrequency[lowerUser];
            mostRepeatedUser = user;
        }
    }

    const flagReasonTexts = [];
    if (distinctMentionCount > maxUniquePerMessage) {
        flagReasonTexts.push(`too many unique users mentioned (${distinctMentionCount}/${maxUniquePerMessage})`);
    }
    if (maxRepeatCount > maxRepeatedPerMessage) {
        flagReasonTexts.push(`user '${mostRepeatedUser}' mentioned too many times (${maxRepeatCount}/${maxRepeatedPerMessage})`);
    }

    if (flagReasonTexts.length > 0) {
        const messageSnippetLimit = 75; // This is a local const, might be better at top or from config if shared
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? rawMessageContent.substring(0, messageSnippetLimit - ELLIPSIS_LENGTH) + '...' : rawMessageContent,
            totalMentionsFound: allMentions.length.toString(),
            uniqueMentionsCount: distinctMentionCount.toString(),
            maxRepeatedMentionCount: maxRepeatCount.toString(),
            mostRepeatedUser: mostRepeatedUser,
            distinctUsersSample: Array.from(distinctMentionedUsers).slice(0, DISTINCT_USERS_SAMPLE_LIMIT).join(', '),
            triggerReasons: flagReasonTexts.join('; '),
            originalMessage: rawMessageContent,
        };

        // Determine if message should be cancelled before awaiting actionManager
        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] Flagged ${playerName} for ${flagReasonTexts.join('; ')}. Msg: '${rawMessageContent.substring(0, DEBUG_LOG_SNIPPET_LENGTH_MENTIONS)}...'`, watchedPlayerName, dependencies);
    }
}
