/**
 * @file Implements a check to detect excessive repetition of the same character in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/charRepeatCheck
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive character repetition.
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

    const rawActionProfileKey = config?.charRepeatActionProfileName ?? 'chatCharRepeatDetected';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const minLength = config?.charRepeatMinLength ?? 5;
    const threshold = config?.charRepeatThreshold ?? 5;

    if (message.length < minLength) {
        return;
    }

    let maxRepeatCount = 0;
    let currentChar = '';
    let currentRepeatCount = 0;
    let charThatRepeatedMost = '';

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === currentChar) {
            currentRepeatCount++;
        } else {
            if (currentRepeatCount > maxRepeatCount) {
                maxRepeatCount = currentRepeatCount;
                charThatRepeatedMost = currentChar;
            }
            currentChar = char;
            currentRepeatCount = 1;
        }
    }
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
            watchedPlayerName, dependencies,
        );

        const violationDetails = {
            char: charThatRepeatedMost,
            count: maxRepeatCount.toString(),
            threshold: threshold.toString(),
            messageLength: message.length.toString(),
            originalMessage: message,
        };

        // Determine if message should be cancelled before awaiting actionManager
        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
    }
}
