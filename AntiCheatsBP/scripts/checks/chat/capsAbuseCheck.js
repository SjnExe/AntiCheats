/**
 * @file Detects excessive capitalization in chat messages.
 * @module AntiCheatsBP/scripts/checks/chat/capsAbuseCheck
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive capitalization.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkCapsAbuse(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableCapsCheck) {
        return;
    }

    const actionProfileKey = config?.capsCheckActionProfileName ?? 'chatCapsAbuseDetected';

    const minLength = config?.capsCheckMinLength ?? 10;
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

    const percentageThreshold = config?.capsCheckUpperCasePercentage ?? 70;
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
