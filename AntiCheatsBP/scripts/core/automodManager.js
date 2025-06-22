/**
 * @file AntiCheatsBP/scripts/core/automodManager.js
 * Manages automated moderation actions based on player flags and configured rules.
 * @version 1.0.2
 */
/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1d 2h 30m 15s").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} A human-readable duration string. Returns "Permanent" if ms is Infinity.
 */
function formatDuration(ms) {
    if (ms === Infinity) return "Permanent";
    if (ms < 1000) return `${ms}ms`;

    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}
/**
 * Formats an AutoMod message template with context-specific data.
 * Replaces placeholders in a template string with actual values.
 * @param {string} template - The message template string.
 * @param {object} context - An object containing placeholder keys and their values.
 *                           Example: { playerName: "Steve", actionType: "warn", duration: "5m" }
 * @returns {string} The formatted message. Returns the original template if it's falsy or context is missing.
 */
function formatAutomodMessage(template, context) {
    if (!template || typeof template !== 'string' || !context || typeof context !== 'object') {
        return template || "";
    }

    let message = template;
    for (const key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
            const placeholder = `{${key}}`;
            const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            message = message.replace(regex, String(context[key]));
        }
    }
    return message;
}
/**
 * Internal function to dispatch and execute specific automod actions.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, config, playerDataManager } = dependencies;
    playerUtils.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player.nameTag} due to ${checkType}. Rule Params: ${JSON.stringify(parameters)}`, player.nameTag, dependencies);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;
    let finalTeleportDesc = "N/A";
    let removedItemCount = 0;

    const flagCount = pData.flags[checkType]?.count || 0;
    const flagThreshold = parameters.flagThreshold || 0;

    const baseMessageContext = {
        playerName: player.nameTag,
        actionType: actionType,
        checkType: checkType,
        flagCount: flagCount,
        flagThreshold: flagThreshold,
        duration: "N/A",
        itemTypeId: parameters.itemToRemoveTypeId || "N/A",
        itemQuantity: 0,
        teleportCoordinates: "N/A"
    };

    const messageTemplate = parameters.messageTemplate || `AutoMod Default: {actionType} for {checkType} on {playerName} (Flags: {flagCount}/{flagThreshold}).`;
    const adminMessageTemplate = parameters.adminMessageTemplate || `§7[§cAutoMod§7] Action: {actionType} on {playerName} for {checkType} (Flags: {flagCount}/{flagThreshold}). Rule Threshold: {flagThreshold}. Duration: {duration}. Item: {itemTypeId}x{itemQuantity}. Coords: {teleportCoordinates}.`;

    switch (actionType) {
        case "warn":
            const messageWarn = formatAutomodMessage(messageTemplate, baseMessageContext);
            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, messageWarn);
                logDetails = `Warned player. Check: ${checkType}. Message: "${messageWarn}"`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] playerUtils.warnPlayer not found for warn action.`, player.nameTag, dependencies);
                logDetails = `Warn action for ${player.nameTag} failed: warnPlayer utility not found.`;
            }
            break;
        case "kick":
            const kickReason = formatAutomodMessage(messageTemplate, baseMessageContext);
            try {
                player.kick(kickReason);
                logDetails = `Kicked player. Check: ${checkType}. Reason: "${kickReason}"`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Failed to kick player ${player.nameTag}. Check: ${checkType}. Reason: "${kickReason}". Error: ${e.message}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', { event: 'automod_kick_failure', player: player.nameTag, reason: kickReason, error: e.message, context: 'kick_action' }, dependencies);
                }
            }
            break;
        case "tempBan":
            const durationStringTempBan = parameters.duration || "5m";
            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils.debugLog(`[AutoModManager] Invalid duration string "${durationStringTempBan}" for tempBan on ${player.nameTag}. Defaulting to 5m.`, player.nameTag, dependencies);
                parsedDurationMsTempBan = 300000;
            }
            const friendlyDurationTempBan = formatDuration(parsedDurationMsTempBan);
            const tempBanContext = { ...baseMessageContext, duration: friendlyDurationTempBan };
            const kickMsgTempBan = formatAutomodMessage(messageTemplate, tempBanContext);
            const banReasonForStorageTemp = `AutoMod ${checkType} - ${actionType} (${friendlyDurationTempBan})`;

            const banSuccessTemp = playerDataManager?.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, banReasonForStorageTemp, "AutoMod", true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                baseMessageContext.duration = friendlyDurationTempBan;
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDurationTempBan}. Check: ${checkType}. Kick Reason: "${kickMsgTempBan}". Stored Reason: ${banReasonForStorageTemp}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after tempBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDurationTempBan}, Check: ${checkType}. Stored Reason: ${banReasonForStorageTemp}. Error: ${e.message}`;
                     if (logManager?.addLog) {
                        logManager.addLog('error', { event: 'automod_kick_failure', player: player.nameTag, reason: kickMsgTempBan, error: e.message, context: 'tempBan_action_kick' }, dependencies);
                    }
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply tempBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}. Reason: ${banReasonForStorageTemp}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', { event: 'automod_addBan_failure', player: player.nameTag, action: 'tempBan', reason: banReasonForStorageTemp, duration: parsedDurationMsTempBan }, dependencies);
                }
            }
            break;
        case "permBan":
            const permBanContext = { ...baseMessageContext, duration: "Permanent" };
            const kickMsgPermBan = formatAutomodMessage(messageTemplate, permBanContext);
            const permBanReasonForStorage = `AutoMod ${checkType} - ${actionType} (Permanent)`;

            const banSuccessPerm = playerDataManager?.addBan && playerDataManager.addBan(player, Infinity, permBanReasonForStorage, "AutoMod", true, checkType, dependencies);

            if (banSuccessPerm) {
                durationForLog = Infinity;
                baseMessageContext.duration = "Permanent";
                try {
                    player.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}. Kick Reason: "${kickMsgPermBan}". Stored Reason: ${permBanReasonForStorage}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after permBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}. Stored Reason: ${permBanReasonForStorage}. Error: ${e.message}`;
                    if (logManager?.addLog) {
                        logManager.addLog('error', { event: 'automod_kick_failure', player: player.nameTag, reason: kickMsgPermBan, error: e.message, context: 'permBan_action_kick' }, dependencies);
                    }
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply permBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}. Reason: ${permBanReasonForStorage}`;
                 if (logManager?.addLog) {
                    logManager.addLog('error', { event: 'automod_addBan_failure', player: player.nameTag, action: 'permBan', reason: permBanReasonForStorage, duration: Infinity }, dependencies);
                }
            }
            break;
        case "mute":
            const durationStringMute = parameters.duration || "10m";
            let parsedDurationMsMute = playerUtils.parseDuration(durationStringMute) || 600000;
            const friendlyDurationMute = formatDuration(parsedDurationMsMute);
            const muteContext = { ...baseMessageContext, duration: friendlyDurationMute };
            const muteReasonForStorage = `AutoMod ${checkType} - ${actionType} (${friendlyDurationMute})`;

            const muteSuccess = playerDataManager?.addMute && playerDataManager.addMute(player, parsedDurationMsMute, muteReasonForStorage, "AutoMod", true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                baseMessageContext.duration = friendlyDurationMute;
                const muteNotificationToPlayer = formatAutomodMessage(messageTemplate, muteContext);
                if(playerUtils.warnPlayer) playerUtils.warnPlayer(player, muteNotificationToPlayer);
                else player.sendMessage(muteNotificationToPlayer);
                logDetails = `Muted player for ${friendlyDurationMute}. Check: ${checkType}. Reason: ${muteReasonForStorage}. Notification: "${muteNotificationToPlayer}"`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply mute to ${player.nameTag} via playerDataManager.addMute.`, player.nameTag, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}. Reason: ${muteReasonForStorage}`;
                 if (logManager?.addLog) {
                    logManager.addLog('error', { event: 'automod_addMute_failure', player: player.nameTag, reason: muteReasonForStorage, duration: parsedDurationMsMute }, dependencies);
                }
            }
            break;
        case "freeze":
            const freezeMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils.warnPlayer(player, freezeMessage);
            logDetails = `Player ${player.nameTag} 'frozen' by AutoMod for ${checkType}. Message: "${freezeMessage}". (Note: Actual freeze mechanics depend on separate implementation).`;
            actionProcessed = true;
            playerUtils.debugLog(`[AutoModManager] 'freeze' action for ${player.nameTag} (check: ${checkType}). Player notified.`, player.nameTag, dependencies);
            break;
        case "removeIllegalItem":
            const itemTypeIdToRemove = parameters.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils.debugLog(`[AutoModManager] itemToRemoveTypeId not provided for removeIllegalItem on ${player.nameTag}.`, player.nameTag, dependencies);
                logDetails = "itemToRemoveTypeId missing in parameters for removeIllegalItem.";
                actionProcessed = false;
                break;
            }

            try {
                const inventory = player.getComponent("minecraft:inventory");
                if (!inventory?.container) {
                    playerUtils.debugLog(`[AutoModManager] Could not get inventory for ${player.nameTag} for removeIllegalItem.`, player.nameTag, dependencies);
                    logDetails = "Failed to get player inventory for removeIllegalItem.";
                    actionProcessed = false;
                    break;
                }
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    const itemStack = container.getItem(i);
                    if (itemStack && itemStack.typeId === itemTypeIdToRemove) {
                        removedItemCount += itemStack.amount;
                        container.setItem(i, undefined);
                    }
                }
                const removeItemContext = { ...baseMessageContext, itemQuantity: removedItemCount };
                baseMessageContext.itemQuantity = removedItemCount;

                const removalMessage = formatAutomodMessage(messageTemplate, removeItemContext);
                if (removedItemCount > 0) {
                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    else player.sendMessage(removalMessage);
                    logDetails = `Removed ${removedItemCount}x ${itemTypeIdToRemove} from ${player.nameTag} (Check: ${checkType}). Message: "${removalMessage}"`;
                } else {
                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player.nameTag} (Check: ${checkType}). Player notified with: "${removalMessage}"`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error during removeIllegalItem for ${player.nameTag} (${itemTypeIdToRemove}): ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Error removing item ${itemTypeIdToRemove} from ${player.nameTag}: ${e.message}`;
            }
            break;
        case "teleportSafe":
            const targetCoordinatesParam = parameters.coordinates;
            if (!targetCoordinatesParam || typeof targetCoordinatesParam.y !== 'number') {
                playerUtils.debugLog(`[AutoModManager] Invalid or missing coordinates for teleportSafe on ${player.nameTag}. Y-coordinate is mandatory.`, player.nameTag, dependencies);
                logDetails = `Invalid coordinates for teleportSafe. Y-coordinate missing. Check: ${checkType}`;
                actionProcessed = false;
                break;
            }
            const targetX = typeof targetCoordinatesParam.x === 'number' ? targetCoordinatesParam.x : player.location.x;
            const targetZ = typeof targetCoordinatesParam.z === 'number' ? targetCoordinatesParam.z : player.location.z;
            const targetY = targetCoordinatesParam.y;
            const teleportTargetDesc = `X:${targetX.toFixed(1)} Y:${targetY.toFixed(1)} Z:${targetZ.toFixed(1)}`;
            finalTeleportDesc = teleportTargetDesc;
            const teleportLocation = { x: targetX, y: targetY, z: targetZ };
            try {
                const safeLocation = player.dimension.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });
                const locationToTeleport = safeLocation || teleportLocation;
                if (safeLocation) {
                    finalTeleportDesc = `X:${safeLocation.x.toFixed(1)} Y:${safeLocation.y.toFixed(1)} Z:${safeLocation.z.toFixed(1)} (near requested ${teleportTargetDesc})`;
                }
                const teleportContext = { ...baseMessageContext, teleportCoordinates: finalTeleportDesc };
                baseMessageContext.teleportCoordinates = finalTeleportDesc;

                const teleportMessage = formatAutomodMessage(messageTemplate, teleportContext);
                player.teleport(locationToTeleport, { dimension: player.dimension });
                if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, teleportMessage);
                else player.sendMessage(teleportMessage);
                logDetails = `Teleported player ${player.nameTag} to ${finalTeleportDesc}. Check: ${checkType}. Message: "${teleportMessage}"`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error teleporting player ${player.nameTag} for teleportSafe: ${e.stack || e}`, player.nameTag, dependencies);
                const errorTeleportContext = { ...baseMessageContext, teleportCoordinates: teleportTargetDesc, errorMessage: e.message };
                const errorTeleportMessage = formatAutomodMessage(messageTemplate, errorTeleportContext);
                if(playerUtils.warnPlayer) playerUtils.warnPlayer(player, `Failed to teleport: ${e.message}`);
                logDetails = `Failed to teleport player ${player.nameTag} to ${teleportTargetDesc}. Check: ${checkType}. Error: ${e.message}`;
            }
            break;
        case "flagOnly":
            const flagOnlyMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            logDetails = `flagOnly rule processed for ${player.nameTag}, check: ${checkType}. Log Message: "${flagOnlyMessage}"`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(`[AutoModManager] Unknown actionType '${actionType}' for ${player.nameTag} in _executeAutomodAction.`, player.nameTag, dependencies);
            logDetails = `Unknown actionType '${actionType}' for ${player.nameTag}.`;
            break;
    }

    const finalReasonForLog = `automod.${checkType}.${actionType}`;

    if (actionProcessed && logManager?.addLog) {
        logManager.addLog('info', {
            event: `automod_${actionType.toLowerCase()}`,
            adminName: 'AutoMod',
            targetName: player.nameTag,
            duration: durationForLog,
            reason: finalReasonForLog,
            details: logDetails,
            checkType: checkType,
            actionParams: parameters
        }, dependencies);

        if (playerUtils && playerUtils.notifyAdmins) {
            const adminContext = {
                ...baseMessageContext,
                duration: (durationForLog === Infinity) ? "Permanent" : (durationForLog ? formatDuration(durationForLog) : "N/A"),
                itemTypeId: parameters.itemToRemoveTypeId || "N/A",
                itemQuantity: removedItemCount,
                teleportCoordinates: finalTeleportDesc,
            };
            const finalAdminMessage = formatAutomodMessage(adminMessageTemplate, adminContext);
            playerUtils.notifyAdmins(finalAdminMessage, dependencies, player, pData);
        }

    } else if (!actionProcessed && logManager?.addLog) {
        const criticalActions = ["warn", "kick", "tempBan", "permBan", "mute", "removeIllegalItem", "teleportSafe"];
        if (criticalActions.includes(actionType)) {
             playerUtils.debugLog(`AutomodManager: Action '${actionType}' failed to process correctly for ${player.nameTag}. Details: ${logDetails}`, player.nameTag, dependencies);
             logManager.addLog('warn', {
                event: `automod_${actionType.toLowerCase()}_processing_failure`,
                targetName: player.nameTag,
                details: logDetails,
                checkType: checkType,
                actionParams: parameters
             }, dependencies);
        }
    }
    return actionProcessed;
}
/**
 * Processes automated moderation actions for a player based on a specific check type trigger.
 */
