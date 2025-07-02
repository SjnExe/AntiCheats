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
 * - Collapsing consecutive identical characters to a single character (e.g., 'heelloo' -> 'helo').
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

    normalized = normalized.replace(/[\s._-]+/g, '');
    if (!normalized) {
        return '';
    }

    normalized = normalized.replace(/(.)\1+/g, '$1');
    if (!normalized) {
        return '';
    }

    if (config.swearCheckEnableLeetSpeak) {
        const leetMap = config.swearCheckLeetSpeakMap || {
            '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
        };

        let leetChars = Array.from(normalized);
        for (let i = 0; i < leetChars.length; i++) {
            if (leetChars[i] === 'p' && i + 1 < leetChars.length && leetChars[i + 1] === 'h' && leetMap['ph'] === 'f') {
                leetChars.splice(i, 2, 'f');
            } else {
                leetChars[i] = leetMap[leetChars[i]] || leetChars[i];
            }
        }
        normalized = leetChars.join('');

        normalized = normalized.replace(/(.)\1+/g, '$1');
        if (!normalized) {
            return '';
        }
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

    const normalizedSwearWordList = config.swearWordList
        .map(sw => ({
            original: sw,
            normalized: normalizeWordForSwearCheck(sw, config),
        }))
        .filter(item => item.normalized.length > 0);

    if (normalizedSwearWordList.length === 0) {
        playerUtils.debugLog(`[SwearCheck] Skipped for ${player.nameTag} as normalizedSwearWordList is empty (all configured swears were invalid or became empty).`, pData?.isWatched ? player.nameTag : null, dependencies);
        return;
    }

    const wordsInMessage = originalMessage.split(/\s+/);
    const actionProfileKey = config.swearCheckActionProfileName ?? 'chatSwearViolation';

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') {
            continue;
        }

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config);
        if (normalizedInputWord.length === 0) {
            continue;
        }

        for (const swearItem of normalizedSwearWordList) {
            if (normalizedInputWord === swearItem.normalized) {
                const violationDetails = {
                    detectedSwear: swearItem.original,
                    matchedWordInMessage: wordInMessage,
                    normalizedInput: normalizedInputWord,
                    normalizedSwear: swearItem.normalized,
                    matchMethod: 'exactNormalized',
                    originalMessage: originalMessage,
                };
                playerUtils.debugLog(`[SwearCheck] ${player.nameTag} triggered swear check. Word: '${wordInMessage}' (normalized: '${normalizedInputWord}') matched '${swearItem.original}' (normalized: '${swearItem.normalized}') by exactNormalized.`, pData?.isWatched ? player.nameTag : null, dependencies);

                await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

                if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
                    eventData.cancel = true;
                }
                return;
            }
        }
    }
}
