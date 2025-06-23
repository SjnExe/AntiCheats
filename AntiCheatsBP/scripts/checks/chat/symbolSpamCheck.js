/**
 * Implements a check to detect excessive symbol usage (non-alphanumeric, excluding spaces) in chat messages.
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks a chat message for excessive symbol usage.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data (currently unused in this specific check's logic, but passed for signature consistency).
 * @param {CommandDependencies} dependencies Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkSymbolSpam(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;

    if (!config.enableSymbolSpamCheck) {
        return;
    }

    if (message.length < config.symbolSpamMinLength) {
        return;
    }

    let totalChars = 0;
    let symbolChars = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === ' ') {
            continue;
        }
        totalChars++;

        if (!char.match(/[a-zA-Z0-9]/)) {
            symbolChars++;
        }
    }

    if (totalChars === 0) {
        return;
    }

    const symbolPercentage = (symbolChars / totalChars) * 100;

    if (symbolPercentage >= config.symbolSpamPercentage) {
        playerUtils.debugLog(
            `[SymbolSpamCheck] Player ${player.nameTag} triggered symbol spam. ` +
            `Msg: "${message}", Symbols: ${symbolPercentage.toFixed(1)}%, ` +
            `Threshold: ${config.symbolSpamPercentage}%, MinLength: ${config.symbolSpamMinLength}`,
            pData?.isWatched ? player.nameTag : null, dependencies
        );

        const profileName = config.symbolSpamActionProfileName || "chatSymbolSpamDetected";

        await actionManager.executeCheckAction(
            player,
            profileName,
            {
                percentage: symbolPercentage.toFixed(1) + "%",
                threshold: config.symbolSpamPercentage + "%",
                minLength: config.symbolSpamMinLength,
                originalMessage: message,
                checkType: "symbol_spam"
            },
            dependencies
        );
    }
}
