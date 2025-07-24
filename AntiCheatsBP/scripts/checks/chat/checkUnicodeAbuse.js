/**
 * @file Detects Unicode abuse (e.g., Zalgo text) in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/checkUnicodeAbuse
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const messageSnippetLimitUnicode = 50;
const localEllipsisLengthUnicode = 3;
const debugLogUnicodeSnippetLength = 20;

/**
 * Checks a message for Unicode abuse (excessive diacritics).
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkUnicodeAbuse(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableUnicodeAbuseCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[UnicodeAbuseCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 5;
    const defaultMaxDiacriticRatio = 0.5;
    const defaultAbsoluteMaxDiacritics = 10;
    const defaultActionProfileKey = 'chatUnicodeAbuse';

    const minMessageLength = config?.unicodeAbuseMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxDiacriticRatio = config?.unicodeAbuseMaxDiacriticRatio ?? defaultMaxDiacriticRatio;
    const absoluteMaxDiacritics = config?.unicodeAbuseAbsoluteMaxDiacritics ?? defaultAbsoluteMaxDiacritics;

    const actionProfileKey = config?.unicodeAbuseActionProfileName ?? defaultActionProfileKey;

    let diacriticCount = 0;
    let baseCharCount = 0;

    for (const char of rawMessageContent) {
        if (/\p{M}/u.test(char)) {
            diacriticCount++;
        } else if (/\S/.test(char)) {
            baseCharCount++;
        }
    }

    if (baseCharCount === 0 && diacriticCount > 0) {
        if (diacriticCount >= absoluteMaxDiacritics || (maxDiacriticRatio <= 1.0 && diacriticCount > 0)) { // 1.0 is not magic
            const violationDetails = {
                messageSnippet: rawMessageContent.length > messageSnippetLimitUnicode ? `${rawMessageContent.substring(0, messageSnippetLimitUnicode - localEllipsisLengthUnicode) }...` : rawMessageContent,
                diacriticCount: diacriticCount.toString(),
                baseCharCount: baseCharCount.toString(),
                calculatedRatio: 'Infinity (or 1.0 if base is 0)',
                ratioThreshold: maxDiacriticRatio.toFixed(2),
                absoluteThreshold: absoluteMaxDiacritics.toString(),
                flagReason: 'only diacritics or excessive absolute count',
                originalMessage: rawMessageContent,
            };
            const profile = dependencies.checkActionProfiles?.[actionProfileKey];
            const shouldCancelMessage = profile?.cancelMessage;

            if (shouldCancelMessage) {
                eventData.cancel = true;
            }

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[UnicodeAbuseCheck] Flagged ${playerName} for Unicode abuse (only diacritics). Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, debugLogUnicodeSnippetLength)}...'`, watchedPlayerName, dependencies);
            return;
        }
    }
    if (baseCharCount === 0) {
        return;
    }

    const actualRatio = diacriticCount / baseCharCount;
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
        const messageSnippetLimit = 50; // This is okay as it's a const
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? `${rawMessageContent.substring(0, messageSnippetLimit - localEllipsisLengthUnicode) }...` : rawMessageContent,
            diacriticCount: diacriticCount.toString(),
            baseCharCount: baseCharCount.toString(),
            calculatedRatio: actualRatio.toFixed(2),
            ratioThreshold: maxDiacriticRatio.toFixed(2),
            absoluteThreshold: absoluteMaxDiacritics.toString(),
            flagReason: reason,
            originalMessage: rawMessageContent,
        };

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[UnicodeAbuseCheck] Flagged ${playerName} for Unicode abuse (${reason}). Ratio: ${actualRatio.toFixed(2)}, Diacritics: ${diacriticCount}. Msg: '${rawMessageContent.substring(0, debugLogUnicodeSnippetLength)}...'`, watchedPlayerName, dependencies);
    }
}
