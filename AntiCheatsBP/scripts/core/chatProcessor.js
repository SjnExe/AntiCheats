/**
 * @file Handles all chat message processing, including checks and formatting.
 * @module AntiCheatsBP/scripts/core/chatProcessor
 */
import * as mc from '@minecraft/server';

// Constants
const MAX_MESSAGE_SNIPPET_LENGTH = 50; // Used for logging/debug, not a config default
const DEFAULT_CHAT_DURING_COMBAT_COOLDOWN_SECONDS = 4;
const DEFAULT_MAX_MESSAGE_LENGTH = 256;


/**
 * Processes an incoming chat message, performing various checks and formatting.
 * This function is typically called from a `beforeChatSend` event handler.
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The AntiCheat data for the player.
 * @param {string} originalMessage - The original raw message content.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data, used for cancellation.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function processChatMessage(player, pData, originalMessage, eventData, dependencies) {
    const { config, playerUtils, checks, playerDataManager, logManager, actionManager, rankManager } = dependencies; // getString removed
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    try {
        if (!player?.isValid()) {
            console.warn('[ChatProcessor.processChatMessage] Invalid player object received.');
            eventData.cancel = true;
            return;
        }

        if (!pData) {
            playerUtils?.warnPlayer(player, playerUtils.getString('error.playerDataNotFound', dependencies)); // MODIFIED
            eventData.cancel = true;
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} due to missing pData.`, playerName, dependencies);
            return;
        }

        if (playerDataManager?.isMuted(player, dependencies)) {
            const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
            const reason = muteInfo?.reason ?? playerUtils.getString('common.value.noReasonProvided', dependencies); // MODIFIED
            const formattedMuteMessage = playerUtils.getString('chat.error.mutedDetailed', dependencies, { // MODIFIED
                reason,
                duration: muteInfo?.unmuteTime === Infinity ? playerUtils.getString('common.value.permanent', dependencies) : playerUtils.formatDurationFriendly(muteInfo?.unmuteTime - Date.now()), // MODIFIED (formatDurationFriendly is on playerUtils)
            });
            playerUtils?.warnPlayer(player, formattedMuteMessage);
            eventData.cancel = true;
            logManager?.addLog({ actionType: 'chatAttemptMuted', targetName: playerName, targetId: player.id, details: `Msg: '${originalMessage}'. Reason: ${reason}` }, dependencies);
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (muted). Reason: ${reason}`, playerName, dependencies);
            return;
        }

        if (config?.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
            const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
            if (timeSinceCombat < (config.chatDuringCombatCooldownSeconds ?? DEFAULT_CHAT_DURING_COMBAT_COOLDOWN_SECONDS)) {
                const profile = dependencies.checkActionProfiles?.playerChatDuringCombat;
                if (profile?.enabled) {
                    if (profile.cancelMessage !== false) {
                        eventData.cancel = true;
                    }
                    playerUtils?.warnPlayer(player, playerUtils.getString(profile.messageKey || 'chat.error.combatCooldown', dependencies, { seconds: config.chatDuringCombatCooldownSeconds ?? DEFAULT_CHAT_DURING_COMBAT_COOLDOWN_SECONDS })); // MODIFIED
                    await actionManager?.executeCheckAction(player, 'playerChatDuringCombat', { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                    if (eventData.cancel) {
                        playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (chat during combat).`, playerName, dependencies);
                        return;
                    }
                }
            }
        }

        if (!eventData.cancel && config?.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
            const itemUseState = pData.isUsingConsumable ? playerUtils.getString('check.inventoryMod.action.usingConsumable', dependencies) : playerUtils.getString('check.inventoryMod.action.chargingBow', dependencies); // MODIFIED
            const profile = dependencies.checkActionProfiles?.playerChatDuringItemUse;
            if (profile?.enabled) {
                if (profile.cancelMessage !== false) {
                    eventData.cancel = true;
                }
                playerUtils?.warnPlayer(player, playerUtils.getString(profile.messageKey || 'chat.error.itemUse', dependencies, { itemUseState })); // MODIFIED
                await actionManager?.executeCheckAction(player, 'playerChatDuringItemUse', { itemUseState }, dependencies);
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (chat during item use: ${itemUseState}).`, playerName, dependencies);
                    return;
                }
            }
        }

        if (pData.isChargingBow) {
            pData.isChargingBow = false;
            pData.isDirtyForSave = true;
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cleared isChargingBow for ${playerName} due to chat attempt.`, playerName, dependencies);
        }

        const chatCheckFunctions = [
            { fn: checks?.checkSwear, enabled: config?.enableSwearCheck, name: 'swearCheck' },
            { fn: checks?.checkMessageRate, enabled: config?.enableFastMessageSpamCheck, name: 'messageRateCheck' },
            { fn: checks?.checkChatContentRepeat, enabled: config?.enableChatContentRepeatCheck, name: 'chatContentRepeatCheck' },
            { fn: checks?.checkUnicodeAbuse, enabled: config?.enableUnicodeAbuseCheck, name: 'unicodeAbuseCheck' },
            { fn: checks?.checkGibberish, enabled: config?.enableGibberishCheck, name: 'gibberishCheck' },
            { fn: checks?.checkExcessiveMentions, enabled: config?.enableExcessiveMentionsCheck, name: 'excessiveMentionsCheck' },
            { fn: checks?.checkSimpleImpersonation, enabled: config?.enableSimpleImpersonationCheck, name: 'simpleImpersonationCheck' },
            { fn: checks?.checkAntiAdvertising, enabled: config?.enableAntiAdvertisingCheck || config?.enableAdvancedLinkDetection, name: 'antiAdvertisingCheck' },
            { fn: checks?.checkCapsAbuse, enabled: config?.enableCapsCheck, name: 'capsAbuseCheck' },
            { fn: checks?.checkCharRepeat, enabled: config?.enableCharRepeatCheck, name: 'charRepeatCheck' },
            { fn: checks?.checkSymbolSpam, enabled: config?.enableSymbolSpamCheck, name: 'symbolSpamCheck' },
        ];

        for (const check of chatCheckFunctions) {
            if (eventData.cancel) {
                break;
            }
            if (check.fn && check.enabled) {
                await check.fn(player, eventData, pData, dependencies);
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by ${check.name}.`, playerName, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel && config?.enableNewlineCheck) {
            if (originalMessage.includes('\n') || originalMessage.includes('\r')) {
                playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.newline', dependencies)); // MODIFIED
                const messageSnippet = originalMessage.substring(0, MAX_MESSAGE_SNIPPET_LENGTH) + (originalMessage.length > MAX_MESSAGE_SNIPPET_LENGTH ? '...' : '');

                const shouldCancelForNewline = config.cancelMessageOnNewline !== false;

                if (shouldCancelForNewline) {
                    eventData.cancel = true;
                }

                if (config.flagOnNewline) {
                    await actionManager?.executeCheckAction(player, 'chatNewline', { message: messageSnippet }, dependencies);
                }

                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by NewlineCheck.`, playerName, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel && config?.enableMaxMessageLengthCheck) {
            if (originalMessage.length > (config.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH)) {
                playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.maxLength', dependencies, { maxLength: config.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH })); // MODIFIED
                const messageSnippet = originalMessage.substring(0, MAX_MESSAGE_SNIPPET_LENGTH) + (originalMessage.length > MAX_MESSAGE_SNIPPET_LENGTH ? '...' : '');

                const shouldCancelForMaxLength = config.cancelOnMaxMessageLength !== false;

                if (shouldCancelForMaxLength) {
                    eventData.cancel = true;
                }

                if (config.flagOnMaxMessageLength) {
                    await actionManager?.executeCheckAction(player, 'chatMaxLength', { messageLength: originalMessage.length, maxLength: config.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH, messageSnippet }, dependencies);
                }

                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by MaxMessageLengthCheck.`, playerName, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel) {
            const rankElements = rankManager?.getPlayerRankFormattedChatElements(player, dependencies);
            if (rankElements) {
                const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${playerName}§r${rankElements.chatSuffix}${playerUtils.getString('chat.format.separator', dependencies)}${rankElements.messageColor}${originalMessage}`; // MODIFIED
                mc.world.sendMessage(finalMessage);
                eventData.cancel = true;
                logManager?.addLog({ actionType: 'chatMessageSent', targetName: playerName, targetId: player.id, details: originalMessage }, dependencies);
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Sent formatted message for ${playerName}. Original event cancelled.`, playerName, dependencies);
            } else {
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Rank elements not available for ${playerName}. Vanilla message will proceed if not cancelled by other checks.`, playerName, dependencies);
                logManager?.addLog({ actionType: 'chatMessageSentUnformatted', targetName: playerName, targetId: player.id, details: originalMessage }, dependencies);
            }
        }
    } catch (error) {
        console.error(`[ChatProcessor.processChatMessage CRITICAL] Error processing chat for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[ChatProcessor.processChatMessage CRITICAL] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({ actionType: 'errorChatProcessing', context: 'chatProcessor.processChatMessage', targetName: playerName, targetId: player?.id, details: `Player: ${playerName}, Error: ${error.message}`, errorStack: error.stack || error.toString() }, dependencies);
        eventData.cancel = true;
    }
}
