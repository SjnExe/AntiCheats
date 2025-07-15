/**
 * @file Detects swear words in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/swearCheck
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
 * @param {string} word The word to normalize.
 * @param {Dependencies} dependencies For accessing config.
 * @returns {string} The normalized word.
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
                } else {
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
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {Dependencies} dependencies Full dependencies object.
 */
let normalizedSwearWordSet = new Set();
let lastSwearList;

/**
 * Initializes or updates the swear word list from the config.
 * @param {Dependencies} dependencies The dependencies object.
 */
function initializeSwearList(dependencies) {
    const { config } = dependencies;
    const currentSwearList = config?.chatChecks?.swear?.words;

    if (currentSwearList !== lastSwearList) {
        lastSwearList = currentSwearList;
        if (Array.isArray(currentSwearList)) {
            normalizedSwearWordSet = new Set(
                currentSwearList.map(sw => normalizeWordForSwearCheck(String(sw ?? ''), dependencies)).filter(Boolean),
            );
        } else {
            normalizedSwearWordSet = new Set();
        }
    }
}

/**
 * Checks a chat message for swear words.
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {Dependencies} dependencies Full dependencies object.
 */
export async function checkSwear(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.chatChecks?.swear?.enabled) {
        return;
    }

    initializeSwearList(dependencies);

    if (normalizedSwearWordSet.size === 0) {
        playerUtils?.debugLog(`[SwearCheck] Skipped for ${playerName}: swear word list is empty or not configured.`, pData?.isWatched ? playerName : null, dependencies);
        return;
    }

    const originalMessage = eventData.message;
    const wordsInMessage = originalMessage.split(/\s+/);
    const actionProfileKey = config?.chatChecks?.swear?.actionProfile ?? 'chatSwearViolation';
    const watchedPlayerName = pData?.isWatched ? playerName : null;

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') {
            continue;
        }

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, dependencies);
        if (normalizedInputWord.length === 0) {
            continue;
        }

        if (normalizedSwearWordSet.has(normalizedInputWord)) {
            const violationDetails = {
                detectedSwear: wordInMessage,
                normalizedInput: normalizedInputWord,
                matchMethod: 'exactNormalized',
                originalMessage,
            };
            playerUtils?.debugLog(
                `[SwearCheck] ${playerName} triggered swear check. Word: '${wordInMessage}' (norm: '${normalizedInputWord}')`,
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
