/**
 * @file Detects gibberish or keyboard-mashed messages.
 * @module AntiCheatsBP/scripts/checks/chat/checkGibberish
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const localEllipsisLength = 3;
const debugLogGibberishSnippetLength = 20;

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
    const playerName = player?.name ?? 'UnknownPlayer';

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
    const nonSpaceCleaned = cleanedMessage.replace(/\s/g, '');

    const alphaChars = nonSpaceCleaned.match(/[a-z]/g) || [];
    const totalAlphaChars = alphaChars.length;

    if (totalAlphaChars === 0) {
        return;
    }

    const actualAlphaRatio = totalAlphaChars / nonSpaceCleaned.length;
    if (actualAlphaRatio < minAlphaRatio) {
        playerUtils?.debugLog(`[GibberishCheck] Message for ${playerName} has low alpha ratio (${actualAlphaRatio.toFixed(2)} < ${minAlphaRatio}). Skipping gibberish checks.`, watchedPlayerName, dependencies);
        return;
    }

    const totalVowels = (nonSpaceCleaned.match(/[aeiou]/g) || []).length;
    const totalConsonants = totalAlphaChars - totalVowels;
    const actualVowelRatio = totalVowels / totalAlphaChars;

    const consonantSequences = cleanedMessage.match(/[^aeiou\s]{1,}/g) || [];
    const overallMaxConsecutiveConsonants = consonantSequences.reduce((max, seq) => Math.max(max, seq.length), 0);

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
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? `${rawMessageContent.substring(0, messageSnippetLimit - localEllipsisLength) }...` : rawMessageContent,
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
        playerUtils?.debugLog(`[GibberishCheck] Flagged ${playerName} for ${flagReasons.join('; ')}. Msg: '${rawMessageContent.substring(0, debugLogGibberishSnippetLength)}...'`, watchedPlayerName, dependencies);
    }
}
