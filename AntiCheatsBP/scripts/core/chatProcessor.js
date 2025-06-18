/**
 * @file AntiCheatsBP/scripts/core/chatProcessor.js
 * @description Handles all chat message processing, including checks and formatting.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server'; // Only if mc.world.sendMessage is directly used here, otherwise mc comes from dependencies

/**
 * Processes a chat message, performing various checks and formatting.
 * @param {mc.Player} player The player who sent the message.
 * @param {import('../../types.js').PlayerAntiCheatData} pData Player's anti-cheat data.
 * @param {string} originalMessage The original message content.
 * @param {mc.ChatSendBeforeEvent} eventData The original chat event data to allow cancellation.
 * @param {import('../../types.js').CommandDependencies} dependencies Standard dependencies object.
 */
export async function processChatMessage(player, pData, originalMessage, eventData, dependencies) {
    const { config, playerUtils, checks, playerDataManager, logManager, actionManager, getString, rankManager, mc: minecraftSystem } = dependencies;

    if (!pData) {
        playerUtils.warnPlayer(player, getString("error.playerDataNotFound"));
        eventData.cancel = true;
        dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Cancelling chat for ${player.nameTag} due to missing pData.`, player.nameTag);
        return;
    }

    // Mute Check (Moved from eventHandlers.js)
    if (playerDataManager.isMuted(player, dependencies)) {
        const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
        const reason = muteInfo?.reason || getString("common.value.noReasonProvided");
        playerUtils.warnPlayer(player, getString("chat.error.muted"));
        eventData.cancel = true;
        logManager?.addLog?.({ actionType: 'chatAttemptMuted', targetName: player.nameTag, details: `Msg: "${originalMessage}". Reason: ${reason}` }, dependencies);
        dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Cancelling chat for ${player.nameTag} (muted). Reason: ${reason}`, player.nameTag);
        return;
    }

    // Combat/Item Use Checks (Moved from eventHandlers.js)
    if (config.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
        const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
        if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
            const profile = config.checkActionProfiles?.player_chat_during_combat;
            if (profile?.enabled) {
                if (profile.cancelMessage) eventData.cancel = true;
                playerUtils.warnPlayer(player, getString(profile.messageKey || "chat.error.combatCooldown", { seconds: config.chatDuringCombatCooldownSeconds }));
                actionManager?.executeCheckAction?.("playerChatDuringCombat", player, { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                if (eventData.cancel) {
                    dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during combat).`, player.nameTag);
                    return;
                }
            }
        }
    }

    if (!eventData.cancel && config.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
        const itemUseState = pData.isUsingConsumable ? getString("check.inventoryMod.action.usingConsumable") : getString("check.inventoryMod.action.chargingBow");
        const profile = config.checkActionProfiles?.player_chat_during_item_use;
        if (profile?.enabled) {
            if (profile.cancelMessage) eventData.cancel = true;
            playerUtils.warnPlayer(player, getString(profile.messageKey || "chat.error.itemUse", { itemUseState: itemUseState }));
            actionManager?.executeCheckAction?.("playerChatDuringItemUse", player, { itemUseState }, dependencies);
            if (eventData.cancel) {
                dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during item use).`, player.nameTag);
                return;
            }
        }
    }

    // Clear isChargingBow if chat is attempted (Moved from eventHandlers.js, seems like a specific game mechanic interaction)
    // This might be better placed in item use end event if available, or handled differently.
    // For now, keeping the logic as it was.
    if (pData.isChargingBow) {
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
        dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Cleared isChargingBow for ${player.nameTag} due to chat attempt.`, player.nameTag);
    }

    // --- Start of individual chat content checks --- (Moved from eventHandlers.js)
    // Each check can set eventData.cancel = true and return if message should be stopped.

    if (!eventData.cancel && checks?.checkSwear && config.enableSwearCheck) {
        await checks.checkSwear(player, eventData, pData, dependencies);
        if (eventData.cancel) {
             dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by SwearCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkMessageRate && config.enableFastMessageSpamCheck) {
        const cancelFromMessageRate = await checks.checkMessageRate(player, eventData, pData, dependencies);
        if (cancelFromMessageRate) { // checkMessageRate might directly set eventData.cancel or return a boolean
            eventData.cancel = true;
        }
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by MessageRateCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkChatContentRepeat && config.enableChatContentRepeatCheck) {
        await checks.checkChatContentRepeat(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by ChatContentRepeatCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkUnicodeAbuse && config.enableUnicodeAbuseCheck) {
        await checks.checkUnicodeAbuse(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by UnicodeAbuseCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkGibberish && config.enableGibberishCheck) {
        await checks.checkGibberish(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by GibberishCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkExcessiveMentions && config.enableExcessiveMentionsCheck) {
        await checks.checkExcessiveMentions(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by ExcessiveMentionsCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkSimpleImpersonation && config.enableSimpleImpersonationCheck) {
        await checks.checkSimpleImpersonation(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by SimpleImpersonationCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && config.enableNewlineCheck) {
        if (originalMessage.includes('\\n') || originalMessage.includes('\\r')) {
            playerUtils.warnPlayer(player, getString("chat.error.newline"));
            if (config.flagOnNewline) {
                playerDataManager.addFlag(player, "chatNewline", "Newline character detected in chat message.", { message: originalMessage }, dependencies);
            }
            if (config.cancelMessageOnNewline) {
                eventData.cancel = true;
            }
            if (eventData.cancel) {
                dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by NewlineCheck.`, player.nameTag);
                return;
            }
        }
    }

    if (!eventData.cancel && config.enableMaxMessageLengthCheck) {
        if (originalMessage.length > config.maxMessageLength) {
            playerUtils.warnPlayer(player, getString("chat.error.maxLength", { maxLength: config.maxMessageLength }));
            if (config.flagOnMaxMessageLength) {
                playerDataManager.addFlag(player, "chatMaxlength", "Message exceeded maximum configured length.", { message: originalMessage, maxLength: config.maxMessageLength }, dependencies);
            }
            if (config.cancelOnMaxMessageLength) {
                eventData.cancel = true;
            }
            if (eventData.cancel) {
                dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by MaxMessageLengthCheck.`, player.nameTag);
                return;
            }
        }
    }

    if (!eventData.cancel && checks?.checkAntiAdvertising && config.enableAntiAdvertisingCheck) {
        await checks.checkAntiAdvertising(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by AntiAdvertisingCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkCapsAbuse && config.enableCapsCheck) {
        await checks.checkCapsAbuse(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by CapsAbuseCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkCharRepeat && config.enableCharRepeatCheck) {
        await checks.checkCharRepeat(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by CharRepeatCheck.`, player.nameTag);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkSymbolSpam && config.enableSymbolSpamCheck) {
        await checks.checkSymbolSpam(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Chat cancelled for ${player.nameTag} by SymbolSpamCheck.`, player.nameTag);
            return;
        }
    }

    // --- End of individual chat content checks ---

    // Final message formatting and sending (Moved from eventHandlers.js)
    if (!eventData.cancel) {
        const rankElements = rankManager.getPlayerRankFormattedChatElements(player, dependencies);
        const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;

        // Use minecraftSystem which is mc from dependencies
        minecraftSystem.world.sendMessage(finalMessage);
        eventData.cancel = true; // Cancel original event because we've sent our formatted one

        logManager?.addLog?.({ actionType: 'chatMessageSent', targetName: player.nameTag, details: originalMessage }, dependencies);
        dependencies.playerUtils.debugLog(dependencies, `[ChatProcessor] Sent formatted message for ${player.nameTag}. Original event cancelled.`, player.nameTag);
    }
}
