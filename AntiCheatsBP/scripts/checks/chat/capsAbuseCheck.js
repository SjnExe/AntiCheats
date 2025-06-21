/**
 * @file AntiCheatsBP/scripts/checks/chat/capsAbuseCheck.js
 * Implements a check to detect excessive capitalization (CAPS abuse) in chat messages.
 * @version 1.0.0
 */

/**
 * Checks a chat message for excessive capitalization.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {object} pData The player's anti-cheat data (currently unused in this specific check's logic, but passed for signature consistency).
 * @param {import('../../types.js').CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCapsAbuse(player, eventData, pData, dependencies) { // Changed signature
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message; // Get message from eventData

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
        // Consider only alphabetic characters for the ratio
        if (char.match(/[a-zA-Z]/)) { // Check if it's an English alphabet letter
            totalLetters++;
            if (char.match(/[A-Z]/)) { // Check if it's an uppercase English alphabet letter
                upperCaseLetters++;
            }
        }
    }

    if (totalLetters === 0) { // Avoid division by zero if message has no letters
        return;
    }

    const upperCasePercentage = (upperCaseLetters / totalLetters) * 100;

    if (upperCasePercentage >= config.capsCheckUpperCasePercentage) {
        // playerUtils.debugLog will internally check config.enableDebugLogging
        playerUtils.debugLog(
            `[CapsAbuseCheck] Player ${player.nameTag} triggered CAPS abuse. ` +
            `Msg: "${message}", CAPS: ${upperCasePercentage.toFixed(1)}%, ` +
            `Threshold: ${config.capsCheckUpperCasePercentage}%, MinLength: ${config.capsCheckMinLength}`,
            pData?.isWatched ? player.nameTag : null, dependencies // Pass dependencies and context
        );
        await actionManager.executeCheckAction(
            player,
            config.capsCheckActionProfileName,
            {
                percentage: upperCasePercentage.toFixed(1) + "%",
                threshold: config.capsCheckUpperCasePercentage + "%",
                minLength: config.capsCheckMinLength,
                originalMessage: message
            },
            dependencies
        );
    }
}
