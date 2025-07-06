/**
 * @file Implements a check to detect players sending chat messages too frequently (spamming).
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player is sending messages too frequently.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 *
 * @async
 * @param {mc.Player} player - The player sending the message.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, used for message content and cancellation.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastChatMessageTimestamp`.
 * @param {CommandDependencies} dependencies - The full dependencies object.
 * @returns {Promise<void>} A promise that resolves when the check is complete.
 */
export async function checkMessageRate(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableFastMessageSpamCheck) {
        return;
    }

    if (!pData) {
        playerUtils.debugLog(`[MessageRateCheck] pData is null for ${player.nameTag}, skipping check.`, player.nameTag, dependencies);
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    const threshold = config.fastMessageSpamThresholdMs ?? 500;
    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config.fastMessageSpamActionProfileName ?? 'chatSpamFastMessage'; // Default is already camelCase
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());
    const profile = config.checkActionProfiles?.[actionProfileKey];

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = currentTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            playerUtils.debugLog(`[MessageRateCheck] ${player.nameTag} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPrefix, dependencies);

            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message.length > 100 ? eventData.message.substring(0, 97) + '...' : eventData.message,
            };
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            if (profile?.cancelMessage) {
                eventData.cancel = true;
            }
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    pData.isDirtyForSave = true;
}
