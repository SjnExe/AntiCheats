/**
 * @file AntiCheatsBP/scripts/checks/chat/capsAbuseCheck.js
 * Implements a check to detect excessive capitalization (CAPS abuse) in chat messages.
 * @version 1.0.0
 */

/**
 * Checks a chat message for excessive capitalization.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {string} message The raw chat message content.
 * @param {import('../../types.js').PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {import('../../types.js').CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCapsAbuse(player, message, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;

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
        if (char.match(/[a-zA-Z]/)) {
            totalLetters++;
            if (char === char.toUpperCase() && char !== char.toLowerCase()) { // Check if it's an uppercase letter
                upperCaseLetters++;
            }
        }
    }

    if (totalLetters === 0) { // Avoid division by zero if message has no letters
        return;
    }

    const upperCasePercentage = (upperCaseLetters / totalLetters) * 100;

    if (upperCasePercentage >= config.capsCheckUpperCasePercentage) {
        if (config.enableDebugLogging && playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(
                `CapsAbuseCheck: Player ${player.nameTag} triggered CAPS abuse. ` +
                `Msg: "${message}", CAPS: ${upperCasePercentage.toFixed(1)}%, ` +
                `Threshold: ${config.capsCheckUpperCasePercentage}%, MinLength: ${config.capsCheckMinLength}`,
                player.nameTag
            );
        }
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
