/**
 * @file Implements a check to detect excessive symbol usage (non-alphanumeric, excluding spaces) in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a chat message for excessive symbol usage.
 * Symbols are defined as non-alphanumeric characters, excluding spaces.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {CommandDependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkSymbolSpam(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;

    // Standardized action profile key
    const actionProfileKey = config.symbolSpamActionProfileName ?? 'chatSymbolSpamDetected';

    if (!config.enableSymbolSpamCheck) {
        return;
    }

    if (message.length < config.symbolSpamMinLength) {
        return; // Message too short to check
    }

    let totalChars = 0; // Count of non-space characters
    let symbolChars = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === ' ') {
            continue; // Ignore spaces for total character count relevant to symbol ratio
        }
        totalChars++;

        // A symbol is any character that is NOT a letter (a-z, A-Z) or a digit (0-9)
        if (!/[a-zA-Z0-9]/.test(char)) { // Use .test() for boolean check
            symbolChars++;
        }
    }

    if (totalChars === 0) { // Message was all spaces
        return;
    }

    const symbolPercentage = (symbolChars / totalChars) * 100;

    if (symbolPercentage >= config.symbolSpamPercentage) {
        playerUtils.debugLog(
            `[SymbolSpamCheck] Player ${player.nameTag} triggered symbol spam. ` +
            `Msg: '${message}', Symbols: ${symbolPercentage.toFixed(1)}%, ` +
            `Threshold: ${config.symbolSpamPercentage}%, MinLength: ${config.symbolSpamMinLength}`,
            pData?.isWatched ? player.nameTag : null, dependencies
        );

        const violationDetails = {
            percentage: `${symbolPercentage.toFixed(1)}%`,
            threshold: `${config.symbolSpamPercentage}%`,
            minLength: config.symbolSpamMinLength,
            originalMessage: message,
            checkType: 'symbolSpam', // Consistent camelCase for checkType identifiers
        };

        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
