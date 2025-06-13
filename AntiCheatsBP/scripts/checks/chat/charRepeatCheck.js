/**
 * @file AntiCheatsBP/scripts/checks/chat/charRepeatCheck.js
 * Implements a check to detect excessive repetition of the same character in chat messages.
 * @version 1.0.0
 */

/**
 * Checks a chat message for excessive character repetition.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {string} message The raw chat message content.
 * @param {import('../../types.js').PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {import('../../types.js').CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCharRepeat(player, message, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;

    if (!config.enableCharRepeatCheck) {
        return;
    }

    if (message.length < config.charRepeatMinLength) {
        return;
    }

    let maxRepeatCount = 0;
    let currentChar = '';
    let currentRepeatCount = 0;
    let charThatRepeated = '';

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        // Ignore spaces for repetition counting, but reset sequence if space encountered.
        // Or, more simply, just count any character. Let's go with any character for simplicity.
        if (char === currentChar) {
            currentRepeatCount++;
        } else {
            // Check if the previous sequence was the longest
            if (currentRepeatCount > maxRepeatCount) {
                maxRepeatCount = currentRepeatCount;
                charThatRepeated = currentChar;
            }
            // Reset for the new character
            currentChar = char;
            currentRepeatCount = 1;
        }
    }
    // Final check for the last sequence in the message
    if (currentRepeatCount > maxRepeatCount) {
        maxRepeatCount = currentRepeatCount;
        charThatRepeated = currentChar;
    }

    if (maxRepeatCount >= config.charRepeatThreshold) {
        if (config.enableDebugLogging && playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(
                `CharRepeatCheck: Player ${player.nameTag} triggered char repeat. ` +
                `Msg: "${message}", Char: '${charThatRepeated}', Count: ${maxRepeatCount}, ` +
                `Threshold: ${config.charRepeatThreshold}, MinLength: ${config.charRepeatMinLength}`,
                player.nameTag
            );
        }
        await actionManager.executeCheckAction(
            player,
            config.charRepeatActionProfileName,
            {
                char: charThatRepeated,
                count: maxRepeatCount,
                threshold: config.charRepeatThreshold,
                originalMessage: message
            },
            dependencies
        );
    }
}
