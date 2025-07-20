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

    const leetMap = config?.swearCheckEnableLeetSpeak ? (config?.swearCheckLeetSpeakMap ?? defaultLeetMap) : null;
    let normalized = '';
    let lastChar = '';

    const lowerWord = word.toLowerCase();

    for (let i = 0; i < lowerWord.length; i++) {
        let currentChar = lowerWord[i];
        let consumedChars = 1;

        // Leet speak conversion (if enabled)
        if (leetMap) {
            // Check for two-character sequences first
            if (i + 1 < lowerWord.length) {
                const twoCharSeq = lowerWord.substring(i, i + 2);
                if (leetMap[twoCharSeq]) {
                    currentChar = leetMap[twoCharSeq];
                    consumedChars = 2;
                }
            }
            // If no two-char sequence, check for single char
            if (consumedChars === 1 && leetMap[currentChar]) {
                currentChar = leetMap[currentChar];
            }
        }

        // Check if the character is an alphabet character
        if (currentChar >= 'a' && currentChar <= 'z') {
            // Remove consecutive duplicates
            if (currentChar !== lastChar) {
                normalized += currentChar;
                lastChar = currentChar;
            }
        }
        // If not an alphabet, it's effectively skipped, removing symbols/numbers

        if (consumedChars > 1) {
            i++; // Advance index for the consumed two-char sequence
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
let normalizedSwearWordSet = null;
let lastSwearListJson = '';

/**
 * Initializes or updates the swear word list from the config.
 * @param {Dependencies} dependencies The dependencies object.
 */
function initializeSwearList(dependencies) {
    const { config } = dependencies;
    const currentSwearList = config?.chatChecks?.swear?.words;
    const currentSwearListJson = JSON.stringify(currentSwearList);

    if (currentSwearListJson !== lastSwearListJson) {
        lastSwearListJson = currentSwearListJson;
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
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.chatChecks?.swear?.enabled) {
        return;
    }

    if (normalizedSwearWordSet === null) {
        initializeSwearList(dependencies);
    }

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
