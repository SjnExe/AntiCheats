/**
 * @file Implements a check to detect excessive user mentions in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

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

    const watchedPlayerName = pData?.isWatched ? playerName : null; // Get watched status early
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 10;
    const defaultMaxUniquePerMessage = 4;
    const defaultMaxRepeatedPerMessage = 3;
    const defaultActionProfileKey = 'chatExcessiveMentions'; // Already camelCase

    const minMessageLength = config?.mentionsMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxUniquePerMessage = config?.mentionsMaxUniquePerMessage ?? defaultMaxUniquePerMessage;
    const maxRepeatedPerMessage = config?.mentionsMaxRepeatedPerMessage ?? defaultMaxRepeatedPerMessage;

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.mentionsActionProfileName ?? defaultActionProfileKey;
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    // Regex to find @mentions. This pattern assumes names are 3-16 alphanumeric_ characters.
    // It might need adjustment based on actual server username rules.
    const mentionRegex = /@([A-Za-z0-9_]{3,24})/g; // Increased max length to 24 for typical Xbox Live Gamertags
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        allMentions.push(match[1]); // Push the captured group (username without @)
    }

    if (allMentions.length === 0) {
        return; // No mentions found
    }

    const distinctMentionedUsers = new Set(allMentions.map(u => u.toLowerCase())); // Store lowercase for unique count
    const distinctMentionCount = distinctMentionedUsers.size;

    const mentionFrequency = {};
    let maxRepeatCount = 0;
    let mostRepeatedUser = '';

    for (const user of allMentions) {
        const lowerUser = user.toLowerCase();
        mentionFrequency[lowerUser] = (mentionFrequency[lowerUser] || 0) + 1;
        if (mentionFrequency[lowerUser] > maxRepeatCount) {
            maxRepeatCount = mentionFrequency[lowerUser];
            mostRepeatedUser = user; // Keep original case for display if needed
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
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? rawMessageContent.substring(0, messageSnippetLimit - 3) + '...' : rawMessageContent,
            totalMentionsFound: allMentions.length.toString(),
            uniqueMentionsCount: distinctMentionCount.toString(),
            maxRepeatedMentionCount: maxRepeatCount.toString(),
            mostRepeatedUser: mostRepeatedUser, // Add most repeated user for context
            distinctUsersSample: Array.from(distinctMentionedUsers).slice(0, 5).join(', '),
            triggerReasons: flagReasonTexts.join('; '),
            originalMessage: rawMessageContent,
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ExcessiveMentionsCheck] Flagged ${playerName} for ${flagReasonTexts.join('; ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, watchedPlayerName, dependencies);

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
