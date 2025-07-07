/**
 * @file Implements swear word detection in chat messages with obfuscation resistance
 * using exact normalized matching. All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

const defaultLeetMap = {
    '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
    'ph': 'f',
};

/**
 * Normalizes a word for swear checking.
 * Converts to lowercase, removes common separators, collapses consecutive identical characters,
 * and optionally applies leet speak conversion.
 *
 * @param {string} word - The word to normalize.
 * @param {Dependencies} dependencies - For accessing config.
 * @returns {string} Normalized word, or empty string if input is invalid/empty after normalization.
 */
function normalizeWordForSwearCheck(word, dependencies) {
    const { config } = dependencies;
    if (typeof word !== 'string' || word.trim() === '') {
        return '';
    }
    let normalized = word.toLowerCase();

    normalized = normalized.replace(/[\s._\-~`!@#$%^&*()+={}[\]|\\:;"'<>,.?/0-9]+/g, '');
    if (!normalized) {
        return '';
    }

    normalized = normalized.replace(/(.)\1+/g, '$1');
    if (!normalized) {
        return '';
    }

    if (config?.swearCheckEnableLeetSpeak) {
        const leetMap = config?.swearCheckLeetSpeakMap ?? defaultLeetMap;
        const chars = Array.from(normalized);
        const resultChars = [];
        let i = 0;
        while (i < chars.length) {
            let replaced = false;
            if (i + 1 < chars.length) {
                const twoCharSeq = chars[i] + chars[i + 1];
                if (leetMap[twoCharSeq]) {
                    resultChars.push(leetMap[twoCharSeq]);
                    i += 2;
                    replaced = true;
                }
            }
            if (!replaced) {
                if (leetMap[chars[i]]) {
                    resultChars.push(leetMap[chars[i]]);
                }
                else {
                    resultChars.push(chars[i]);
                }
                i++;
            }
        }
        normalized = resultChars.join('');

        normalized = normalized.replace(/(.)\1+/g, '$1');
        if (!normalized) {
            return '';
        }
    }
    return normalized;
}

/**
 * Checks a chat message for swear words.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Full dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSwear(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSwearCheck) {
        return;
    }
    const originalMessage = eventData.message;
    if (!Array.isArray(config.swearWordList) || config.swearWordList.length === 0) {
        playerUtils?.debugLog(`[SwearCheck] Skipped for ${playerName}: swearWordList is empty/undefined.`, pData?.isWatched ? playerName : null, dependencies);
        return;
    }

    const normalizedSwearWordList = config.swearWordList
        .map(sw => {
            const originalSwear = String(sw ?? '');
            return {
                original: originalSwear,
                normalized: normalizeWordForSwearCheck(originalSwear, dependencies),
            };
        })
        .filter(item => item.normalized.length > 0);

    if (normalizedSwearWordList.length === 0) {
        playerUtils?.debugLog(`[SwearCheck] Skipped for ${playerName}: normalizedSwearWordList is empty after processing.`, pData?.isWatched ? playerName : null, dependencies);
        return;
    }

    const wordsInMessage = originalMessage.split(/\s+/);
    const rawActionProfileKey = config?.swearCheckActionProfileName ?? 'chatSwearViolation';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());
    const watchedPlayerName = pData?.isWatched ? playerName : null;

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') {
            continue;
        }

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, dependencies);
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
                playerUtils?.debugLog(
                    `[SwearCheck] ${playerName} triggered swear check. Word: '${wordInMessage}' (norm: '${normalizedInputWord}') matched '${swearItem.original}' (norm: '${swearItem.normalized}').`,
                    watchedPlayerName, dependencies,
                );

                await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

                const profile = dependencies.checkActionProfiles?.[actionProfileKey];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return;
            }
        }
    }
}
