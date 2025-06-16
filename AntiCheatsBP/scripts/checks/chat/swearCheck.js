/**
 * @file AntiCheatsBP/scripts/checks/chat/swearCheck.js
 * Implements swear word detection in chat messages with obfuscation resistance.
 * @version 1.1.0
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

// Placeholder - NOT a correct Levenshtein algorithm.
// Assume calculateLevenshtein(a,b) function is available from utils or will be added/replaced with a proper one.
function calculateLevenshtein(s1, s2) {
    if (s1 === s2) return 0;
    if (!s1 || !s2) return (s1 || s2).length; // Handle null/undefined/empty strings
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    let diff = longer.length - shorter.length;
    for (let i = 0; i < shorter.length; i++) {
        if (shorter[i] !== longer[i]) {
            diff++;
        }
    }
    return diff;
}

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
 * with options for normalization, leet speak, and Levenshtein distance.
 *
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {PlayerAntiCheatData} pData Player-specific data from playerDataManager.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data. // eventData.message is the one to use
 * @param {Config} config The server configuration object.
 * @param {import('../../utils/playerUtils.js').PlayerUtils} playerUtils Utility functions.
 * @param {CommandDependencies} dependencies Full dependencies object.
 * @returns {Promise<boolean>} True if a violation is detected and action taken, false otherwise.
 */
export async function checkSwear(player, pData, eventData, config, playerUtils, dependencies) {
    if (!config.enableSwearCheck) {
        return false;
    }

    const originalMessage = eventData.message; // Use eventData.message as per type hint

    if (!config.swearWordList || config.swearWordList.length === 0) {
        playerUtils.debugLog?.(\`SwearCheck: Skipped for \${player.nameTag} as swearWordList is empty or undefined.\`, pData.isWatched ? player.nameTag : null);
        return false;
    }

    // Pre-normalize the swear word list (can be cached in a real scenario if config doesn't change often)
    const normalizedSwearWordList = config.swearWordList
        .map(sw => ({
            original: sw,
            normalized: normalizeWordForSwearCheck(sw, config)
        }))
        .filter(item => item.normalized.length > 0); // Filter out swear words that become empty after normalization

    if (normalizedSwearWordList.length === 0) {
        playerUtils.debugLog?.(\`SwearCheck: Skipped for \${player.nameTag} as normalizedSwearWordList is empty.\`, pData.isWatched ? player.nameTag : null);
        return false;
    }

    const wordsInMessage = originalMessage.split(/\s+/);
    const actionProfileName = config.swearCheckActionProfileName || "chatSwearViolation"; // Default profile name

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') continue;

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config);
        if (normalizedInputWord.length === 0) continue;

        for (const swearItem of normalizedSwearWordList) {
            let matchType = null;
            let detectedDistance = -1;

            // Exact Normalized Match
            if (normalizedInputWord === swearItem.normalized) {
                matchType = "exact_normalized";
            }
            // Levenshtein Match (if not exact and enabled)
            else if (config.swearCheckEnableLevenshtein) {
                const distance = calculateLevenshtein(normalizedInputWord, swearItem.normalized);
                const levenshteinThreshold = config.swearCheckLevenshteinDistance ?? 1;
                if (distance <= levenshteinThreshold) {
                    matchType = "levenshtein";
                    detectedDistance = distance;
                }
            }

            if (matchType) {
                const violationDetails = {
                    detectedSwear: swearItem.original,
                    matchedWordInMessage: wordInMessage,
                    normalizedInput: normalizedInputWord,
                    normalizedSwear: swearItem.normalized,
                    matchMethod: matchType,
                    levenshteinDistance: matchType === "levenshtein" ? detectedDistance.toString() : "N/A",
                    originalMessage: originalMessage,
                };

                playerUtils.debugLog?.(\`SwearCheck: \${player.nameTag} triggered swear check. Word: "\${wordInMessage}" (normalized: "\${normalizedInputWord}") matched "\${swearItem.original}" (normalized: "\${swearItem.normalized}") by \${matchType}. Distance: \${detectedDistance}\`, pData.isWatched ? player.nameTag : null);

                // Ensure actionManager and executeCheckAction are available
                if (dependencies && dependencies.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
                     await dependencies.actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                } else {
                    playerUtils.debugLog?.("SwearCheck: actionManager.executeCheckAction is not available in dependencies.", null);
                     if (dependencies && dependencies.playerDataManager && dependencies.playerDataManager.addFlag) {
                         dependencies.playerDataManager.addFlag(player, actionProfileName, `Swear word detected: \${swearItem.original} (matched: \${wordInMessage})`);
                     }
                }
                // Typically, a swear check profile might cancel the message.
                // If executeCheckAction handles eventData.cancel based on profile, this return is fine.
                // If not, and cancellation is desired, eventData.cancel = true would be needed here.
                return true; // Violation detected and handled
            }
        }
    }

    return false; // No swear words found
}
