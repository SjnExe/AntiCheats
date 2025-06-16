/**
 * @file AntiCheatsBP/scripts/checks/chat/swearCheck.js
 * Implements swear word detection in chat messages.
 * @version 1.0.0
 */

/**
 * Checks a chat message for swear words based on a configurable list.
 * This check is case-insensitive and matches whole words.
 *
 * @param {import('@minecraft/server').Player} player The player sending the message.
 * @param {object} pData Player-specific data from playerDataManager.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../../../config.js').editableConfigValues} config The server configuration object, expected to contain enableSwearCheck, swearWordList, and swearCheckActionProfileName.
 * @param {import('../../../utils/playerUtils.js')} playerUtils Utility functions.
 * @param {import('../../../types.js').ActionManagerDependencies} dependencies Full dependencies object, including actionManager.
 * @returns {Promise<boolean>} True if a violation is detected and action taken, false otherwise.
 */
export async function checkSwear(player, pData, eventData, config, playerUtils, dependencies) {
    if (!config.enableSwearCheck) {
        return false;
    }

    if (!config.swearWordList || config.swearWordList.length === 0) {
        if (playerUtils.debugLog && pData.isWatched) {
            playerUtils.debugLog(\`SwearCheck: Skipped for \${player.nameTag} as swearWordList is empty or undefined.\`, player.nameTag);
        }
        return false; // No words to check against
    }

    const originalMessage = eventData.message;
    const lowerMessage = originalMessage.toLowerCase();

    for (const swearWord of config.swearWordList) {
        if (!swearWord || typeof swearWord !== 'string' || swearWord.trim() === '') continue; // Skip empty/invalid words

        const lowerSwearWord = swearWord.toLowerCase().trim();
        // Use regex for whole word matching, case-insensitive (already handled by toLowerCase)
        // \b matches word boundaries
        const regex = new RegExp(\`\\b\${lowerSwearWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b\`); // Escape regex special chars in swearWord

        if (regex.test(lowerMessage)) {
            const violationDetails = {
                detectedWord: swearWord, // Log the original casing of the swear word from the list
                messageContent: originalMessage,
                profileKey: config.swearCheckActionProfileName
            };

            if (playerUtils.debugLog) {
                playerUtils.debugLog(\`SwearCheck: \${player.nameTag} triggered swear check. Word: "\${swearWord}". Msg: "\${originalMessage}"\`, player.nameTag);
            }

            if (dependencies && dependencies.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
                await dependencies.actionManager.executeCheckAction(player, config.swearCheckActionProfileName, violationDetails, dependencies);
            } else {
                 playerUtils.debugLog("SwearCheck: actionManager.executeCheckAction is not available in dependencies.", null);
                 // Fallback or simpler flagging if actionManager is missing (though it shouldn't be)
                 if (dependencies && dependencies.playerDataManager && dependencies.playerDataManager.addFlag) {
                    dependencies.playerDataManager.addFlag(player, config.swearCheckActionProfileName, `Swear word detected: \${swearWord}`);
                 }
            }
            return true; // Violation detected
        }
    }
    return false; // No swear words found
}
