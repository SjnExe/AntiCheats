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

    normalized = normalized.replace(/[\s._-]+/g, '');
    if (!normalized) return '';
    normalized = normalized.replace(/(.)\1+/g, '$1');
    if (!normalized) return '';
    if (config.swearCheckEnableLeetSpeak) {
        const leetMap = config.swearCheckLeetSpeakMap || {
            '@': 'a', '4': 'a', '8': 'b', '3': 'e', '1': 'l', '!': 'i', '0': 'o', '5': 's', '7': 't', '$': 's',
            'ph': 'f',
        };

        let leetConverted = "";
        for (const char of normalized) {
            leetConverted += leetMap[char] || char;
        }
        normalized = leetConverted;
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
export async function checkSwear(player, eventData, pData, dependenciesFull) {
    const { config, playerUtils, actionManager, playerDataManager } = dependenciesFull;

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
            normalized: normalizeWordForSwearCheck(sw, config)
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
        const normalizedInputWord = normalizeWordForSwearCheck(wordInMessage, config);
        if (normalizedInputWord.length === 0) continue;
        for (const swearItem of normalizedSwearWordList) {
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
                     if (playerDataManager && playerDataManager.addFlag) {
                         playerDataManager.addFlag(player, actionProfileName, `Swear word detected: ${swearItem.original} (matched: ${wordInMessage})`, violationDetails, dependenciesFull);
                     }
                }
                return true;
            }
        }
    }
    return false;
}
