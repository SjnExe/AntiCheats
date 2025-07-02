/**
 * @file Handles all chat message processing, including checks and formatting.
 */
import * as mc from '@minecraft/server';

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
    try {
        if (!pData) {
            playerUtils.warnPlayer(player, getString('error.playerDataNotFound'));
            eventData.cancel = true;
            playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} due to missing pData.`, player.nameTag, dependencies);
            return;
        }

        if (playerDataManager.isMuted(player, dependencies)) {
            const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
            const reason = muteInfo?.reason || getString('common.value.noReasonProvided');
            playerUtils.warnPlayer(player, getString('chat.error.muted'));
            eventData.cancel = true;
            logManager.addLog({ actionType: 'chatAttemptMuted', targetName: player.nameTag, details: `Msg: '${originalMessage}'. Reason: ${reason}` }, dependencies);
            playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (muted). Reason: ${reason}`, player.nameTag, dependencies);
            return;
        }

        if (config.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
            const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
            if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
                const profile = config.checkActionProfiles?.['playerChatDuringCombat'];
                if (profile?.enabled) {
                    if (profile.cancelMessage) {
                        eventData.cancel = true;
                    }
                    playerUtils.warnPlayer(player, getString(profile.messageKey || 'chat.error.combatCooldown', { seconds: config.chatDuringCombatCooldownSeconds }));
                    // Assuming executeCheckAction uses camelCase 'playerChatDuringCombat'
                    await actionManager.executeCheckAction(player, 'playerChatDuringCombat', { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                    if (eventData.cancel) {
                        playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during combat).`, player.nameTag, dependencies);
                        return;
                    }
                }
            }
        }

        if (!eventData.cancel && config.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
            const itemUseState = pData.isUsingConsumable ? getString('check.inventoryMod.action.usingConsumable') : getString('check.inventoryMod.action.chargingBow');
            const profile = config.checkActionProfiles?.['playerChatDuringItemUse'];
            if (profile?.enabled) {
                if (profile.cancelMessage) {
                    eventData.cancel = true;
                }
                playerUtils.warnPlayer(player, getString(profile.messageKey || 'chat.error.itemUse', { itemUseState: itemUseState }));
                // Assuming executeCheckAction uses camelCase 'playerChatDuringItemUse'
                await actionManager.executeCheckAction(player, 'playerChatDuringItemUse', { itemUseState }, dependencies);
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during item use).`, player.nameTag, dependencies);
                    return;
                }
            }
        }

        if (pData.isChargingBow) { // If player was charging bow, chatting stops it
            pData.isChargingBow = false;
            pData.isDirtyForSave = true;
            playerUtils.debugLog(`[ChatProcessor] Cleared isChargingBow for ${player.nameTag} due to chat attempt.`, player.nameTag, dependencies);
        }

        // Standardized check names to camelCase for consistency if they were different before
        const chatCheckFunctions = [
            { fn: checks.checkSwear, enabled: config.enableSwearCheck, name: 'swearCheck' },
            { fn: checks.checkMessageRate, enabled: config.enableFastMessageSpamCheck, name: 'messageRateCheck' },
            { fn: checks.checkChatContentRepeat, enabled: config.enableChatContentRepeatCheck, name: 'chatContentRepeatCheck' },
            { fn: checks.checkUnicodeAbuse, enabled: config.enableUnicodeAbuseCheck, name: 'unicodeAbuseCheck' },
            { fn: checks.checkGibberish, enabled: config.enableGibberishCheck, name: 'gibberishCheck' },
            { fn: checks.checkExcessiveMentions, enabled: config.enableExcessiveMentionsCheck, name: 'excessiveMentionsCheck' },
            { fn: checks.checkSimpleImpersonation, enabled: config.enableSimpleImpersonationCheck, name: 'simpleImpersonationCheck' },
            { fn: checks.checkAntiAdvertising, enabled: config.enableAntiAdvertisingCheck, name: 'antiAdvertisingCheck' }, // Includes advanced if enabled
            { fn: checks.checkCapsAbuse, enabled: config.enableCapsCheck, name: 'capsAbuseCheck' },
            { fn: checks.checkCharRepeat, enabled: config.enableCharRepeatCheck, name: 'charRepeatCheck' },
            { fn: checks.checkSymbolSpam, enabled: config.enableSymbolSpamCheck, name: 'symbolSpamCheck' },
        ];

        for (const check of chatCheckFunctions) {
            if (!eventData.cancel && check.fn && check.enabled) {
                await check.fn(player, eventData, pData, dependencies);
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by ${check.name}.`, player.nameTag, dependencies);
                    return; // Stop further processing if a check cancels
                }
            }
        }

        if (!eventData.cancel && config.enableNewlineCheck) {
            if (originalMessage.includes('\n') || originalMessage.includes('\r')) { // Check for actual newline characters
                playerUtils.warnPlayer(player, getString('chat.error.newline'));
                if (config.flagOnNewline) {
                    // Assuming executeCheckAction uses camelCase 'chatNewline'
                    await actionManager.executeCheckAction(player, 'chatNewline', { message: originalMessage.substring(0, 50) + (originalMessage.length > 50 ? '...' : '') }, dependencies);
                }
                if (config.cancelMessageOnNewline) {
                    eventData.cancel = true;
                }
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by NewlineCheck.`, player.nameTag, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel && config.enableMaxMessageLengthCheck) {
            if (originalMessage.length > config.maxMessageLength) {
                playerUtils.warnPlayer(player, getString('chat.error.maxLength', { maxLength: config.maxMessageLength }));
                if (config.flagOnMaxMessageLength) {
                    // Assuming executeCheckAction uses camelCase 'chatMaxLength'
                    await actionManager.executeCheckAction(player, 'chatMaxLength', { messageLength: originalMessage.length, maxLength: config.maxMessageLength, messageSnippet: originalMessage.substring(0, 50) + (originalMessage.length > 50 ? '...' : '') }, dependencies);
                }
                if (config.cancelOnMaxMessageLength) {
                    eventData.cancel = true;
                }
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by MaxMessageLengthCheck.`, player.nameTag, dependencies);
                    return;
                }
            }
        }

        if (!eventData.cancel) {
            // Format and send the message
            const rankElements = rankManager.getPlayerRankFormattedChatElements(player, dependencies);
            const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;
            mc.world.sendMessage(finalMessage);
            eventData.cancel = true; // Cancel original event as we've sent a formatted one
            logManager.addLog({ actionType: 'chatMessageSent', targetName: player.nameTag, details: originalMessage }, dependencies);
            playerUtils.debugLog(`[ChatProcessor] Sent formatted message for ${player.nameTag}. Original event cancelled.`, player.nameTag, dependencies);
        }
    } catch (error) {
        console.error(`[ChatProcessor] Error processing chat for ${player.nameTag}: ${error.stack || error}`);
        playerUtils.debugLog(`[ChatProcessor] Error for ${player.nameTag}: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({ actionType: 'error', context: 'chatProcessor.processChatMessage', details: `Player: ${player.nameTag}, Error: ${error.message}` }, dependencies);
        eventData.cancel = true; // Ensure message is cancelled on error
    }
}
