/**
 * @file Implements a check to detect excessive capitalization (CAPS abuse) in chat messages.
 * All actionProfileKey and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive capitalization.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - The player's anti-cheat data.
 * @param {Dependencies} dependencies - Shared command dependencies (includes config, actionManager, etc.).
 * @returns {Promise<void>}
 */
export async function checkCapsAbuse(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableCapsCheck) {
        return;
    }

    const rawActionProfileKey = config?.capsCheckActionProfileName ?? 'chatCapsAbuseDetected';
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const defaultMinLength = 10;
    const defaultPercentageThreshold = 70;

    const minLength = config?.capsCheckMinLength ?? defaultMinLength;
    if (message.length < minLength) {
        return;
    }

    let totalLetters = 0;
    let upperCaseLetters = 0;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char.toLowerCase() !== char.toUpperCase()) {
            totalLetters++;
            if (char === char.toUpperCase()) {
                upperCaseLetters++;
            }
        }
    }

    if (totalLetters === 0) {
        return;
    }

    const upperCasePercentage = (upperCaseLetters / totalLetters) * 100;
    const percentageThreshold = config?.capsCheckUpperCasePercentage ?? defaultPercentageThreshold;

    if (upperCasePercentage >= percentageThreshold) {
        const watchedPlayerName = pData?.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[CapsAbuseCheck] Player ${playerName} triggered CAPS abuse. ` +
            `Msg: '${message}', CAPS: ${upperCasePercentage.toFixed(1)}%, ` +
            `Threshold: ${percentageThreshold}%, MinLength: ${minLength}`,
            watchedPlayerName, dependencies,
        );

        const violationDetails = {
            percentage: `${upperCasePercentage.toFixed(1)}%`,
            threshold: `${percentageThreshold}%`,
            minLength: minLength.toString(),
            messageLength: message.length.toString(),
            lettersCount: totalLetters.toString(),
            upperCaseCount: upperCaseLetters.toString(),
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
