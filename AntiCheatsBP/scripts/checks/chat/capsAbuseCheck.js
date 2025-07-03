/**
 * @file Implements a check to detect excessive capitalization (CAPS abuse) in chat messages.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a chat message for excessive capitalization.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {CommandDependencies} dependencies - Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCapsAbuse(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.capsCheckActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? 'chatCapsAbuseDetected';

    if (!config?.enableCapsCheck) {
        return;
    }

    const DEFAULT_MIN_LENGTH = 10;
    const DEFAULT_PERCENTAGE_THRESHOLD = 70;

    const minLength = config?.capsCheckMinLength ?? DEFAULT_MIN_LENGTH;
    if (message.length < minLength) {
        return;
    }

    let totalLetters = 0;
    let upperCaseLetters = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        // More robust letter check (Unicode aware, though less critical for caps)
        if (char.toLowerCase() !== char.toUpperCase()) { // Checks if it's a letter
            totalLetters++;
            if (char === char.toUpperCase() && char !== char.toLowerCase()) { // Is uppercase and not a non-alphabetic char that has no case
                upperCaseLetters++;
            }
        }
    }

    if (totalLetters === 0) { // No letters in the message
        return;
    }

    const upperCasePercentage = (upperCaseLetters / totalLetters) * 100;
    const percentageThreshold = config?.capsCheckUpperCasePercentage ?? DEFAULT_PERCENTAGE_THRESHOLD;

    if (upperCasePercentage >= percentageThreshold) {
        playerUtils?.debugLog(
            `[CapsAbuseCheck.execute] Player ${playerName} triggered CAPS abuse. ` +
            `Msg: '${message}', CAPS: ${upperCasePercentage.toFixed(1)}%, ` +
            `Threshold: ${percentageThreshold}%, MinLength: ${minLength}`,
            pData?.isWatched ? playerName : null, dependencies
        );

        const violationDetails = {
            percentage: `${upperCasePercentage.toFixed(1)}%`,
            threshold: `${percentageThreshold}%`,
            minLength: minLength,
            originalMessage: message,
        };
        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
