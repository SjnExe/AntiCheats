/**
 * @file Detects gibberish or keyboard-mashed messages.
 * @module AntiCheatsBP/scripts/checks/chat/checkGibberish
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const LOCAL_ELLIPSIS_LENGTH = 3;
const DEBUG_LOG_GIBBERISH_SNIPPET_LENGTH = 20;

/**
 * Checks a message for gibberish patterns.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkGibberish(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const enableCheck = config?.enableGibberishCheck ?? false;
    if (!enableCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[GibberishCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 10;
    const defaultMinAlphaRatio = 0.6;
    const defaultVowelRatioLowerBound = 0.15;
    const defaultVowelRatioUpperBound = 0.80;
    const defaultMaxConsecutiveConsonants = 5;
    const defaultActionProfileKey = 'chatGibberish';

    const minMessageLength = config?.gibberishMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const minAlphaRatio = config?.gibberishMinAlphaRatio ?? defaultMinAlphaRatio;
    const vowelRatioLowerBound = config?.gibberishVowelRatioLowerBound ?? defaultVowelRatioLowerBound;
    const vowelRatioUpperBound = config?.gibberishVowelRatioUpperBound ?? defaultVowelRatioUpperBound;
    const maxConsecutiveConsonants = config?.gibberishMaxConsecutiveConsonants ?? defaultMaxConsecutiveConsonants;

    const actionProfileKey = config?.gibberishActionProfileName ?? defaultActionProfileKey;

    const cleanedMessage = rawMessageContent.toLowerCase().replace(/[.,!?()"';:{}[\]<>~`^\\]/g, '');

    let totalAlphaChars = 0;
    let totalNonSpaceCharsInCleaned = 0;
    let totalVowels = 0;
    let totalConsonants = 0;
    let currentConsecutiveConsonants = 0;
    let overallMaxConsecutiveConsonants = 0;
    const vowels = 'aeiou';

    for (const char of cleanedMessage) {
        if (char !== ' ') {
            totalNonSpaceCharsInCleaned++;
        }
        if (char >= 'a' && char <= 'z') {
            totalAlphaChars++;
            if (vowels.includes(char)) {
                totalVowels++;
                currentConsecutiveConsonants = 0;
            } else {
                totalConsonants++;
                currentConsecutiveConsonants++;
                if (currentConsecutiveConsonants > overallMaxConsecutiveConsonants) {
                    overallMaxConsecutiveConsonants = currentConsecutiveConsonants;
                }
            }
        } else {
            currentConsecutiveConsonants = 0;
        }
    }

    if (totalNonSpaceCharsInCleaned === 0 || totalAlphaChars === 0) {
        return;
    }

    const actualAlphaRatio = totalAlphaChars / totalNonSpaceCharsInCleaned;
    if (actualAlphaRatio < minAlphaRatio) {
        playerUtils?.debugLog(`[GibberishCheck] Message for ${playerName} has low alpha ratio (${actualAlphaRatio.toFixed(2)} < ${minAlphaRatio}). Skipping gibberish vowel/consonant checks.`, watchedPlayerName, dependencies);
        return;
    }

    const totalAlphaForVowelRatio = totalVowels + totalConsonants;
    if (totalAlphaForVowelRatio === 0) {
        return;
    }
    const actualVowelRatio = totalVowels / totalAlphaForVowelRatio;

    const flagReasons = [];
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > totalVowels) {
        flagReasons.push(`low vowel ratio (${actualVowelRatio.toFixed(2)} < ${vowelRatioLowerBound})`);
    }
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > totalConsonants) {
        flagReasons.push(`high vowel ratio (${actualVowelRatio.toFixed(2)} > ${vowelRatioUpperBound})`);
    }
    if (overallMaxConsecutiveConsonants >= maxConsecutiveConsonants) {
        flagReasons.push(`max consecutive consonants (${overallMaxConsecutiveConsonants} >= ${maxConsecutiveConsonants})`);
    }

    if (flagReasons.length > 0) {
        const messageSnippetLimit = 50; // This is a local const, might be better at top or from config if shared
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? `${rawMessageContent.substring(0, messageSnippetLimit - LOCAL_ELLIPSIS_LENGTH) }...` : rawMessageContent,
            vowelRatio: actualVowelRatio.toFixed(2),
            alphaRatio: actualAlphaRatio.toFixed(2),
            maxConsecutiveConsonantsFound: overallMaxConsecutiveConsonants.toString(),
            triggerReasons: flagReasons.join('; '),
            originalMessage: rawMessageContent,
        };

        // Determine if message should be cancelled before awaiting actionManager
        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[GibberishCheck] Flagged ${playerName} for ${flagReasons.join('; ')}. Msg: '${rawMessageContent.substring(0, DEBUG_LOG_GIBBERISH_SNIPPET_LENGTH)}...'`, watchedPlayerName, dependencies);
    }
}
