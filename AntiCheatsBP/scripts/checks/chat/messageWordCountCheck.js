/**
 * @file AntiCheatsBP/scripts/checks/chat/messageWordCountCheck.js
 * Implements a check to detect if a player's chat message exceeds the maximum allowed word count.
 * @version 1.0.2
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
    const { config, playerUtils, actionManager } = dependencies; // Destructure needed parts

    if (!config.enableMaxWordsSpamCheck) {
        return false; // Check is disabled.
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const message = eventData.message;

    const wordCount = message.split(/\s+/).filter(str => str.length > 0).length;

    const threshold = config.maxWordsSpamThreshold ?? 50;
    const actionProfileName = config.maxWordsSPAMActionProfileName ?? "chatSpamMaxWords";

    // Attempt to get the profile directly from config to check cancelMessage.
    // Note: checkActionProfiles should be part of config.
    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (wordCount > threshold) {
        if (playerUtils.debugLog) { // Ensure debugLog exists
            playerUtils.debugLog(`MessageWordCountCheck: ${player.nameTag}'s message too long. Words: ${wordCount}, Threshold: ${threshold}`, dependencies, watchedPrefix);
        }

        const violationDetails = {
            wordCount: wordCount.toString(),
            maxWords: threshold.toString(),
            messageContent: message.length > 100 ? message.substring(0, 97) + "..." : message
        };

        // Call executeCheckAction via actionManager, passing the full dependencies object
        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

        // Check if the action profile resulted in cancellation.
        // This logic assumes that if a profile has `cancelMessage: true`, the actionManager
        // might not directly modify `eventData.cancel` but the profile itself dictates it.
        // If actionManager *does* modify eventData.cancel, this explicit check might be redundant.
        // For safety and clarity, checking the profile's intent here.
        if (actionProfile?.cancelMessage) {
            shouldCancel = true;
        }
    }
    // This check does not modify pData fields that require saving, so no need to mark as dirty.
    return shouldCancel;
}
