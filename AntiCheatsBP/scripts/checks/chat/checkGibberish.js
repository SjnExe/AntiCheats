/**
 * @file Implements a check to detect gibberish or keyboard-mashed messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a message for gibberish patterns based on character ratios and consecutive consonants.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {CommandDependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkGibberish(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const enableCheck = config?.enableGibberishCheck ?? false;
    if (!enableCheck) {
        return;
    }

    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[GibberishCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, playerName, dependencies);
    }

    const DEFAULT_MIN_MESSAGE_LENGTH = 10;
    const DEFAULT_MIN_ALPHA_RATIO = 0.6;
    const DEFAULT_VOWEL_RATIO_LOWER_BOUND = 0.15;
    const DEFAULT_VOWEL_RATIO_UPPER_BOUND = 0.80;
    const DEFAULT_MAX_CONSECUTIVE_CONSONANTS = 5;
    const DEFAULT_ACTION_PROFILE_KEY = 'chatGibberish';

    const minMessageLength = config?.gibberishMinMessageLength ?? DEFAULT_MIN_MESSAGE_LENGTH;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const minAlphaRatio = config?.gibberishMinAlphaRatio ?? DEFAULT_MIN_ALPHA_RATIO;
    const vowelRatioLowerBound = config?.gibberishVowelRatioLowerBound ?? DEFAULT_VOWEL_RATIO_LOWER_BOUND;
    const vowelRatioUpperBound = config?.gibberishVowelRatioUpperBound ?? DEFAULT_VOWEL_RATIO_UPPER_BOUND;
    const maxConsecutiveConsonants = config?.gibberishMaxConsecutiveConsonants ?? DEFAULT_MAX_CONSECUTIVE_CONSONANTS;

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.gibberishActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? DEFAULT_ACTION_PROFILE_KEY;

    const cleanedMessage = rawMessageContent.toLowerCase().replace(/[.,!?]/g, ''); // Remove common punctuation

    let totalAlphaChars = 0;
    let totalNonSpaceChars = 0;
    let totalVowels = 0;
    let totalConsonants = 0;
    let currentConsecutiveConsonants = 0;
    let overallMaxConsecutiveConsonants = 0;
    const vowels = 'aeiou';

    for (const char of cleanedMessage) {
        if (char !== ' ') {
            totalNonSpaceChars++;
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

    if (totalNonSpaceChars === 0 || totalAlphaChars === 0) {
        return;
    }

    const actualAlphaRatio = totalAlphaChars / totalNonSpaceChars;
    if (actualAlphaRatio < minAlphaRatio) {
        return;
    }

    if ((totalVowels + totalConsonants) === 0) {
        return;
    }
    const actualVowelRatio = totalVowels / (totalVowels + totalConsonants);

    const flagReasons = [];
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > 0) {
        flagReasons.push('low vowel ratio');
    }
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > 0 && totalConsonants < totalVowels) {
        flagReasons.push('high vowel ratio');
    }
    if (overallMaxConsecutiveConsonants >= maxConsecutiveConsonants) {
        flagReasons.push('excessive consecutive consonants');
    }

    if (flagReasons.length > 0) {
        const violationDetails = {
            messageSnippet: rawMessageContent.length > 50 ? rawMessageContent.substring(0, 47) + '...' : rawMessageContent,
            vowelRatio: actualVowelRatio.toFixed(2),
            alphaToTotalRatio: actualAlphaRatio.toFixed(2),
            maxConsecutiveConsonantsFound: overallMaxConsecutiveConsonants.toString(),
            triggerReasons: flagReasons.join(', '),
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[GibberishCheck] Flagged ${playerName} for ${flagReasons.join(', ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? playerName : null, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
