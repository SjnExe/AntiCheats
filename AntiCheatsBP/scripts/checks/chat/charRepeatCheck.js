/**
 * @file AntiCheatsBP/scripts/checks/chat/charRepeatCheck.js
 * Implements a check to detect excessive repetition of the same character in chat messages.
 * @version 1.0.1
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a chat message for excessive character repetition.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data (currently unused in this specific check's logic, but passed for signature consistency).
 * @param {CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCharRepeat(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;

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

    if (maxRepeatCount >= config.charRepeatThreshold) {
        // playerUtils.debugLog will internally check config.enableDebugLogging
        playerUtils.debugLog(
            `[CharRepeatCheck] Player ${player.nameTag} triggered char repeat. ` +
            `Msg: "${message}", Char: '${charThatRepeated}', Count: ${maxRepeatCount}, ` +
            `Threshold: ${config.charRepeatThreshold}, MinLength: ${config.charRepeatMinLength}`,
            dependencies, pData?.isWatched ? player.nameTag : null
        );
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
