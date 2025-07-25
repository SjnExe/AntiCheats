/**
 * @file Detects excessive user mentions in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/checkExcessiveMentions
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const distinctUsersSampleLimit = 5;
const ellipsisLength = 3;
const debugLogSnippetLengthMentions = 20;

/**
 * Checks a message for excessive user mentions.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkExcessiveMentions(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

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

    const actionProfileKey = config?.mentionsActionProfileName ?? defaultActionProfileKey;

    // This regex handles two cases:
    // 1. Standard usernames without spaces: @Username
    // 2. Usernames with spaces enclosed in quotes: @"User Name"
    const mentionRegex = /@(?:([A-Za-z0-9_]{3,24})|"([^"]{3,50})")/g;
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        // The actual username will be in capture group 1 (unquoted) or 2 (quoted)
        const mentionedUser = match[1] || match[2];
        if (mentionedUser) {
            allMentions.push(mentionedUser);
        }
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
        const messageSnippetLimit = 75;
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? `${rawMessageContent.substring(0, messageSnippetLimit - ellipsisLength) }...` : rawMessageContent,
            totalMentionsFound: allMentions.length.toString(),
            uniqueMentionsCount: distinctMentionCount.toString(),
            maxRepeatedMentionCount: maxRepeatCount.toString(),
            mostRepeatedUser,
            distinctUsersSample: Array.from(distinctMentionedUsers).slice(0, distinctUsersSampleLimit).join(', '),
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
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] Flagged ${playerName} for ${flagReasonTexts.join('; ')}. Msg: '${rawMessageContent.substring(0, debugLogSnippetLengthMentions)}...'`, watchedPlayerName, dependencies);
    }
}
