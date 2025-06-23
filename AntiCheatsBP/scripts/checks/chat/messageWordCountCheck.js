/**
 * Implements a check to detect if a player's chat message exceeds the maximum allowed word count.
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks if a player's message exceeds the maximum allowed word count.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 * @param {mc.Player} player - The player sending the message.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, containing the message.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, etc.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled, `false` otherwise.
 */
export async function checkMessageWordCount(
    player,
    pData,
    eventData,
    dependencies
) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableMaxWordsSpamCheck) {
        return false;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const message = eventData.message;

    const wordCount = message.split(/\s+/).filter(str => str.length > 0).length;

    const threshold = config.maxWordsSpamThreshold ?? 50;
    const actionProfileName = config.maxWordsSPAMActionProfileName ?? "chatSpamMaxWords";

    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (wordCount > threshold) {
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`MessageWordCountCheck: ${player.nameTag}'s message too long. Words: ${wordCount}, Threshold: ${threshold}`, dependencies, watchedPrefix);
        }

        const violationDetails = {
            wordCount: wordCount.toString(),
            maxWords: threshold.toString(),
            messageContent: message.length > 100 ? message.substring(0, 97) + "..." : message
        };

        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

        if (actionProfile?.cancelMessage) {
            shouldCancel = true;
        }
    }
    return shouldCancel;
}
