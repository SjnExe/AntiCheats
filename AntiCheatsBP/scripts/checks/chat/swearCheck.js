/**
 * @file Implements swear word detection in chat messages with obfuscation resistance
 * using exact normalized matching. All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

const defaultLeetMap = {
    '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
};

/**
 * Normalizes a word for swear checking.
 * @param {string} word - The word to normalize.
 * @param {Config} config - Server configuration, for leet speak settings.
 * @returns {string} Normalized word, or empty string if input is invalid/empty after normalization.
 */
function normalizeWordForSwearCheck(word, config) {
    if (typeof word !== 'string' || word.trim() === '') {
        return '';
    }
    let normalized = word.toLowerCase();

    normalized = normalized.replace(/[\s._-]+/g, ''); // Remove common separators
    if (!normalized) return ''; // Check after each step

    normalized = normalized.replace(/(.)\1+/g, '$1'); // Collapse consecutive identical characters
    if (!normalized) return '';

    if (config?.swearCheckEnableLeetSpeak) {
        const leetMap = config.swearCheckLeetSpeakMap ?? defaultLeetMap;
        let leetChars = Array.from(normalized);
        for (let i = 0; i < leetChars.length; i++) {
            // Handle multi-char leet like 'ph' -> 'f' if defined in map
            if (leetMap[`${leetChars[i]}${leetChars[i+1]}`]) {
                 leetChars.splice(i, 2, leetMap[`${leetChars[i]}${leetChars[i+1]}`]);
            } else if (leetMap[leetChars[i]]) {
                leetChars[i] = leetMap[leetChars[i]];
            }
        }
        normalized = leetChars.join('');

        normalized = normalized.replace(/(.)\1+/g, '$1'); // Collapse again after leet speak
        if (!normalized) return '';
    }
    return normalized;
}

/**
 * Checks a chat message for swear words.
 * @async
 * @param {import('@minecraft/server').Player} player - The player sending the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Full dependencies object.
 * @returns {Promise<void>}
 */
export async function checkSwear(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies; // Removed playerDataManager as pData is passed in
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSwearCheck) {
        return;
    }
    const originalMessage = eventData.message;
    if (!Array.isArray(config.swearWordList) || config.swearWordList.length === 0) {
        playerUtils?.debugLog(`[SwearCheck.execute] Skipped for ${playerName}: swearWordList is empty/undefined.`, pData?.isWatched ? playerName : null, dependencies);
        return;
    }

    const normalizedSwearWordList = config.swearWordList
        .map(sw => ({
            original: String(sw), // Ensure original is string
            normalized: normalizeWordForSwearCheck(String(sw), config),
        }))
        .filter(item => item.normalized.length > 0); // Filter out swears that become empty after normalization

    if (normalizedSwearWordList.length === 0) {
        playerUtils?.debugLog(`[SwearCheck.execute] Skipped for ${playerName}: normalizedSwearWordList is empty.`, pData?.isWatched ? playerName : null, dependencies);
        return;
    }

    const wordsInMessage = originalMessage.split(/\s+/); // Split by any whitespace
    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.swearCheckActionProfileName ?? 'chatSwearViolation'; // Default is already camelCase
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    for (const wordInMessage of wordsInMessage) {
        if (wordInMessage.trim() === '') continue;

        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config);
        if (normalizedInputWord.length === 0) continue;

        for (const swearItem of normalizedSwearWordList) {
            if (normalizedInputWord === swearItem.normalized) {
                const violationDetails = {
                    detectedSwear: swearItem.original,
                    matchedWordInMessage: wordInMessage,
                    normalizedInput: normalizedInputWord,
                    normalizedSwear: swearItem.normalized,
                    matchMethod: 'exactNormalized', // Method of detection
                    originalMessage: originalMessage,
                };
                playerUtils?.debugLog(
                    `[SwearCheck.execute] ${playerName} triggered swear check. Word: '${wordInMessage}' (norm: '${normalizedInputWord}') matched '${swearItem.original}' (norm: '${swearItem.normalized}').`,
                    pData?.isWatched ? playerName : null, dependencies
                );

                await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

                const profile = config?.checkActionProfiles?.[actionProfileKey];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Stop after first swear word found and actioned
            }
        }
    }
}
