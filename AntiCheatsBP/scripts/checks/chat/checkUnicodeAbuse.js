/**
 * @file Implements a check to detect Unicode abuse (e.g., Zalgo text with excessive diacritics).
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a message for Unicode abuse, specifically excessive combining diacritical marks.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {Dependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkUnicodeAbuse(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableUnicodeAbuseCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[UnicodeAbuseCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 5;
    const defaultMaxDiacriticRatio = 0.5; // Ratio of diacritics to non-diacritic, non-space characters
    const defaultAbsoluteMaxDiacritics = 10; // Absolute number of diacritics to trigger
    const defaultActionProfileKey = 'chatUnicodeAbuse'; // Already camelCase

    const minMessageLength = config?.unicodeAbuseMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxDiacriticRatio = config?.unicodeAbuseMaxDiacriticRatio ?? defaultMaxDiacriticRatio;
    const absoluteMaxDiacritics = config?.unicodeAbuseAbsoluteMaxDiacritics ?? defaultAbsoluteMaxDiacritics;

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.unicodeAbuseActionProfileName ?? defaultActionProfileKey;
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    let diacriticCount = 0;
    let baseCharCount = 0; // Count of non-diacritic, non-whitespace characters

    for (const char of rawMessageContent) {
        // \p{M} or \p{Mark}: General category for all combining marks (diacritics, etc.)
        // Unicode property escapes need the 'u' flag on RegExp, but here we test char by char.
        if (/\p{M}/u.test(char)) {
            diacriticCount++;
        } else if (/\S/.test(char)) { // Any non-whitespace character that is not a diacritic is a base character
            baseCharCount++;
        }
    }

    // If there are no base characters (e.g., message is only diacritics or only whitespace),
    // the ratio is undefined or infinite. Handle this.
    // If baseCharCount is 0 but diacriticCount > 0, it's definitely abuse.
    if (baseCharCount === 0 && diacriticCount > 0) {
        // Treat as 100% diacritic ratio if base chars are zero but diacritics exist
        if (diacriticCount >= absoluteMaxDiacritics || (maxDiacriticRatio <= 1.0 && diacriticCount > 0) /* if ratio is <=1, any diacritics w/o base is abuse */) {
            const violationDetails = {
                messageSnippet: rawMessageContent.length > 50 ? rawMessageContent.substring(0, 47) + '...' : rawMessageContent,
                diacriticCount: diacriticCount.toString(),
                baseCharCount: baseCharCount.toString(), // Will be 0
                calculatedRatio: 'Infinity (or 1.0 if base is 0)',
                ratioThreshold: maxDiacriticRatio.toFixed(2),
                absoluteThreshold: absoluteMaxDiacritics.toString(),
                flagReason: 'only diacritics or excessive absolute count',
                originalMessage: rawMessageContent,
            };
            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[UnicodeAbuseCheck] Flagged ${playerName} for Unicode abuse (only diacritics). Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, 20)}...'`, watchedPlayerName, dependencies);
            const profile = dependencies.checkActionProfiles?.[actionProfileKey];
            if (profile?.cancelMessage) eventData.cancel = true;
            return;
        }
    }
    if (baseCharCount === 0) return; // No relevant characters to check ratio against.

    const actualRatio = diacriticCount / baseCharCount; // Ratio of diacritics to base characters
    const flaggedByRatio = actualRatio >= maxDiacriticRatio;
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
        const messageSnippetLimit = 50;
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? rawMessageContent.substring(0, messageSnippetLimit - 3) + '...' : rawMessageContent,
            diacriticCount: diacriticCount.toString(),
            baseCharCount: baseCharCount.toString(),
            calculatedRatio: actualRatio.toFixed(2),
            ratioThreshold: maxDiacriticRatio.toFixed(2),
            absoluteThreshold: absoluteMaxDiacritics.toString(),
            flagReason: reason,
            originalMessage: rawMessageContent,
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[UnicodeAbuseCheck] Flagged ${playerName} for Unicode abuse (${reason}). Ratio: ${actualRatio.toFixed(2)}, Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, 20)}...'`, watchedPlayerName, dependencies);

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
