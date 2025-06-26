/**
 * @file Implements a check to detect Unicode abuse (e.g., Zalgo text with excessive diacritics).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a message for Unicode abuse, specifically excessive combining diacritical marks.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {CommandDependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkUnicodeAbuse(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    if (!config.enableUnicodeAbuseCheck) {
        return;
    }

    if (!pData && config.enableDebugLogging) {
        playerUtils.debugLog('[UnicodeAbuseCheck] pData is null. Watched player status might be unavailable for logging.', player.nameTag, dependencies);
    }

    const minMessageLength = config.unicodeAbuseMinMessageLength ?? 5;
    if (rawMessageContent.length < minMessageLength) {
        return; // Message too short
    }

    const maxDiacriticRatio = config.unicodeAbuseMaxDiacriticRatio ?? 0.5;
    const absoluteMaxDiacritics = config.unicodeAbuseAbsoluteMaxDiacritics ?? 10;
    const actionProfileKey = config.unicodeAbuseActionProfileName ?? 'chatUnicodeAbuse'; // Standardized key
    let diacriticCount = 0;
    let otherCharCount = 0; // Count of non-diacritic, non-whitespace characters

    // Iterate through the message to count diacritics and other relevant characters
    for (const char of rawMessageContent) {
        // \p{M} matches all combining diacritical marks (Mn, Mc, Me)
        if (/\p{M}/u.test(char)) { // Use .test() for boolean check
            diacriticCount++;
        } else if (/\S/.test(char)) { // Any non-whitespace character that is not a diacritic. Use .test()
            otherCharCount++;
        }
    }

    const totalRelevantChars = diacriticCount + otherCharCount;
    if (totalRelevantChars === 0) { // Avoid division by zero if message is all whitespace
        return;
    }

    const actualRatio = diacriticCount / totalRelevantChars;
    const flaggedByRatio = actualRatio >= maxDiacriticRatio && otherCharCount > 0; // Ensure there are base characters for ratio to be meaningful
    const flaggedByAbsolute = diacriticCount >= absoluteMaxDiacritics;
    let reason = '';

    if (flaggedByRatio && flaggedByAbsolute) {
        reason = 'ratio and absolute count';
    } else if (flaggedByRatio) {
        reason = 'ratio';
    } else if (flaggedByAbsolute) {
        reason = 'absolute count';
    }

    if (reason) {
        const violationDetails = {
            messageSnippet: rawMessageContent.length > 50 ? rawMessageContent.substring(0, 47) + '...' : rawMessageContent,
            diacriticCount: diacriticCount.toString(),
            otherCharCount: otherCharCount.toString(),
            calculatedRatio: actualRatio.toFixed(2),
            ratioThreshold: maxDiacriticRatio.toFixed(2),
            absoluteThreshold: absoluteMaxDiacritics.toString(),
            flagReason: reason,
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[UnicodeAbuseCheck] Flagged ${player.nameTag} for Unicode abuse (${reason}). Ratio: ${actualRatio.toFixed(2)}, Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? player.nameTag : null, dependencies);

        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
