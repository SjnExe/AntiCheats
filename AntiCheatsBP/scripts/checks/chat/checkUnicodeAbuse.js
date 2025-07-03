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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableUnicodeAbuseCheck) {
        return;
    }

    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[UnicodeAbuseCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, playerName, dependencies);
    }

    const DEFAULT_MIN_MESSAGE_LENGTH = 5;
    const DEFAULT_MAX_DIACRITIC_RATIO = 0.5;
    const DEFAULT_ABSOLUTE_MAX_DIACRITICS = 10;
    const DEFAULT_ACTION_PROFILE_KEY = 'chatUnicodeAbuse';

    const minMessageLength = config?.unicodeAbuseMinMessageLength ?? DEFAULT_MIN_MESSAGE_LENGTH;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxDiacriticRatio = config?.unicodeAbuseMaxDiacriticRatio ?? DEFAULT_MAX_DIACRITIC_RATIO;
    const absoluteMaxDiacritics = config?.unicodeAbuseAbsoluteMaxDiacritics ?? DEFAULT_ABSOLUTE_MAX_DIACRITICS;

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.unicodeAbuseActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? DEFAULT_ACTION_PROFILE_KEY;

    let diacriticCount = 0;
    let otherCharCount = 0;

    for (const char of rawMessageContent) {
        // \p{M} matches all combining diacritical marks (Mn, Mc, Me)
        if (/\p{M}/u.test(char)) {
            diacriticCount++;
        } else if (/\S/.test(char)) { // Any non-whitespace character that is not a diacritic.
            otherCharCount++;
        }
    }

    const totalRelevantChars = diacriticCount + otherCharCount;
    if (totalRelevantChars === 0) {
        return;
    }

    const actualRatio = diacriticCount / totalRelevantChars;
    const flaggedByRatio = actualRatio >= maxDiacriticRatio && otherCharCount > 0;
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

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[UnicodeAbuseCheck] Flagged ${playerName} for Unicode abuse (${reason}). Ratio: ${actualRatio.toFixed(2)}, Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? playerName : null, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