export async function processAutoModActions(player, pData, checkType, dependencies) {
    const { config, playerUtils } = dependencies;
    const currentAutomodConfig = dependencies.config.automodConfig;

    if (!config.enableAutoMod) {
        return;
    }

    if (currentAutomodConfig.automodPerCheckTypeToggles &&
        typeof currentAutomodConfig.automodPerCheckTypeToggles[checkType] === 'boolean' &&
        !currentAutomodConfig.automodPerCheckTypeToggles[checkType]) {
        playerUtils.debugLog(`AutomodManager: AutoMod for checkType '${checkType}' on ${player.nameTag} is disabled via per-check toggle.`, player.nameTag, dependencies);
        return;
    }

    if (!currentAutomodConfig?.automodRules) {
        playerUtils.debugLog(`AutomodManager: automodRules not found in currentAutomodConfig for ${player.nameTag}, checkType: ${checkType}`, player.nameTag, dependencies);
        return;
    }

    const rulesForCheck = currentAutomodConfig.automodRules[checkType];
    if (!rulesForCheck || rulesForCheck.length === 0) {
        return;
    }

    const currentFlags = pData.flags[checkType]?.count || 0;
    if (currentFlags === 0) {
        return;
    }

    if (!pData.automodState) {
        pData.automodState = {};
    }
    if (!pData.automodState[checkType]) {
        pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0 };
    }

    const checkState = pData.automodState[checkType];
    let bestRuleToApply = null;

    for (const rule of rulesForCheck) {
        if (currentFlags >= rule.flagThreshold) {
            if (rule.flagThreshold > checkState.lastActionThreshold || currentFlags > checkState.lastActionThreshold) {
                if (!bestRuleToApply || rule.flagThreshold > bestRuleToApply.flagThreshold) {
                    bestRuleToApply = rule;
                }
            }
        }
    }

    if (bestRuleToApply) {
        if (bestRuleToApply.flagThreshold === checkState.lastActionThreshold && currentFlags === checkState.lastActionThreshold) {
            playerUtils.debugLog(`AutomodManager: Rule for threshold ${bestRuleToApply.flagThreshold} for ${checkType} on ${player.nameTag} was already the last actioned. Current flags (${currentFlags}) haven't surpassed it. Skipping.`, player.nameTag, dependencies);
            return;
        }

        playerUtils.debugLog(`AutomodManager: ${player.nameTag} (flags: ${currentFlags} for ${checkType}) meets threshold ${bestRuleToApply.flagThreshold}. Intended action: ${bestRuleToApply.actionType}`, player.nameTag, dependencies);

        if (bestRuleToApply.parameters) {
            playerUtils.debugLog(`AutomodManager: Action parameters: ${JSON.stringify(bestRuleToApply.parameters)}`, player.nameTag, dependencies);
        }

        let finalParameters = bestRuleToApply.parameters || {};

        if (bestRuleToApply.actionType === "REMOVE_ILLEGAL_ITEM") {
            if (pData.lastViolationDetailsMap && pData.lastViolationDetailsMap[checkType] && pData.lastViolationDetailsMap[checkType].itemTypeId) {
                const itemDetail = pData.lastViolationDetailsMap[checkType];
                finalParameters = {
                    ...finalParameters,
                    itemToRemoveTypeId: itemDetail.itemTypeId,
                };
                playerUtils.debugLog(`AutomodManager: Extracted item ${itemDetail.itemTypeId} from pData.lastViolationDetailsMap for REMOVE_ILLEGAL_ITEM action.`, player.nameTag, dependencies);
            } else {
                playerUtils.debugLog(`AutomodManager: REMOVE_ILLEGAL_ITEM action for ${checkType} on ${player.nameTag} but no specific itemTypeId found in pData.lastViolationDetailsMap. Action might be ignored or fail in _executeAutomodAction.`, player.nameTag, dependencies);
            }
        }

        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, finalParameters, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now();
            pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils.debugLog(`AutomodManager: Resetting flags for ${checkType} on ${player.nameTag} as per rule (Threshold: ${bestRuleToApply.flagThreshold}, Action: ${bestRuleToApply.actionType}).`, player.nameTag, dependencies);
                if (pData.flags?.[checkType]) {
                    pData.flags[checkType].count = 0;
                }
                if (pData.automodState?.[checkType]) {
                    pData.automodState[checkType].lastActionThreshold = 0;
                }
                pData.isDirtyForSave = true;
            }
        }
    }
}
