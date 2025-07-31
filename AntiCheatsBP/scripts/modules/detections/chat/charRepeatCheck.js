/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a chat message for excessive character repetition.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkCharRepeat(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableCharRepeatCheck) {
        return;
    }

    const actionProfileKey = config?.charRepeatActionProfileName ?? 'chatCharRepeatDetected';

    const minLength = config?.charRepeatMinLength ?? 5;
    const threshold = config?.charRepeatThreshold ?? 5;

    if (message.length < minLength) {
        return;
    }

    // This regex finds any character (.) that is followed by itself (\1)
    // {threshold - 1} or more times. This is more efficient as it
    // stops on the first match that meets the criteria.
    const repeatPattern = new RegExp(`(.)\\1{${threshold - 1},}`);
    const match = message.match(repeatPattern);

    if (match) {
        const charThatRepeated = match[1];
        const repeatCount = match[0].length;

        const watchedPlayerName = pData?.isWatched ? playerName : null;
        playerUtils?.debugLog(
            `[CharRepeatCheck] Player ${playerName} triggered char repeat. ` +
            `Msg: '${message}', Char: '${charThatRepeated}', Count: ${repeatCount}, ` +
            `Threshold: ${threshold}, MinLength: ${minLength}`,
            watchedPlayerName, dependencies,
        );

        const violationDetails = {
            char: charThatRepeated,
            count: repeatCount.toString(),
            threshold: threshold.toString(),
            messageLength: message.length.toString(),
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
