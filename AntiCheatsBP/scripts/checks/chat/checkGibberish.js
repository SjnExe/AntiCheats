/**
 * @file AntiCheatsBP/scripts/checks/chat/checkGibberish.js
 * Implements a check to detect gibberish or keyboard-mashed messages.
 * @version 1.0.0
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks a message for gibberish patterns.
 * @param {import('@minecraft/server').Player} player
 * @param {PlayerAntiCheatData} pData
 * @param {string} rawMessageContent
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkGibberish(player, pData, rawMessageContent, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const enableGibberishCheck = config.enableGibberishCheck ?? false;
    if (!enableGibberishCheck) {
        return;
    }
    if (!pData) {
        playerUtils.debugLog?.("GibberishCheck: pData is null, skipping check.", player.nameTag);
        return;
    }
    const minMessageLength = config.gibberishMinMessageLength ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }
    const minAlphaRatio = config.gibberishMinAlphaRatio ?? 0.6;
    const vowelRatioLowerBound = config.gibberishVowelRatioLowerBound ?? 0.15;
    const vowelRatioUpperBound = config.gibberishVowelRatioUpperBound ?? 0.80;
    const maxConsecutiveConsonants = config.gibberishMaxConsecutiveConsonants ?? 5;
    const actionProfileName = config.gibberishActionProfileName ?? "chatGibberish";
    const cleanedMessage = rawMessageContent.toLowerCase().replace(/[.,!?]/g, '');

    let totalAlphaChars = 0;
    let totalNonSpaceChars = 0;
    let totalVowels = 0;
    let totalConsonants = 0;
    let currentConsecutiveConsonants = 0;
    let overallMaxConsecutiveConsonants = 0;
    const vowels = "aeiou";
    for (const char of cleanedMessage) {
        if (char !== ' ') {
            totalNonSpaceChars++;
        }
        if (char >= 'a' && char <= 'z') { // Basic check for English alphabet
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
            // Reset for non-alpha characters (like spaces, numbers, other symbols not stripped by initial replace)
            currentConsecutiveConsonants = 0;
        }
    }
    if (totalNonSpaceChars === 0 || totalAlphaChars === 0) {
        // Message is empty, all spaces, or no alphabetic characters
        return;
    }
    const actualAlphaRatio = totalAlphaChars / totalNonSpaceChars;
    if (actualAlphaRatio < minAlphaRatio) {
        // Not enough alphabetic content to be considered for gibberish based on vowel/consonant patterns
        return;
    }
    // Vowel ratio calculation should only use actual alphabetic characters
    if ((totalVowels + totalConsonants) === 0) {
        // This case should ideally be caught by actualAlphaRatio < minAlphaRatio if minAlphaRatio > 0
        // and totalAlphaChars > 0. However, as a safeguard:
        return;
    }
    const actualVowelRatio = totalVowels / (totalVowels + totalConsonants); // Ratio within alphabetic characters
    let flagReason = [];
    // Only flag for low vowel ratio if there are consonants to compare against.
    // A message of "aeiouaeiou" has 1.0 vowel ratio but isn't necessarily "low vowel ratio" gibberish.
    // It might be caught by "high vowel ratio" or other checks like repetition.
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > 0) {
        flagReason.push("low vowel ratio");
    }
    // Only flag for high vowel ratio if there are vowels to compare against.
    // A message of "rhythm" has 0.0 vowel ratio but isn't "high vowel ratio" gibberish.
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > 0 && totalConsonants < totalVowels) { // Added totalConsonants < totalVowels to make high vowel ratio more meaningful
        flagReason.push("high vowel ratio");
    }
    if (overallMaxConsecutiveConsonants >= maxConsecutiveConsonants) {
        flagReason.push("excessive consecutive consonants");
    }
    if (flagReason.length > 0) {
        const violationDetails = {
            messageSnippet: rawMessageContent.substring(0, 50),
            vowelRatio: actualVowelRatio.toFixed(2),
            alphaToTotalRatio: actualAlphaRatio.toFixed(2), // Ratio of alpha chars to non-space chars
            maxConsecutiveConsonantsFound: overallMaxConsecutiveConsonants.toString(),
            triggerReasons: flagReason.join(', ')
        };

        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
        playerUtils.debugLog?.(\`GibberishCheck: Flagged \${player.nameTag} for \${flagReason.join(', ')}. Msg: "\${rawMessageContent.substring(0,20)}..."\`, pData.isWatched ? player.nameTag : null);
    }
}
