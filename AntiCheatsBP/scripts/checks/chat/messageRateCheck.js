/**
 * @file AntiCheatsBP/scripts/checks/chat/messageRateCheck.js
 * Implements a check to detect players sending chat messages too frequently (spamming).
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */
/**
 * Checks if a player is sending messages too frequently.
 * If a violation is detected, configured actions (flagging, logging, message cancellation) are executed.
 * @param {mc.Player} player - The player sending the message.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat event data, used for message content and cancellation.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastChatMessageTimestamp`.
 * @param {import('../../types.js').CommandDependencies} dependencies - The full dependencies object, including:
 * @param {Config} dependencies.config - The server configuration object.
 * @param {PlayerUtils} dependencies.playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} dependencies.playerDataManager - Manager for player data.
 * @param {LogManager} dependencies.logManager - Manager for logging.
 * @param {import('../../types.js').ActionManager} dependencies.actionManager - Manager for executing check actions.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the message should be cancelled due to spam, `false` otherwise.
 */
export async function checkMessageRate(
    player,
    eventData,
    pData,
    dependencies
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableFastMessageSpamCheck) {
        return false;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const currentTime = Date.now();
    const threshold = config.fastMessageSpamThresholdMs ?? 500;
    const actionProfileName = config.fastMessageSPAMActionProfileName ?? "chatSpamFastMessage";
    const actionProfile = config.checkActionProfiles?.[actionProfileName];

    let shouldCancel = false;

    if (pData.lastChatMessageTimestamp && pData.lastChatMessageTimestamp > 0) {
        const timeSinceLastMsgMs = currentTime - pData.lastChatMessageTimestamp;

        if (timeSinceLastMsgMs < threshold) {
            playerUtils.debugLog(`[MessageRateCheck] ${player.nameTag} sent message too fast. Diff: ${timeSinceLastMsgMs}ms, Threshold: ${threshold}ms`, watchedPrefix, dependencies);

            const violationDetails = {
                timeSinceLastMsgMs: timeSinceLastMsgMs.toString(),
                thresholdMs: threshold.toString(),
                messageContent: eventData.message
            };
            await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (actionProfile?.cancelMessage) {
                shouldCancel = true;
            }
        }
    }

    pData.lastChatMessageTimestamp = currentTime;
    pData.isDirtyForSave = true;

    return shouldCancel;
}
