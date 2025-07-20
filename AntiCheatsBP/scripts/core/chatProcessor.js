/**
 * @file Handles chat message processing, checks, and formatting.
 * @module AntiCheatsBP/scripts/core/chatProcessor
 */
import * as mc from '@minecraft/server';
const MAX_MESSAGE_SNIPPET_LENGTH = 50;
const DEFAULT_CHAT_DURING_COMBAT_COOLDOWN_SECONDS = 4;
const DEFAULT_MAX_MESSAGE_LENGTH = 256;
/**
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('../types.js').PlayerAntiCheatData} pData The player's data.
 * @param {string} originalMessage The original message content.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies object.
 */
export async function processChatMessage(player, pData, originalMessage, eventData, dependencies) {
    const { config, playerUtils, checks, playerDataManager, logManager, actionManager, rankManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    try {
        if (!player?.isValid()) {
            console.warn('[ChatProcessor.processChatMessage] Invalid player object received.');
            eventData.cancel = true;
            return;
        }
        if (!pData) {
            playerUtils?.warnPlayer(player, playerUtils.getString('error.playerDataNotFound', dependencies));
            eventData.cancel = true;
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} due to missing pData.`, playerName, dependencies);
            return;
        }
        if (playerDataManager?.isMuted(player, dependencies)) {
            const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
            const reason = muteInfo?.reason ?? playerUtils.getString('common.value.noReasonProvided', dependencies);
            const formattedMuteMessage = playerUtils.getString('chat.error.mutedDetailed', dependencies, {
                reason,
                duration: muteInfo?.unmuteTime === Infinity ? playerUtils.getString('common.value.permanent', dependencies) : playerUtils.formatDurationFriendly(muteInfo?.unmuteTime - Date.now()),
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
                    playerUtils?.warnPlayer(player, playerUtils.getString(profile.messageKey || 'chat.error.combatCooldown', dependencies, { seconds: config.chatDuringCombatCooldownSeconds ?? DEFAULT_CHAT_DURING_COMBAT_COOLDOWN_SECONDS }));
                    await actionManager?.executeCheckAction(player, 'playerChatDuringCombat', { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                    if (eventData.cancel) {
                        playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (chat during combat).`, playerName, dependencies);
                        return;
                    }
                }
            }
        }
        if (!eventData.cancel && config?.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
            const itemUseState = pData.isUsingConsumable ? playerUtils.getString('check.inventoryMod.action.usingConsumable', dependencies) : playerUtils.getString('check.inventoryMod.action.chargingBow', dependencies);
            const profile = dependencies.checkActionProfiles?.playerChatDuringItemUse;
            if (profile?.enabled) {
                if (profile.cancelMessage !== false) {
                    eventData.cancel = true;
                }
                playerUtils?.warnPlayer(player, playerUtils.getString(profile.messageKey || 'chat.error.itemUse', dependencies, { itemUseState }));
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
            { fn: checks?.checkSwear, enabled: config?.chatChecks?.swear?.enabled, name: 'swearCheck' },
            { fn: checks?.checkMessageRate, enabled: config?.chatChecks?.fastMessage?.enabled, name: 'messageRateCheck' },
            { fn: checks?.checkChatContentRepeat, enabled: config?.chatChecks?.contentRepeat?.enabled, name: 'chatContentRepeatCheck' },
            { fn: checks?.checkUnicodeAbuse, enabled: config?.chatChecks?.unicodeAbuse?.enabled, name: 'unicodeAbuseCheck' },
            { fn: checks?.checkGibberish, enabled: config?.chatChecks?.gibberish?.enabled, name: 'gibberishCheck' },
            { fn: checks?.checkExcessiveMentions, enabled: config?.chatChecks?.excessiveMentions?.enabled, name: 'excessiveMentionsCheck' },
            { fn: checks?.checkSimpleImpersonation, enabled: config?.chatChecks?.simpleImpersonation?.enabled, name: 'simpleImpersonationCheck' },
            { fn: checks?.checkAntiAdvertising, enabled: config?.chatChecks?.advertising?.enabled, name: 'antiAdvertisingCheck' },
            { fn: checks?.checkCapsAbuse, enabled: config?.chatChecks?.caps?.enabled, name: 'capsAbuseCheck' },
            { fn: checks?.checkCharRepeat, enabled: config?.chatChecks?.charRepeat?.enabled, name: 'charRepeatCheck' },
            { fn: checks?.checkSymbolSpam, enabled: config?.chatChecks?.symbolSpam?.enabled, name: 'symbolSpamCheck' },
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
                playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.newline', dependencies));
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
                playerUtils?.warnPlayer(player, playerUtils.getString('chat.error.maxLength', dependencies, { maxLength: config.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH }));
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
                const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${playerName}§r${rankElements.chatSuffix}${playerUtils.getString('chat.format.separator', dependencies)}${rankElements.messageColor}${originalMessage}`;
                mc.world.sendMessage(finalMessage);
                eventData.cancel = true;
                logManager?.addLog({ actionType: 'chatMessageSent', targetName: playerName, targetId: player.id, details: originalMessage }, dependencies);
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Sent formatted message for ${playerName}. Original event cancelled.`, playerName, dependencies);
            } else {
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Rank elements not available for ${playerName}. Vanilla message will proceed if not cancelled by other checks.`, playerName, dependencies);
                logManager?.addLog({ actionType: 'chatMessageSentUnformatted', targetName: playerName, targetId: player.id, details: originalMessage }, dependencies);
            }
        }
        pData.isDirtyForSave = true;
    } catch (error) {
        console.error(`[ChatProcessor.processChatMessage CRITICAL] Error processing chat for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[ChatProcessor.processChatMessage CRITICAL] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({ actionType: 'errorChatProcessing', context: 'chatProcessor.processChatMessage', targetName: playerName, targetId: player?.id, details: `Player: ${playerName}, Error: ${error.message}`, errorStack: error.stack || error.toString() }, dependencies);
        eventData.cancel = true;
        throw error;
    }
}
