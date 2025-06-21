/**
 * @file AntiCheatsBP/scripts/checks/chat/checkExcessiveMentions.js
 * Implements a check to detect excessive user mentions in chat messages.
 * @version 1.0.1
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks a message for excessive user mentions.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkExcessiveMentions(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    const enableExcessiveMentionsCheck = config.enableExcessiveMentionsCheck ?? false;
    if (!enableExcessiveMentionsCheck) {
        return;
    }
    if (!pData) { // pData might not be used by this specific check's logic but is part of standard signature
        playerUtils.debugLog("[ExcessiveMentionsCheck] pData is null, skipping check (though not strictly needed for this check's core logic).", dependencies, player.nameTag);
        // return; // Decide if pData is truly optional or if this is an error state
    }

    const minMessageLength = config.mentionsMinMessageLength ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxUniquePerMessage = config.mentionsMaxUniquePerMessage ?? 4;
    const maxRepeatedPerMessage = config.mentionsMaxRepeatedPerMessage ?? 3;
    const actionProfileName = config.mentionsActionProfileName ?? "chatExcessiveMentions";
    const mentionRegex = /@([A-Za-z0-9_]{3,16})/g; // Assuming 3-16 char Minecraft names
    const allMentions = [];
    let match;

    while ((match = mentionRegex.exec(rawMessageContent)) !== null) {
        allMentions.push(match[1]); // match[1] is the captured username
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

    let flagReasonTexts = [];
    if (distinctMentionCount > maxUniquePerMessage) {
        flagReasonTexts.push(`too many unique users mentioned (${distinctMentionCount}/${maxUniquePerMessage})`);
    }
    if (maxRepeatCount > maxRepeatedPerMessage) {
        flagReasonTexts.push(`same user mentioned too many times (${maxRepeatCount}/${maxRepeatedPerMessage})`);
    }

    if (flagReasonTexts.length > 0) {
        const violationDetails = {
            messageSnippet: rawMessageContent.substring(0, 75),
            totalMentionsFound: allMentions.length.toString(),
            uniqueMentionsCount: distinctMentionCount.toString(),
            maxRepeatedMentionCount: maxRepeatCount.toString(),
            distinctUsersSample: Array.from(distinctMentionedUsers).slice(0, 5).join(', '),
            triggerReasons: flagReasonTexts.join('; ')
        };

        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
        playerUtils.debugLog(`[ExcessiveMentionsCheck] Flagged ${player.nameTag} for ${flagReasonTexts.join('; ')}. Msg: "${rawMessageContent.substring(0,20)}..."`, pData?.isWatched ? player.nameTag : null, dependencies);
    }
}
