/**
 * @file Implements a check to detect excessive repetition of the same character in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive character repetition.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {Dependencies} dependencies - Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCharRepeat(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableCharRepeatCheck) {
        return;
    }

    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config?.charRepeatActionProfileName ?? 'chatCharRepeatDetected'; // Default is already camelCase
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const defaultMinLength = 5;
    const defaultThreshold = 5;

    const minLength = config?.charRepeatMinLength ?? defaultMinLength;
    const threshold = config?.charRepeatThreshold ?? defaultThreshold;

    if (message.length < minLength) {
        return;
    }

    let maxRepeatCount = 0;
    let currentChar = '';
    let currentRepeatCount = 0;
    let charThatRepeatedMost = ''; // Store the character that had the longest repeat sequence

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === currentChar) {
            currentRepeatCount++;
        } else {
            // Check if the previous sequence was the longest so far
            if (currentRepeatCount > maxRepeatCount) {
                maxRepeatCount = currentRepeatCount;
                charThatRepeatedMost = currentChar; // Update which character repeated most
            }
            // Reset for the new character
            currentChar = char;
            currentRepeatCount = 1;
        }
    }
    // Final check for the last sequence in the message
    if (currentRepeatCount > maxRepeatCount) {
        maxRepeatCount = currentRepeatCount;
        charThatRepeatedMost = currentChar;
    }

    if (maxRepeatCount >= threshold) {
        const watchedPlayerName = pData?.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[CharRepeatCheck] Player ${playerName} triggered char repeat. ` +
            `Msg: '${message}', Char: '${charThatRepeatedMost}', Count: ${maxRepeatCount}, ` +
            `Threshold: ${threshold}, MinLength: ${minLength}`,
            watchedPlayerName, dependencies
        );

        const violationDetails = {
            char: charThatRepeatedMost,
            count: maxRepeatCount.toString(),
            threshold: threshold.toString(),
            messageLength: message.length.toString(),
            originalMessage: message,
        };
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
