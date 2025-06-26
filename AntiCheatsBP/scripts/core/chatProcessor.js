/**
 * @file Handles all chat message processing, including checks and formatting.
 */
import * as mc from '@minecraft/server'; // Standard import

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
    // const minecraftSystem = dependencies.mc.system; // Use mc.system directly from import

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

        // Standardized checkType strings (e.g., 'playerChatDuringCombat' is already compliant)
        if (config.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
            const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
            if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
                const profile = config.checkActionProfiles?.['playerChatDuringCombat']; // Access with standardized key
                if (profile?.enabled) {
                    if (profile.cancelMessage) eventData.cancel = true;
                    playerUtils.warnPlayer(player, getString(profile.messageKey || 'chat.error.combatCooldown', { seconds: config.chatDuringCombatCooldownSeconds }));
                    actionManager.executeCheckAction('playerChatDuringCombat', player, { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                    if (eventData.cancel) {
                        playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during combat).`, player.nameTag, dependencies);
                        return;
                    }
                }
            }
        }

        if (!eventData.cancel && config.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
            const itemUseState = pData.isUsingConsumable ? getString('check.inventoryMod.action.usingConsumable') : getString('check.inventoryMod.action.chargingBow');
            const profile = config.checkActionProfiles?.['playerChatDuringItemUse']; // Access with standardized key
            if (profile?.enabled) {
                if (profile.cancelMessage) eventData.cancel = true;
                playerUtils.warnPlayer(player, getString(profile.messageKey || 'chat.error.itemUse', { itemUseState: itemUseState }));
                actionManager.executeCheckAction('playerChatDuringItemUse', player, { itemUseState }, dependencies);
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during item use).`, player.nameTag, dependencies);
                    return;
                }
            }
        }

        if (pData.isChargingBow) { // Should this be before the item use check?
            pData.isChargingBow = false;
            pData.isDirtyForSave = true;
            playerUtils.debugLog(`[ChatProcessor] Cleared isChargingBow for ${player.nameTag} due to chat attempt.`, player.nameTag, dependencies);
        }

        // --- Standard Chat Checks ---
        const chatCheckFunctions = [
            { fn: checks.checkSwear, enabled: config.enableSwearCheck, name: 'SwearCheck' },
            { fn: checks.checkMessageRate, enabled: config.enableFastMessageSpamCheck, name: 'MessageRateCheck' },
            { fn: checks.checkChatContentRepeat, enabled: config.enableChatContentRepeatCheck, name: 'ChatContentRepeatCheck' },
            { fn: checks.checkUnicodeAbuse, enabled: config.enableUnicodeAbuseCheck, name: 'UnicodeAbuseCheck' },
            { fn: checks.checkGibberish, enabled: config.enableGibberishCheck, name: 'GibberishCheck' },
            { fn: checks.checkExcessiveMentions, enabled: config.enableExcessiveMentionsCheck, name: 'ExcessiveMentionsCheck' },
            { fn: checks.checkSimpleImpersonation, enabled: config.enableSimpleImpersonationCheck, name: 'SimpleImpersonationCheck' },
            { fn: checks.checkAntiAdvertising, enabled: config.enableAntiAdvertisingCheck, name: 'AntiAdvertisingCheck' },
            { fn: checks.checkCapsAbuse, enabled: config.enableCapsCheck, name: 'CapsAbuseCheck' },
            { fn: checks.checkCharRepeat, enabled: config.enableCharRepeatCheck, name: 'CharRepeatCheck' },
            { fn: checks.checkSymbolSpam, enabled: config.enableSymbolSpamCheck, name: 'SymbolSpamCheck' },
        ];

        for (const check of chatCheckFunctions) {
            if (!eventData.cancel && check.fn && check.enabled) {
                await check.fn(player, eventData, pData, dependencies);
                if (eventData.cancel) {
                    playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by ${check.name}.`, player.nameTag, dependencies);
                    return;
                }
            }
        }

        // Newline Check
        if (!eventData.cancel && config.enableNewlineCheck) {
            if (originalMessage.includes('\\n') || originalMessage.includes('\\r')) {
                playerUtils.warnPlayer(player, getString('chat.error.newline'));
                if (config.flagOnNewline) {
                    // Assuming 'chatNewline' is a defined checkType in actionProfiles
                    actionManager.executeCheckAction('chatNewline', player, { message: originalMessage.substring(0, 50) + (originalMessage.length > 50 ? '...' : '') }, dependencies);
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

        // Max Message Length Check
        if (!eventData.cancel && config.enableMaxMessageLengthCheck) {
            if (originalMessage.length > config.maxMessageLength) {
                playerUtils.warnPlayer(player, getString('chat.error.maxLength', { maxLength: config.maxMessageLength }));
                if (config.flagOnMaxMessageLength) {
                     // Assuming 'chatMaxlength' is a defined checkType in actionProfiles
                    actionManager.executeCheckAction('chatMaxlength', player, { messageLength: originalMessage.length, maxLength: config.maxMessageLength, messageSnippet: originalMessage.substring(0, 50) + (originalMessage.length > 50 ? '...' : '') }, dependencies);
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
            const rankElements = rankManager.getPlayerRankFormattedChatElements(player, dependencies);
            const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;

            mc.world.sendMessage(finalMessage); // Corrected: Use mc.world
            eventData.cancel = true; // Cancel original event as we've sent the formatted one

            logManager.addLog({ actionType: 'chatMessageSent', targetName: player.nameTag, details: originalMessage }, dependencies);
            playerUtils.debugLog(`[ChatProcessor] Sent formatted message for ${player.nameTag}. Original event cancelled.`, player.nameTag, dependencies);
        }
    } catch (error) {
        console.error(`[ChatProcessor] Error processing chat for ${player.nameTag}: ${error.stack || error}`);
        playerUtils.debugLog(`[ChatProcessor] Error for ${player.nameTag}: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({ actionType: 'error', context: 'chatProcessor.processChatMessage', details: `Player: ${player.nameTag}, Error: ${error.message}` }, dependencies);
        // Decide if to cancel the event on unhandled error, probably yes to prevent raw message.
        eventData.cancel = true;
    }
}
