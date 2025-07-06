/**
 * @file Implements a check to detect gibberish or keyboard-mashed messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a message for gibberish patterns based on character ratios and consecutive consonants.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {Dependencies} dependencies - Shared command dependencies.
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

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[GibberishCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 10;
    const defaultMinAlphaRatio = 0.6; // Minimum ratio of alphabetic characters for the check to apply
    const defaultVowelRatioLowerBound = 0.15;
    const defaultVowelRatioUpperBound = 0.80; // Avoid flagging messages with too many vowels (e.g. "aaaaaa")
    const defaultMaxConsecutiveConsonants = 5;
    const defaultActionProfileKey = 'chatGibberish'; // Already camelCase

    const minMessageLength = config?.gibberishMinMessageLength ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const minAlphaRatio = config?.gibberishMinAlphaRatio ?? defaultMinAlphaRatio;
    const vowelRatioLowerBound = config?.gibberishVowelRatioLowerBound ?? defaultVowelRatioLowerBound;
    const vowelRatioUpperBound = config?.gibberishVowelRatioUpperBound ?? defaultVowelRatioUpperBound;
    const maxConsecutiveConsonants = config?.gibberishMaxConsecutiveConsonants ?? defaultMaxConsecutiveConsonants;

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.gibberishActionProfileName ?? defaultActionProfileKey;
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    // Normalize message: lowercase and remove common punctuation that might affect ratios.
    // Keep spaces to distinguish words for more advanced checks if needed, but current logic doesn't use them.
    const cleanedMessage = rawMessageContent.toLowerCase().replace(/[.,!?()"';:{}\[\]<>~`^\\]/g, '');

    let totalAlphaChars = 0;
    let totalNonSpaceCharsInCleaned = 0; // Count non-space characters in the *cleaned* message
    let totalVowels = 0;
    let totalConsonants = 0;
    let currentConsecutiveConsonants = 0;
    let overallMaxConsecutiveConsonants = 0;
    const vowels = 'aeiou'; // Simple vowel set

    for (const char of cleanedMessage) {
        if (char !== ' ') {
            totalNonSpaceCharsInCleaned++;
        }
        if (char >= 'a' && char <= 'z') { // Check if it's an alphabet character
            totalAlphaChars++;
            if (vowels.includes(char)) {
                totalVowels++;
                currentConsecutiveConsonants = 0; // Reset consonant streak
            } else {
                totalConsonants++;
                currentConsecutiveConsonants++;
                if (currentConsecutiveConsonants > overallMaxConsecutiveConsonants) {
                    overallMaxConsecutiveConsonants = currentConsecutiveConsonants;
                }
            }
        } else {
            // If it's not an alphabet char (e.g. space, number, symbol not cleaned above), reset consonant streak
            currentConsecutiveConsonants = 0;
        }
    }

    // If no relevant characters after cleaning (e.g., message was only punctuation and spaces), exit.
    if (totalNonSpaceCharsInCleaned === 0 || totalAlphaChars === 0) {
        return;
    }

    // Calculate ratio of alphabetic characters to total non-space characters in the cleaned message.
    // This helps filter out messages that are mostly symbols/numbers, which might be handled by other checks (like SymbolSpam).
    const actualAlphaRatio = totalAlphaChars / totalNonSpaceCharsInCleaned;
    if (actualAlphaRatio < minAlphaRatio) {
        playerUtils?.debugLog(`[GibberishCheck] Message for ${playerName} has low alpha ratio (${actualAlphaRatio.toFixed(2)} < ${minAlphaRatio}). Skipping gibberish vowel/consonant checks.`, watchedPlayerName, dependencies);
        return;
    }

    // Calculate vowel ratio based only on alphabetic characters.
    const totalAlphaForVowelRatio = totalVowels + totalConsonants; // This should equal totalAlphaChars
    if (totalAlphaForVowelRatio === 0) { // Should not happen if actualAlphaRatio >= minAlphaRatio and minAlphaRatio > 0
        return;
    }
    const actualVowelRatio = totalVowels / totalAlphaForVowelRatio;

    const flagReasons = [];
    // Low vowel ratio: too few vowels relative to consonants (e.g., "rhythm", "strength", but also "qwrtpsdfg")
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > totalVowels) { // Ensure there are more consonants than vowels to avoid flagging single-vowel words
        flagReasons.push(`low vowel ratio (${actualVowelRatio.toFixed(2)} < ${vowelRatioLowerBound})`);
    }
    // High vowel ratio: too many vowels relative to consonants (e.g., "aeiouaeiou", but also common in some languages if not handled)
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > totalConsonants) { // Ensure more vowels than consonants
        flagReasons.push(`high vowel ratio (${actualVowelRatio.toFixed(2)} > ${vowelRatioUpperBound})`);
    }
    // Excessive consecutive consonants
    if (overallMaxConsecutiveConsonants >= maxConsecutiveConsonants) {
        flagReasons.push(`max consecutive consonants (${overallMaxConsecutiveConsonants} >= ${maxConsecutiveConsonants})`);
    }

    if (flagReasons.length > 0) {
        const messageSnippetLimit = 50;
        const violationDetails = {
            messageSnippet: rawMessageContent.length > messageSnippetLimit ? rawMessageContent.substring(0, messageSnippetLimit - 3) + '...' : rawMessageContent,
            vowelRatio: actualVowelRatio.toFixed(2),
            alphaRatio: actualAlphaRatio.toFixed(2),
            maxConsecutiveConsonantsFound: overallMaxConsecutiveConsonants.toString(),
            triggerReasons: flagReasons.join('; '), // Use semicolon for better readability if multiple reasons
            originalMessage: rawMessageContent,
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[GibberishCheck] Flagged ${playerName} for ${flagReasons.join('; ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, watchedPlayerName, dependencies);

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
