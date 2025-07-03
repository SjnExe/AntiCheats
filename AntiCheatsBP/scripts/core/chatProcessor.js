/**
 * @file Handles all chat message processing, including checks and formatting.
 */
import * as mc from '@minecraft/server';

const maxMessageSnippetLength = 50;

/**
 * Processes an incoming chat message, performing various checks and formatting.
 * This function is typically called from a `beforeChatSend` event handler.
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The AntiCheat data for the player.
 * @param {string} originalMessage - The original raw message content.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data, used for cancellation.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function processChatMessage(player, pData, originalMessage, eventData, dependencies) {
    const { config, playerUtils, checks, playerDataManager, logManager, actionManager, getString, rankManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    try {
        if (!pData) {
            playerUtils?.warnPlayer(player, getString('error.playerDataNotFound'));
            eventData.cancel = true;
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} due to missing pData.`, playerName, dependencies);
            return;
        }

        if (playerDataManager?.isMuted(player, dependencies)) {
            const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
            const reason = muteInfo?.reason ?? getString('common.value.noReasonProvided');
            playerUtils?.warnPlayer(player, getString('chat.error.muted'));
            eventData.cancel = true;
            logManager?.addLog({ actionType: 'chatAttemptMuted', targetName: playerName, details: `Msg: '${originalMessage}'. Reason: ${reason}` }, dependencies);
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (muted). Reason: ${reason}`, playerName, dependencies);
            return;
        }

        if (config?.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
            const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
            if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
                const profile = config.checkActionProfiles?.['playerChatDuringCombat'];
                if (profile?.enabled) {
                    if (profile.cancelMessage) eventData.cancel = true;
                    playerUtils?.warnPlayer(player, getString(profile.messageKey || 'chat.error.combatCooldown', { seconds: config.chatDuringCombatCooldownSeconds }));
                    await actionManager?.executeCheckAction(player, 'playerChatDuringCombat', { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                    if (eventData.cancel) {
                        playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (chat during combat).`, playerName, dependencies);
                        return;
                    }
                }
            }
        }

        if (!eventData.cancel && config?.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
            const itemUseState = pData.isUsingConsumable ? getString('check.inventoryMod.action.usingConsumable') : getString('check.inventoryMod.action.chargingBow');
            const profile = config.checkActionProfiles?.['playerChatDuringItemUse'];
            if (profile?.enabled) {
                if (profile.cancelMessage) eventData.cancel = true;
                playerUtils?.warnPlayer(player, getString(profile.messageKey || 'chat.error.itemUse', { itemUseState: itemUseState }));
                await actionManager?.executeCheckAction(player, 'playerChatDuringItemUse', { itemUseState }, dependencies);
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cancelling chat for ${playerName} (chat during item use).`, playerName, dependencies);
                    return;
                }
            }
        }

        if (pData.isChargingBow) { // This state might be better managed directly within the bow check or item use handler
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
            { fn: checks?.checkAntiAdvertising, enabled: config?.enableAntiAdvertisingCheck, name: 'antiAdvertisingCheck' },
            { fn: checks?.checkCapsAbuse, enabled: config?.enableCapsCheck, name: 'capsAbuseCheck' },
            { fn: checks?.checkCharRepeat, enabled: config?.enableCharRepeatCheck, name: 'charRepeatCheck' },
            { fn: checks?.checkSymbolSpam, enabled: config?.enableSymbolSpamCheck, name: 'symbolSpamCheck' },
        ];

        for (const check of chatCheckFunctions) {
            if (!eventData.cancel && check.fn && check.enabled) {
                await check.fn(player, eventData, pData, dependencies);
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by ${check.name}.`, playerName, dependencies);
                    return; // Stop further processing if a check cancels the message
                }
            }
        }

        if (!eventData.cancel && config?.enableNewlineCheck) {
            if (originalMessage.includes('\n') || originalMessage.includes('\r')) {
                playerUtils?.warnPlayer(player, getString('chat.error.newline'));
                if (config.flagOnNewline) {
                    const messageSnippet = originalMessage.substring(0, maxMessageSnippetLength) + (originalMessage.length > maxMessageSnippetLength ? '...' : '');
                    await actionManager?.executeCheckAction(player, 'chatNewline', { message: messageSnippet }, dependencies);
                }
                if (config.cancelMessageOnNewline) eventData.cancel = true;
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by NewlineCheck.`, playerName, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel && config?.enableMaxMessageLengthCheck) {
            if (originalMessage.length > config.maxMessageLength) {
                playerUtils?.warnPlayer(player, getString('chat.error.maxLength', { maxLength: config.maxMessageLength }));
                if (config.flagOnMaxMessageLength) {
                    const messageSnippet = originalMessage.substring(0, maxMessageSnippetLength) + (originalMessage.length > maxMessageSnippetLength ? '...' : '');
                    await actionManager?.executeCheckAction(player, 'chatMaxLength', { messageLength: originalMessage.length, maxLength: config.maxMessageLength, messageSnippet: messageSnippet }, dependencies);
                }
                if (config.cancelOnMaxMessageLength) eventData.cancel = true;
                if (eventData.cancel) {
                    playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by MaxMessageLengthCheck.`, playerName, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel) {
            const rankElements = rankManager?.getPlayerRankFormattedChatElements(player, dependencies);
            if (rankElements) {
                const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${playerName}§f: ${rankElements.messageColor}${originalMessage}`;
                mc.world.sendMessage(finalMessage);
                eventData.cancel = true; // Cancel original vanilla message
                logManager?.addLog({ actionType: 'chatMessageSent', targetName: playerName, details: originalMessage }, dependencies);
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Sent formatted message for ${playerName}. Original event cancelled.`, playerName, dependencies);
            } else {
                // If rank elements can't be fetched, let vanilla handle it or log an error.
                // For now, let vanilla handle it, but log a debug warning.
                playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Rank elements not available for ${playerName}. Vanilla message will proceed if not cancelled by other checks.`, playerName, dependencies);
            }
        }
    } catch (error) {
        console.error(`[ChatProcessor.processChatMessage] Error processing chat for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({ actionType: 'errorChatProcessing', context: 'chatProcessor.processChatMessage', details: `Player: ${playerName}, Error: ${error.message}`, error: error.stack || error }, dependencies);
        eventData.cancel = true; // Cancel on error to prevent potentially malformed or unhandled messages
    }
}
