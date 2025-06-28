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

    const enableCheck = config.enableGibberishCheck ?? false;
    if (!enableCheck) {
        return;
    }

    if (!pData && config.enableDebugLogging) {
        playerUtils.debugLog('[GibberishCheck] pData is null. Watched player status might be unavailable for logging.', player.nameTag, dependencies);
    }

    const minMessageLength = config.gibberishMinMessageLength ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const minAlphaRatio = config.gibberishMinAlphaRatio ?? 0.6;
    const vowelRatioLowerBound = config.gibberishVowelRatioLowerBound ?? 0.15;
    const vowelRatioUpperBound = config.gibberishVowelRatioUpperBound ?? 0.80;
    const maxConsecutiveConsonants = config.gibberishMaxConsecutiveConsonants ?? 5;
    const actionProfileKey = config.gibberishActionProfileName ?? 'chatGibberish'; // Standardized key
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
                currentConsecutiveConsonants = 0; // Reset consonant counter
            } else {
                totalConsonants++;
                currentConsecutiveConsonants++;
                if (currentConsecutiveConsonants > overallMaxConsecutiveConsonants) {
                    overallMaxConsecutiveConsonants = currentConsecutiveConsonants;
                }
            }
        } else { // Not a letter (e.g., space, number, symbol after initial clean)
            currentConsecutiveConsonants = 0;
        }
    }

    if (totalNonSpaceChars === 0 || totalAlphaChars === 0) {
        return; // Avoid division by zero if message is all spaces or no letters
    }

    const actualAlphaRatio = totalAlphaChars / totalNonSpaceChars;
    if (actualAlphaRatio < minAlphaRatio) {
        // Message doesn't have enough alphabetic characters to be considered for gibberish based on vowel/consonant ratios
        return;
    }

    if ((totalVowels + totalConsonants) === 0) {
        return; // Avoid division by zero if no vowels or consonants (e.g., message of only 'hmmm')
    }
    const actualVowelRatio = totalVowels / (totalVowels + totalConsonants);

    const flagReasons = []; // Use plural for clarity
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > 0) { // Ensure there are consonants before flagging low vowel ratio
        flagReasons.push('low vowel ratio');
    }
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > 0 && totalConsonants < totalVowels) { // Ensure there are vowels and fewer consonants for high vowel ratio
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

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[GibberishCheck] Flagged ${player.nameTag} for ${flagReasons.join(', ')}. Msg: '${rawMessageContent.substring(0, 20)}...'`, pData?.isWatched ? player.nameTag : null, dependencies);

        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
