/**
 * @file Implements a check to detect excessive repetition of the same character in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a chat message for excessive character repetition.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {CommandDependencies} dependencies - Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCharRepeat(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Ensure actionProfileKey is camelCase and provide a default
    const actionProfileKey = config?.charRepeatActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? 'chatCharRepeatDetected';

    if (!config?.enableCharRepeatCheck) {
        return;
    }

    const DEFAULT_MIN_LENGTH = 5; // Example default, adjust as needed
    const DEFAULT_THRESHOLD = 5;  // Example default, adjust as needed

    const minLength = config?.charRepeatMinLength ?? DEFAULT_MIN_LENGTH;
    const threshold = config?.charRepeatThreshold ?? DEFAULT_THRESHOLD;

    if (message.length < minLength) {
        return;
    }

    let maxRepeatCount = 0;
    let currentChar = '';
    let currentRepeatCount = 0;
    let charThatRepeated = '';

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === currentChar) {
            currentRepeatCount++;
        } else {
            if (currentRepeatCount > maxRepeatCount) {
                maxRepeatCount = currentRepeatCount;
                charThatRepeated = currentChar;
            }
            currentChar = char;
            currentRepeatCount = 1;
        }
    }
    if (currentRepeatCount > maxRepeatCount) {
        maxRepeatCount = currentRepeatCount;
        charThatRepeated = currentChar;
    }

    if (maxRepeatCount >= threshold) {
        playerUtils?.debugLog(
            `[CharRepeatCheck] Player ${playerName} triggered char repeat. ` +
            `Msg: '${message}', Char: '${charThatRepeated}', Count: ${maxRepeatCount}, ` +
            `Threshold: ${threshold}, MinLength: ${minLength}`,
            pData?.isWatched ? playerName : null, dependencies
        );

        const violationDetails = {
            char: charThatRepeated,
            count: maxRepeatCount,
            threshold: threshold,
            originalMessage: message,
        };
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
