/**
 * @file AntiCheatsBP/scripts/checks/chat/antiAdvertisingCheck.js
 * Implements a basic check to detect potential advertising in chat messages.
 * @version 1.0.0
 */

// No direct imports needed as dependencies are passed in

/**
 * Checks a chat message for common advertising patterns.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {string} message The raw chat message content.
 * @param {import('../../types.js').PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {import('../../types.js').CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkAntiAdvertising(player, message, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;

    if (!config.enableAntiAdvertisingCheck) {
        return;
    }

    if (!config.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0) {
        if (config.enableDebugLogging && playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog("AntiAdvertisingCheck: No patterns configured, skipping check.", player.nameTag);
        }
        return;
    }

    const lowerCaseMessage = message.toLowerCase();

    for (const pattern of config.antiAdvertisingPatterns) {
        if (lowerCaseMessage.includes(pattern.toLowerCase())) {
            if (config.enableDebugLogging && playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(`AntiAdvertisingCheck: Player ${player.nameTag} triggered pattern '${pattern}' with message: "${message}"`, player.nameTag);
            }
            await actionManager.executeCheckAction(
                player,
                config.antiAdvertisingActionProfileName,
                { matchedPattern: pattern, originalMessage: message },
                dependencies
            );
            return; // Stop after first match
        }
    }
}
