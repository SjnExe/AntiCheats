/**
 * @file Implements swear word detection in chat messages with obfuscation resistance
 * using exact normalized matching.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Normalizes a word for swear checking. This includes:
 * - Converting to lowercase.
 * - Removing common separators (space, dot, underscore, hyphen).
 * - Collapsing consecutive identical characters to a single character (e.g., "heelloo" -> "helo").
 * - Optionally applying leet speak conversion based on `config.swearCheckLeetSpeakMap`.
 * - Collapsing characters again after leet speak.
 *
 * @param {string} word - The word to normalize.
 * @param {Config} config - The server configuration object, used for leet speak settings.
 * @returns {string} The normalized word, or an empty string if the input is invalid or results in empty after normalization.
 */
function normalizeWordForSwearCheck(word, config) {
    if (typeof word !== 'string' || word.trim() === '') {
        return '';
    }
    let normalized = word.toLowerCase();

    // Remove common separators
    normalized = normalized.replace(/[\s._-]+/g, '');
    if (!normalized) return ''; // If empty after removing separators

    // Collapse repeated characters (e.g., heelloo -> helo)
    normalized = normalized.replace(/(.)\1+/g, '$1');
    if (!normalized) return ''; // Should not happen if already non-empty, but safe check

    if (config.swearCheckEnableLeetSpeak) {
        const leetMap = config.swearCheckLeetSpeakMap || {
            '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
            // 'ph': 'f', // Multi-character leets are harder with simple char-by-char loop.
                       // Consider pre-processing for multi-char leets if needed.
        };

        let leetChars = Array.from(normalized);
        for (let i = 0; i < leetChars.length; i++) {
            // Example for 'ph' -> 'f' (can be expanded or made more robust)
            // This simple version doesn't handle overlapping multi-char patterns well.
            if (leetChars[i] === 'p' && i + 1 < leetChars.length && leetChars[i + 1] === 'h' && leetMap['ph'] === 'f') {
                leetChars.splice(i, 2, 'f');
                // Note: Modifying array while iterating needs care. Here, we assume 'f' isn't in leetMap keys
                // or that the loop structure handles it. For more complex cases, regex replacement before this loop is better.
            } else {
                leetChars[i] = leetMap[leetChars[i]] || leetChars[i];
            }
        }
        normalized = leetChars.join('');

        // Collapse repeated characters again after leet speak conversion
        normalized = normalized.replace(/(.)\1+/g, '$1');
        if (!normalized) return '';
    }
    return normalized;
}

/**
 * Checks a chat message for swear words based on a configurable list,
 * using normalization and optionally leet speak conversion for matching.
 * If a swear word is detected, it triggers an action profile and may cancel the message.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player-specific data from playerDataManager.
 * @param {CommandDependencies} dependencies - Full dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSwear(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager, playerDataManager } = dependencies;

    if (!config.enableSwearCheck) {
        return;
    }
    const originalMessage = eventData.message;
    if (!config.swearWordList || config.swearWordList.length === 0) {
        playerUtils.debugLog(`[SwearCheck] Skipped for ${player.nameTag} as swearWordList is empty or undefined.`, pData?.isWatched ? player.nameTag : null, dependencies);
        return;
    }

    // Normalize the configured swear word list once (or cache it if this function is called very frequently per message)
    // For now, normalizing on each call for simplicity, assuming swearWordList isn't excessively large.
    const normalizedSwearWordList = config.swearWordList
        .map(sw => ({
            original: sw,
            normalized: normalizeWordForSwearCheck(sw, config),
        }))
        .filter(item => item.normalized.length > 0); // Filter out any swear words that become empty after normalization

    if (normalizedSwearWordList.length === 0) {
        playerUtils.debugLog(`[SwearCheck] Skipped for ${player.nameTag} as normalizedSwearWordList is empty (all configured swears were invalid or became empty).`, pData?.isWatched ? player.nameTag : null, dependencies);
        return;
    }

    const wordsInMessage = originalMessage.split(/\s+/); // Split message into words
    const actionProfileKey = config.swearCheckActionProfileName ?? 'chatSwearViolation'; // Standardized key

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') continue; // Skip empty strings from multiple spaces

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config);
        if (normalizedInputWord.length === 0) continue; // Skip if word becomes empty after normalization

        for (const swearItem of normalizedSwearWordList) {
            if (normalizedInputWord === swearItem.normalized) {
                const violationDetails = {
                    detectedSwear: swearItem.original, // The original swear word from config
                    matchedWordInMessage: wordInMessage, // The actual word from player's message
                    normalizedInput: normalizedInputWord,
                    normalizedSwear: swearItem.normalized,
                    matchMethod: 'exact_normalized',
                    originalMessage: originalMessage, // Full original message for context
                };
                playerUtils.debugLog(`[SwearCheck] ${player.nameTag} triggered swear check. Word: '${wordInMessage}' (normalized: '${normalizedInputWord}') matched '${swearItem.original}' (normalized: '${swearItem.normalized}') by exact_normalized.`, pData?.isWatched ? player.nameTag : null, dependencies);

                if (actionManager && typeof actionManager.executeCheckAction === 'function') {
                    await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
                } else {
                    playerUtils.debugLog('[SwearCheck] actionManager.executeCheckAction is not available in dependencies. Attempting direct flag.', null, dependencies);
                    // Fallback to direct flagging if actionManager is somehow missing (should not happen in normal operation)
                    if (playerDataManager && playerDataManager.addFlag) {
                        playerDataManager.addFlag(player, actionProfileKey, `Swear word detected: ${swearItem.original} (matched: ${wordInMessage})`, violationDetails, dependencies);
                    }
                }
                // Message cancellation should be handled by the action profile if configured
                if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Violation detected, further processing in this loop is not needed.
            }
        }
    }
    // No violation detected if loop completes
}
