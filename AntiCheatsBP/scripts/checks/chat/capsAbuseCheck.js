/**
 * @file Implements a check to detect excessive capitalization (CAPS abuse) in chat messages.
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

    // Standardized action profile name
    const actionProfileKey = config.capsCheckActionProfileName || 'chatCapsAbuseDetected';

    if (!config.enableCapsCheck) {
        return;
    }

    if (message.length < config.capsCheckMinLength) {
        return;
    }

    let totalLetters = 0;
    let upperCaseLetters = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char.match(/[a-zA-Z]/)) { // Consider only alphabetic characters
            totalLetters++;
            if (char.match(/[A-Z]/)) { // Check if it's uppercase
                upperCaseLetters++;
            }
        }
    }

    if (totalLetters === 0) { // No letters in the message, so no CAPS abuse possible
        return;
    }

    const upperCasePercentage = (upperCaseLetters / totalLetters) * 100;

    if (upperCasePercentage >= config.capsCheckUpperCasePercentage) {
        playerUtils.debugLog(
            `[CapsAbuseCheck] Player ${player.nameTag} triggered CAPS abuse. ` +
            `Msg: '${message}', CAPS: ${upperCasePercentage.toFixed(1)}%, ` +
            `Threshold: ${config.capsCheckUpperCasePercentage}%, MinLength: ${config.capsCheckMinLength}`,
            pData?.isWatched ? player.nameTag : null, dependencies
        );

        const violationDetails = {
            percentage: `${upperCasePercentage.toFixed(1)}%`,
            threshold: `${config.capsCheckUpperCasePercentage}%`,
            minLength: config.capsCheckMinLength,
            originalMessage: message,
        };
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        // Message cancellation should be handled by the action profile if configured
        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
