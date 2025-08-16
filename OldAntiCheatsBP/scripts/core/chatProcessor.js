import * as mc from '@minecraft/server';
const defaultChatDuringCombatCooldownSeconds = 4;

const allChatChecks = [
    { fnName: 'checkSwear', configKey: 'swear', configParent: 'chatChecks', name: 'swearCheck' },
    { fnName: 'checkMessageRate', configKey: 'fastMessage', configParent: 'chatChecks', name: 'messageRateCheck' },
    { fnName: 'checkChatContentRepeat', configKey: 'contentRepeat', configParent: 'chatChecks', name: 'chatContentRepeatCheck' },
    { fnName: 'checkUnicodeAbuse', configKey: 'unicodeAbuse', configParent: 'chatChecks', name: 'unicodeAbuseCheck' },
    { fnName: 'checkGibberish', configKey: 'gibberish', configParent: 'chatChecks', name: 'gibberishCheck' },
    { fnName: 'checkExcessiveMentions', configKey: 'excessiveMentions', configParent: 'chatChecks', name: 'excessiveMentionsCheck' },
    { fnName: 'checkSimpleImpersonation', configKey: 'simpleImpersonation', configParent: 'chatChecks', name: 'simpleImpersonationCheck' },
    { fnName: 'checkAntiAdvertising', configKey: 'advertising', configParent: 'chatChecks', name: 'antiAdvertisingCheck' },
    { fnName: 'checkCapsAbuse', configKey: 'caps', configParent: 'chatChecks', name: 'capsAbuseCheck' },
    { fnName: 'checkCharRepeat', configKey: 'charRepeat', configParent: 'chatChecks', name: 'charRepeatCheck' },
    { fnName: 'checkSymbolSpam', configKey: 'symbolSpam', configParent: 'chatChecks', name: 'symbolSpamCheck' },
    { fnName: 'checkNewline', configKey: 'enableNewlineCheck', configParent: null, name: 'newlineCheck' },
    { fnName: 'checkMaxLength', configKey: 'enableMaxMessageLengthCheck', configParent: null, name: 'maxLengthCheck' },
];
/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {string} originalMessage
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData
 * @param {import('../types.js').Dependencies} dependencies
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
            if (timeSinceCombat < (config.chatDuringCombatCooldownSeconds ?? defaultChatDuringCombatCooldownSeconds)) {
                const profile = dependencies.checkActionProfiles?.playerChatDuringCombat;
                if (profile?.enabled) {
                    if (profile.cancelMessage !== false) {
                        eventData.cancel = true;
                    }
                    playerUtils?.warnPlayer(player, playerUtils.getString(profile.messageKey || 'chat.error.combatCooldown', dependencies, { seconds: config.chatDuringCombatCooldownSeconds ?? defaultChatDuringCombatCooldownSeconds }));
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
        if (!eventData.cancel && (pData.isChargingBow || pData.isUsingConsumable)) {
            const stateCleared = pData.isChargingBow ? 'isChargingBow' : 'isUsingConsumable';
            pData.isChargingBow = false;
            pData.isUsingConsumable = false;
            pData.isDirtyForSave = true;
            playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Cleared ${stateCleared} for ${playerName} because a successful chat attempt interrupts the action.`, playerName, dependencies);
        }
        for (const check of allChatChecks) {
            if (eventData.cancel) break;

            const isEnabled = check.configParent
                ? config[check.configParent]?.[check.configKey]?.enabled
                : config[check.configKey];

            if (isEnabled) {
                const checkFunction = checks[check.fnName];
                if (typeof checkFunction === 'function') {
                    await checkFunction(player, eventData, pData, dependencies);
                    if (eventData.cancel) {
                        playerUtils?.debugLog(`[ChatProcessor.processChatMessage] Chat cancelled for ${playerName} by ${check.name}.`, playerName, dependencies);
                        return;
                    }
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
