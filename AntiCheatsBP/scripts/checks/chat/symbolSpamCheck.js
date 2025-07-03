/**
 * @file Implements a check to detect excessive symbol usage (non-alphanumeric, excluding spaces) in chat messages.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

const defaultMinLength = 10;
const defaultPercentageThreshold = 50;

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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.symbolSpamActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? 'chatSymbolSpamDetected';

    if (!config?.enableSymbolSpamCheck) {
        return;
    }

    const minLength = config?.symbolSpamMinLength ?? defaultMinLength;
    if (message.length < minLength) {
        return;
    }

    let totalCharsNonSpace = 0; // Count only non-space characters for the base
    let symbolChars = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === ' ') {
            continue; // Skip spaces for total character count relevant to symbol density
        }
        totalCharsNonSpace++;

        // Check if the character is NOT alphanumeric (a-z, A-Z, 0-9)
        if (!char.match(/[a-zA-Z0-9]/i)) { // Case-insensitive match for letters/numbers
            symbolChars++;
        }
    }

    if (totalCharsNonSpace === 0) { // Message was only spaces or empty after space removal
        return;
    }

    const symbolPercentage = (symbolChars / totalCharsNonSpace) * 100;
    const percentageThreshold = config?.symbolSpamPercentage ?? defaultPercentageThreshold;

    if (symbolPercentage >= percentageThreshold) {
        playerUtils?.debugLog(
            `[SymbolSpamCheck.execute] Player ${playerName} triggered symbol spam. ` +
            `Msg: '${message}', Symbols: ${symbolPercentage.toFixed(1)}% / ${totalCharsNonSpace} chars, ` +
            `Threshold: ${percentageThreshold}%, MinLength: ${minLength}`,
            pData?.isWatched ? playerName : null, dependencies
        );

        const violationDetails = {
            percentage: `${symbolPercentage.toFixed(1)}%`,
            threshold: `${percentageThreshold}%`,
            minLength: minLength.toString(), // Ensure string for details
            originalMessage: message,
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const profile = config?.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
