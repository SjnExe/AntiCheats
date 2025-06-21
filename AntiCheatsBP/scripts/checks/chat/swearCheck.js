/**
 * @file AntiCheatsBP/scripts/checks/chat/swearCheck.js
 * Implements swear word detection in chat messages with obfuscation resistance
 * using exact normalized matching.
 * @version 1.1.2
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Normalizes a word for swear checking, including leet speak conversion and character collapsing.
 * @param {string} word The word to normalize.
 * @param {Config} config The server configuration object.
 * @returns {string} The normalized word.
 */
function normalizeWordForSwearCheck(word, config) {
    if (typeof word !== 'string' || word.trim() === '') {
        return '';
    }
    let normalized = word.toLowerCase();

    // Remove common ignored characters (spaces, dots, underscores, hyphens)
    normalized = normalized.replace(/[\s._-]+/g, '');
    if (!normalized) return ''; // Return if empty after removing ignored chars
    // Collapse sequences of identical characters to a single character (e.g., "heelloo" -> "helo")
    normalized = normalized.replace(/(.)\1+/g, '$1');
    if (!normalized) return '';
    if (config.swearCheckEnableLeetSpeak) {
        const leetMap = config.swearCheckLeetSpeakMap || {
            '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
            'ph': 'f', // common multi-char, handle before single char collapse if needed, but current regex doesn't support this directly.
                       // For simplicity, this map handles single char leet. More complex leet (e.g. 'ph'->'f') would require more advanced replacement.
        };

        let leetConverted = "";
        for (const char of normalized) {
            leetConverted += leetMap[char] || char;
        }
        normalized = leetConverted;
        // Collapse repeated characters again after leet conversion (e.g., "s$$" -> "s" -> "s")
        normalized = normalized.replace(/(.)\1+/g, '$1');
        if (!normalized) return '';
    }
    return normalized;
}
/**
 * Checks a chat message for swear words based on a configurable list,
 * using normalization and optionally leet speak conversion for matching.
 *
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {PlayerAntiCheatData} pData Player-specific data from playerDataManager.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {CommandDependencies} dependenciesFull Full dependencies object.
 * @returns {Promise<boolean>} True if a violation is detected and action taken, false otherwise.
 */
export async function checkSwear(player, eventData, pData, dependenciesFull) { // Standardized signature
    const { config, playerUtils, actionManager, playerDataManager } = dependenciesFull; // Destructure from dependenciesFull

    if (!config.enableSwearCheck) {
        return false;
    }
    const originalMessage = eventData.message;
    if (!config.swearWordList || config.swearWordList.length === 0) {
        playerUtils.debugLog(`[SwearCheck] Skipped for ${player.nameTag} as swearWordList is empty or undefined.`, pData.isWatched ? player.nameTag : null, dependenciesFull);
        return false;
    }

    const normalizedSwearWordList = config.swearWordList
        .map(sw => ({
            original: sw,
            normalized: normalizeWordForSwearCheck(sw, config) // Pass config from dependenciesFull
        }))
        .filter(item => item.normalized.length > 0);

    if (normalizedSwearWordList.length === 0) {
        playerUtils.debugLog(`[SwearCheck] Skipped for ${player.nameTag} as normalizedSwearWordList is empty.`, pData.isWatched ? player.nameTag : null, dependenciesFull);
        return false;
    }

    const wordsInMessage = originalMessage.split(/\s+/);
    const actionProfileName = config.swearCheckActionProfileName || "chatSwearViolation";
    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') continue;
        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config); // Pass config from dependenciesFull
        if (normalizedInputWord.length === 0) continue;
        for (const swearItem of normalizedSwearWordList) {
            // Exact Normalized Match
            if (normalizedInputWord === swearItem.normalized) {
                const violationDetails = {
                    detectedSwear: swearItem.original,
                    matchedWordInMessage: wordInMessage,
                    normalizedInput: normalizedInputWord,
                    normalizedSwear: swearItem.normalized,
                    matchMethod: "exact_normalized",
                    originalMessage: originalMessage,
                };
                playerUtils.debugLog(`[SwearCheck] ${player.nameTag} triggered swear check. Word: "${wordInMessage}" (normalized: "${normalizedInputWord}") matched "${swearItem.original}" (normalized: "${swearItem.normalized}") by exact_normalized.`, pData.isWatched ? player.nameTag : null, dependenciesFull);

                if (actionManager && typeof actionManager.executeCheckAction === 'function') {
                     await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependenciesFull);
                } else {
                    playerUtils.debugLog("[SwearCheck] actionManager.executeCheckAction is not available in dependencies.", null, dependenciesFull);
                     // Fallback to direct flagging if actionManager is not set up as expected in dependencies
                     if (playerDataManager && playerDataManager.addFlag) {
                         playerDataManager.addFlag(player, actionProfileName, `Swear word detected: ${swearItem.original} (matched: ${wordInMessage})`, violationDetails, dependenciesFull); // Pass full dependencies to addFlag
                     }
                }
                return true; // Violation detected and handled
            }
        }
    }
    return false; // No swear words found
}
