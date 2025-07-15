/**
 * @file Detects excessive symbol usage in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/symbolSpamCheck
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive symbol usage.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkSymbolSpam(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableSymbolSpamCheck) {
        return;
    }

    const actionProfileKey = config?.symbolSpamActionProfileName ?? 'chatSymbolSpamDetected';

    const minLength = config?.symbolSpamMinLength ?? 10;
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

    const percentageThreshold = config?.symbolSpamPercentage ?? 50;
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

        // Determine if message should be cancelled before awaiting actionManager
        const profile = dependencies.checkActionProfiles?.[actionProfileKey];
        const shouldCancelMessage = profile?.cancelMessage;

        if (shouldCancelMessage) {
            eventData.cancel = true;
        }

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
    }
}
