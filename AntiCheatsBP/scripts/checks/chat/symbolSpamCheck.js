/**
 * @file Implements a check to detect excessive symbol usage (non-alphanumeric, excluding spaces) in chat messages.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
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
 * @param {Dependencies} dependencies - Shared command dependencies.
 * @returns {Promise<void>}
 */
export async function checkSymbolSpam(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSymbolSpamCheck) {
        return;
    }

    const rawActionProfileKey = config?.symbolSpamActionProfileName ?? 'chatSymbolSpamDetected';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const minLength = config?.symbolSpamMinLength ?? defaultMinLength;
    if (message.length < minLength) {
        return;
    }

    let totalCharsNonSpace = 0;
    let symbolChars = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === ' ') {
            continue;
        }
        totalCharsNonSpace++;

        if (!/^[a-zA-Z0-9]$/.test(char)) {
            symbolChars++;
        }
    }

    if (totalCharsNonSpace === 0) {
        return;
    }

    const symbolPercentage = (symbolChars / totalCharsNonSpace) * 100;
    const percentageThreshold = config?.symbolSpamPercentage ?? defaultPercentageThreshold;

    if (symbolPercentage >= percentageThreshold) {
        const watchedPlayerName = pData?.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[SymbolSpamCheck] Player ${playerName} triggered symbol spam. ` +
            `Msg: '${message}', Symbols: ${symbolPercentage.toFixed(1)}% (${symbolChars}/${totalCharsNonSpace} non-space chars), ` +
            `Threshold: ${percentageThreshold}%, MinMsgLength: ${minLength}`,
            watchedPlayerName, dependencies,
        );

        const violationDetails = {
            percentage: `${symbolPercentage.toFixed(1)}%`,
            threshold: `${percentageThreshold}%`,
            symbolCount: symbolChars.toString(),
            totalNonSpaceChars: totalCharsNonSpace.toString(),
            minLength: minLength.toString(),
            originalMessage: message,
        };

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        if (profile?.cancelMessage) {
            eventData.cancel = true;
        }
    }
}
