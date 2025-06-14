/**
 * @file AntiCheatsBP/scripts/checks/chat/symbolSpamCheck.js
 * Implements a check to detect excessive symbol usage (non-alphanumeric, excluding spaces) in chat messages.
 * @version 1.0.0
 */

/**
 * Checks a chat message for excessive symbol usage.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {string} message The raw chat message content.
 * @param {import('../../types.js').PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {import('../../types.js').CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkSymbolSpam(player, message, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;

    if (!config.enableSymbolSpamCheck) {
        return;
    }

    if (message.length < config.symbolSpamMinLength) {
        return;
    }

    let totalChars = 0; // Count of non-space characters
    let symbolChars = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === ' ') {
            continue; // Ignore spaces from total count and symbol count
        }
        totalChars++;

        // A symbol is a non-alphanumeric character
        // Regex [^a-zA-Z0-9] matches anything not a letter or digit.
        if (!char.match(/[a-zA-Z0-9]/)) {
            symbolChars++;
        }
    }

    if (totalChars === 0) { // Avoid division by zero if message is all spaces or empty after filtering
        return;
    }

    const symbolPercentage = (symbolChars / totalChars) * 100;

    if (symbolPercentage >= config.symbolSpamPercentage) {
        if (config.enableDebugLogging && playerUtils?.debugLog) {
            playerUtils.debugLog(
                `SymbolSpamCheck: Player ${player.nameTag} triggered symbol spam. ` +
                `Msg: "${message}", Symbols: ${symbolPercentage.toFixed(1)}%, ` +
                `Threshold: ${config.symbolSpamPercentage}%, MinLength: ${config.symbolSpamMinLength}`,
                player.nameTag
            );
        }

        // Use the action profile name from the config
        const profileName = config.symbolSpamActionProfileName || "chat_symbol_spam_detected";

        await actionManager.executeCheckAction(
            player,
            profileName,
            {
                percentage: symbolPercentage.toFixed(1) + "%",
                threshold: config.symbolSpamPercentage + "%",
                minLength: config.symbolSpamMinLength,
                originalMessage: message,
                checkType: "symbol_spam" // For logging/distinction if needed
            },
            dependencies
        );
    }
}
