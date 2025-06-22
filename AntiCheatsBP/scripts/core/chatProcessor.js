/**
 * @file AntiCheatsBP/scripts/core/chatProcessor.js
 * @description Handles all chat message processing, including checks and formatting.
 * @version 1.0.0
 */
import * as mc from '@minecraft/server';
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
        dependencies.playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} due to missing pData.`, player.nameTag, dependencies);
        return;
    }

    if (playerDataManager.isMuted(player, dependencies)) {
        const muteInfo = playerDataManager.getMuteInfo(player, dependencies);
        const reason = muteInfo?.reason || getString("common.value.noReasonProvided");
        playerUtils.warnPlayer(player, getString("chat.error.muted"));
        eventData.cancel = true;
        logManager?.addLog?.({ actionType: 'chatAttemptMuted', targetName: player.nameTag, details: `Msg: "${originalMessage}". Reason: ${reason}` }, dependencies);
        dependencies.playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (muted). Reason: ${reason}`, player.nameTag, dependencies);
        return;
    }

    if (config.enableChatDuringCombatCheck && pData.lastCombatInteractionTime) {
        const timeSinceCombat = (Date.now() - pData.lastCombatInteractionTime) / 1000;
        if (timeSinceCombat < config.chatDuringCombatCooldownSeconds) {
            const profile = config.checkActionProfiles?.player_chat_during_combat;
            if (profile?.enabled) {
                if (profile.cancelMessage) eventData.cancel = true;
                playerUtils.warnPlayer(player, getString(profile.messageKey || "chat.error.combatCooldown", { seconds: config.chatDuringCombatCooldownSeconds }));
                actionManager?.executeCheckAction?.("playerChatDuringCombat", player, { timeSinceCombat: timeSinceCombat.toFixed(1) }, dependencies);
                if (eventData.cancel) {
                    dependencies.playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during combat).`, player.nameTag, dependencies);
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
                dependencies.playerUtils.debugLog(`[ChatProcessor] Cancelling chat for ${player.nameTag} (chat during item use).`, player.nameTag, dependencies);
                return;
            }
        }
    }

    if (pData.isChargingBow) {
        pData.isChargingBow = false;
        pData.isDirtyForSave = true;
        dependencies.playerUtils.debugLog(`[ChatProcessor] Cleared isChargingBow for ${player.nameTag} due to chat attempt.`, player.nameTag, dependencies);
    }

    if (!eventData.cancel && checks?.checkSwear && config.enableSwearCheck) {
        await checks.checkSwear(player, eventData, pData, dependencies);
        if (eventData.cancel) {
             dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by SwearCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkMessageRate && config.enableFastMessageSpamCheck) {
        const cancelFromMessageRate = await checks.checkMessageRate(player, eventData, pData, dependencies);
        if (cancelFromMessageRate) {
            eventData.cancel = true;
        }
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by MessageRateCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkChatContentRepeat && config.enableChatContentRepeatCheck) {
        await checks.checkChatContentRepeat(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by ChatContentRepeatCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkUnicodeAbuse && config.enableUnicodeAbuseCheck) {
        await checks.checkUnicodeAbuse(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by UnicodeAbuseCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkGibberish && config.enableGibberishCheck) {
        await checks.checkGibberish(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by GibberishCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkExcessiveMentions && config.enableExcessiveMentionsCheck) {
        await checks.checkExcessiveMentions(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by ExcessiveMentionsCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkSimpleImpersonation && config.enableSimpleImpersonationCheck) {
        await checks.checkSimpleImpersonation(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by SimpleImpersonationCheck.`, player.nameTag, dependencies);
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
                dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by NewlineCheck.`, player.nameTag, dependencies);
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
                dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by MaxMessageLengthCheck.`, player.nameTag, dependencies);
                return;
            }
        }
    }

    if (!eventData.cancel && checks?.checkAntiAdvertising && config.enableAntiAdvertisingCheck) {
        await checks.checkAntiAdvertising(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by AntiAdvertisingCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkCapsAbuse && config.enableCapsCheck) {
        await checks.checkCapsAbuse(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by CapsAbuseCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkCharRepeat && config.enableCharRepeatCheck) {
        await checks.checkCharRepeat(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by CharRepeatCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel && checks?.checkSymbolSpam && config.enableSymbolSpamCheck) {
        await checks.checkSymbolSpam(player, eventData, pData, dependencies);
        if (eventData.cancel) {
            dependencies.playerUtils.debugLog(`[ChatProcessor] Chat cancelled for ${player.nameTag} by SymbolSpamCheck.`, player.nameTag, dependencies);
            return;
        }
    }

    if (!eventData.cancel) {
        const rankElements = rankManager.getPlayerRankFormattedChatElements(player, dependencies);
        const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;

        minecraftSystem.world.sendMessage(finalMessage);
        eventData.cancel = true;

        logManager?.addLog?.({ actionType: 'chatMessageSent', targetName: player.nameTag, details: originalMessage }, dependencies);
        dependencies.playerUtils.debugLog(`[ChatProcessor] Sent formatted message for ${player.nameTag}. Original event cancelled.`, player.nameTag, dependencies);
    }
}
