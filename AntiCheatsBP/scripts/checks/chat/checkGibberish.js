/**
 * Implements a check to detect gibberish or keyboard-mashed messages.
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
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkGibberish(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    const enableGibberishCheck = config.enableGibberishCheck ?? false;
    if (!enableGibberishCheck) {
        return;
    }
    if (!pData) {
        playerUtils.debugLog("[GibberishCheck] pData is null, skipping check (though not strictly needed for this check's core logic).", dependencies, player.nameTag);
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

    let flagReason = [];
    if (actualVowelRatio < vowelRatioLowerBound && totalConsonants > 0) {
        flagReason.push("low vowel ratio");
    }
    if (actualVowelRatio > vowelRatioUpperBound && totalVowels > 0 && totalConsonants < totalVowels) {
        flagReason.push("high vowel ratio");
    }
    if (overallMaxConsecutiveConsonants >= maxConsecutiveConsonants) {
        flagReason.push("excessive consecutive consonants");
    }

    if (flagReason.length > 0) {
        const violationDetails = {
            messageSnippet: rawMessageContent.substring(0, 50),
            vowelRatio: actualVowelRatio.toFixed(2),
            alphaToTotalRatio: actualAlphaRatio.toFixed(2),
            maxConsecutiveConsonantsFound: overallMaxConsecutiveConsonants.toString(),
            triggerReasons: flagReason.join(', ')
        };

        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
        playerUtils.debugLog(`[GibberishCheck] Flagged ${player.nameTag} for ${flagReason.join(', ')}. Msg: "${rawMessageContent.substring(0,20)}..."`, pData?.isWatched ? player.nameTag : null, dependencies);
    }
}
