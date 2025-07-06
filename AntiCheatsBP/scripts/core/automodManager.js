/**
 * @file Manages automated moderation actions based on player flags and configured rules.
 */

/**
 * Formats a duration in milliseconds into a human-readable string.
 * @param {number | Infinity} ms - The duration in milliseconds, or Infinity for permanent.
 * @returns {string} A formatted duration string (e.g., '5m', '1h', 'Permanent').
 */
function formatDuration(ms) {
    if (ms === Infinity) {
        return 'Permanent';
    }
    if (typeof ms !== 'number' || ms <= 0) {
        return '0s'; // Or handle as an error/default
    }
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
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`); // Ensure "0s" if ms is very small but not <= 0
    return parts.join(' ');
}

/**
 * Formats an AutoMod message template with dynamic context values.
 * @param {string | undefined} template - The message template.
 * @param {object} context - An object containing key-value pairs for placeholders.
 * @returns {string} The formatted message.
 */
function formatAutomodMessage(template, context) {
    if (!template || typeof template !== 'string' || !context || typeof context !== 'object') {
        return template || '';
    }
    let message = template;
    for (const key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
            const placeholder = `{${key}}`;
            // Basic escaping for regex. More robust escaping might be needed if keys can contain special regex chars.
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g'); // Global replacement
            message = message.replace(regex, String(context[key]));
        }
    }
    return message;
}

/**
 * Internal function to execute a specific AutoMod action.
 * @param {import('@minecraft/server').Player} player - The player to action.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {string} actionType - The type of action (e.g., 'warn', 'kick', 'tempBan') (camelCase).
 * @param {import('../types.js').AutoModActionParameters & { flagThresholdInternal?: number }} parameters - Parameters for the action, including flagThreshold.
 * @param {string} checkType - The check type that triggered this action (already standardized, e.g., 'playerAntiGmc').
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if the action was processed (even if it internally failed but was logged), false otherwise.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, config: globalConfig, playerDataManager } = dependencies;
    const flagThresholdForRule = parameters.flagThresholdInternal || 0; // Passed internally by processAutoModActions

    playerUtils?.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player?.nameTag} due to ${checkType}. Rule Params: ${JSON.stringify(parameters)}`, player?.nameTag, dependencies);

    let actionProcessed = false;
    let logDetails = '';
    let durationForLog = null;
    let finalTeleportDesc = 'N/A';
    let removedItemCount = 0;

    const flagCount = pData.flags[checkType]?.count || 0;

    const baseMessageContext = {
        playerName: player?.nameTag,
        actionType: actionType,
        checkType: checkType,
        flagCount: flagCount,
        flagThreshold: flagThresholdForRule,
        duration: 'N/A', // Will be updated for timed actions
        itemTypeId: parameters.itemToRemoveTypeId || 'N/A',
        itemQuantity: 0, // Will be updated for item removal
        teleportCoordinates: 'N/A', // Will be updated for teleport
    };

    const messageTemplate = parameters.messageTemplate || `AutoMod Default: {actionType} for {checkType} on {playerName} (Flags: {flagCount}/{flagThreshold}).`;
    const adminMessageTemplate = parameters.adminMessageTemplate || `AutoMod Action: {actionType} on §e{playerName}§r for §b{checkType}§r (Flags: §a{flagCount}/{flagThreshold}§r). Rule Threshold: §a{flagThreshold}§r. Duration: §b{duration}§r. Item: §a{itemTypeId}x{itemQuantity}§r. Coords: §a{teleportCoordinates}§r.`;

    switch (actionType) {
        case 'warn': {
            const messageWarn = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils?.warnPlayer(player, messageWarn, dependencies);
            logDetails = `Warned player. Check: ${checkType}. Message: '${messageWarn}'`;
            actionProcessed = true;
            break;
        }
        case 'kick': {
            const kickReason = formatAutomodMessage(messageTemplate, baseMessageContext);
            try {
                player?.kick(kickReason);
                logDetails = `Kicked player. Check: ${checkType}. Reason: '${kickReason}'`;
                actionProcessed = true;
                playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
            } catch (e) {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.nameTag}: ${e.stack || e}`, player?.nameTag, dependencies);
                logDetails = `Failed to kick player ${player?.nameTag}. Check: ${checkType}. Reason: '${kickReason}'. Error: ${e.message}`;
                logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickReason, details: `Error: ${e.message}`, checkType: checkType }, dependencies);
            }
            break;
        }
        case 'tempBan': {
            const durationStringTempBan = parameters?.duration || globalConfig.automodDefaultMuteDuration || '5m'; // Fallback to global then hardcoded
            let parsedDurationMsTempBan = playerUtils?.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringTempBan}' for tempBan on ${player?.nameTag}. Defaulting to 5m.`, player?.nameTag, dependencies);
                parsedDurationMsTempBan = 300000; // 5 minutes
            }
            const friendlyDurationTempBan = formatDuration(parsedDurationMsTempBan);
            const tempBanContext = { ...baseMessageContext, duration: friendlyDurationTempBan };
            const kickMsgTempBan = formatAutomodMessage(messageTemplate, tempBanContext);
            const banReasonForStorageTemp = `AutoMod ${checkType} - ${actionType} (${friendlyDurationTempBan})`;

            const banSuccessTemp = playerDataManager?.addBan(player, parsedDurationMsTempBan, banReasonForStorageTemp, 'AutoMod', true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                baseMessageContext.duration = friendlyDurationTempBan; // Update for admin message
                try {
                    player?.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDurationTempBan}. Check: ${checkType}. Kick Reason: '${kickMsgTempBan}'. Stored Reason: ${banReasonForStorageTemp}`;
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
                } catch (e) {
                    playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.nameTag} after tempBan: ${e.stack || e}`, player?.nameTag, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDurationTempBan}, Check: ${checkType}. Stored Reason: ${banReasonForStorageTemp}. Error: ${e.message}`;
                    logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickMsgTempBan, details: `Error: ${e.message}`, checkType: checkType }, dependencies);
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies); // Sound played as ban was added
                }
                actionProcessed = true;
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply tempBan to ${player?.nameTag} via playerDataManager.addBan.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}. Reason: ${banReasonForStorageTemp}`;
                logManager?.addLog({ actionType: 'errorAutomodAddBan', adminName: 'AutoMod', targetName: player?.nameTag, reason: banReasonForStorageTemp, details: `Duration: ${parsedDurationMsTempBan}ms`, checkType: checkType }, dependencies);
            }
            break;
        }
        case 'permBan': {
            const permBanContext = { ...baseMessageContext, duration: 'Permanent' };
            const kickMsgPermBan = formatAutomodMessage(messageTemplate, permBanContext);
            const permBanReasonForStorage = `AutoMod ${checkType} - ${actionType} (Permanent)`;

            const banSuccessPerm = playerDataManager?.addBan(player, Infinity, permBanReasonForStorage, 'AutoMod', true, checkType, dependencies);

            if (banSuccessPerm) {
                durationForLog = Infinity;
                baseMessageContext.duration = 'Permanent'; // Update for admin message
                try {
                    player?.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}. Kick Reason: '${kickMsgPermBan}'. Stored Reason: ${permBanReasonForStorage}`;
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
                } catch (e) {
                    playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.nameTag} after permBan: ${e.stack || e}`, player?.nameTag, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}. Stored Reason: ${permBanReasonForStorage}. Error: ${e.message}`;
                    logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickMsgPermBan, details: `Error: ${e.message}`, checkType: checkType }, dependencies);
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
                }
                actionProcessed = true;
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply permBan to ${player?.nameTag} via playerDataManager.addBan.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}. Reason: ${permBanReasonForStorage}`;
                logManager?.addLog({ actionType: 'errorAutomodAddBan', adminName: 'AutoMod', targetName: player?.nameTag, reason: permBanReasonForStorage, details: 'Duration: Infinity', checkType: checkType }, dependencies);
            }
            break;
        }
        case 'mute': { // Corrected from 'mutePlayer' as per previous findings in automodConfig
            const durationStringMute = parameters?.duration || globalConfig.automodDefaultMuteDuration || '10m';
            let parsedDurationMsMute = playerUtils?.parseDuration(durationStringMute);
            if (parsedDurationMsMute === null || (parsedDurationMsMute <= 0 && parsedDurationMsMute !== Infinity)) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringMute}' for mute on ${player?.nameTag}. Defaulting to 10m.`, player?.nameTag, dependencies);
                parsedDurationMsMute = 600000; // 10 minutes
            }
            const friendlyDurationMute = formatDuration(parsedDurationMsMute);
            const muteContext = { ...baseMessageContext, duration: friendlyDurationMute };
            const muteReasonForStorage = `AutoMod ${checkType} - ${actionType} (${friendlyDurationMute})`;

            const muteSuccess = playerDataManager?.addMute(player, parsedDurationMsMute, muteReasonForStorage, 'AutoMod', true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                baseMessageContext.duration = friendlyDurationMute; // Update for admin message
                const muteNotificationToPlayer = formatAutomodMessage(messageTemplate, muteContext);
                playerUtils?.warnPlayer(player, muteNotificationToPlayer, dependencies);
                logDetails = `Muted player for ${friendlyDurationMute}. Check: ${checkType}. Reason: ${muteReasonForStorage}. Notification: '${muteNotificationToPlayer}'`;
                actionProcessed = true;
                playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply mute to ${player?.nameTag} via playerDataManager.addMute.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}. Reason: ${muteReasonForStorage}`;
                logManager?.addLog({ actionType: 'errorAutomodAddMute', adminName: 'AutoMod', targetName: player?.nameTag, reason: muteReasonForStorage, details: `Duration: ${parsedDurationMsMute}ms`, checkType: checkType }, dependencies);
            }
            break;
        }
        case 'freezePlayer': { // 'freezePlayer' was in config, changed to 'freeze' for consistency if it's a conceptual action
            const freezeMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils?.warnPlayer(player, freezeMessage, dependencies);
            logDetails = `Player ${player?.nameTag} 'frozen' by AutoMod for ${checkType}. Message: '${freezeMessage}'. (Note: Actual freeze mechanics depend on separate implementation and 'frozenPlayerTag' from config.js).`;
            actionProcessed = true;
            // Actual freezing logic (e.g., applying a tag, preventing movement) would be elsewhere or via a specific check.
            playerUtils?.debugLog(`[AutoModManager] 'freezePlayer' action for ${player?.nameTag} (check: ${checkType}). Player notified.`, player?.nameTag, dependencies);
            if (globalConfig.frozenPlayerTag) {
                player?.addTag(globalConfig.frozenPlayerTag);
            }
            break;
        }
        case 'removeIllegalItem': {
            const itemTypeIdToRemove = parameters?.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils?.debugLog(`[AutoModManager] itemToRemoveTypeId not provided for removeIllegalItem on ${player?.nameTag}.`, player?.nameTag, dependencies);
                logDetails = 'itemToRemoveTypeId missing in parameters for removeIllegalItem.';
                actionProcessed = false; // Mark as not processed if essential param is missing
                break;
            }

            try {
                const inventory = player?.getComponent('minecraft:inventory');
                if (!inventory?.container) {
                    playerUtils?.debugLog(`[AutoModManager] Could not get inventory for ${player?.nameTag} for removeIllegalItem.`, player?.nameTag, dependencies);
                    logDetails = 'Failed to get player inventory for removeIllegalItem.';
                    actionProcessed = false;
                    break;
                }
                const container = inventory.container;
                for (let i = 0; i < container.size; i++) {
                    const itemStack = container.getItem(i);
                    if (itemStack?.typeId === itemTypeIdToRemove) {
                        removedItemCount += itemStack.amount;
                        container.setItem(i, undefined); // Remove item
                    }
                }
                baseMessageContext.itemQuantity = removedItemCount; // Update for message context
                const removalMessage = formatAutomodMessage(messageTemplate, baseMessageContext);

                if (removedItemCount > 0) {
                    playerUtils?.warnPlayer(player, removalMessage, dependencies);
                    logDetails = `Removed ${removedItemCount}x ${itemTypeIdToRemove} from ${player?.nameTag} (Check: ${checkType}). Message: '${removalMessage}'`;
                } else {
                    // Still notify player even if no items found, as per original logic of sending messageTemplate
                    playerUtils?.warnPlayer(player, removalMessage, dependencies);
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player?.nameTag} (Check: ${checkType}). Player notified with: '${removalMessage}'`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error during removeIllegalItem for ${player?.nameTag} (${itemTypeIdToRemove}): ${e.stack || e}`, player?.nameTag, dependencies);
                logDetails = `Error removing item ${itemTypeIdToRemove} from ${player?.nameTag}: ${e.message}`;
                logManager?.addLog({ actionType: 'errorAutomodRemoveItem', adminName: 'AutoMod', targetName: player?.nameTag, reason: `Item: ${itemTypeIdToRemove}`, details: `Error: ${e.message}`, checkType: checkType }, dependencies);
                // actionProcessed might still be true if we consider attempting the action as "processed" for logging.
            }
            break;
        }
        case 'teleportSafe': {
            const targetCoordinatesParam = parameters?.coordinates;
            if (!targetCoordinatesParam || typeof targetCoordinatesParam.y !== 'number') {
                playerUtils?.debugLog(`[AutoModManager] Invalid or missing coordinates for teleportSafe on ${player?.nameTag}. Y-coordinate is mandatory.`, player?.nameTag, dependencies);
                logDetails = `Invalid coordinates for teleportSafe. Y-coordinate missing. Check: ${checkType}`;
                actionProcessed = false;
                break;
            }

            const targetX = targetCoordinatesParam.x ?? player.location.x;
            const targetZ = targetCoordinatesParam.z ?? player.location.z;
            const targetY = targetCoordinatesParam.y;
            const teleportTargetDesc = `X:${targetX.toFixed(1)}, Y:${targetY.toFixed(1)}, Z:${targetZ.toFixed(1)}`;
            finalTeleportDesc = teleportTargetDesc; // Initial target
            const teleportLocation = { x: targetX, y: targetY, z: targetZ };

            try {
                const safeLocation = player?.dimension?.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });
                const locationToTeleport = safeLocation || teleportLocation; // Use safe location if found, else original target

                if (safeLocation) {
                    finalTeleportDesc = `X:${safeLocation.x.toFixed(1)}, Y:${safeLocation.y.toFixed(1)}, Z:${safeLocation.z.toFixed(1)} (near requested ${teleportTargetDesc})`;
                }
                baseMessageContext.teleportCoordinates = finalTeleportDesc; // Update for message context
                const teleportMessage = formatAutomodMessage(messageTemplate, baseMessageContext);

                player?.teleport(locationToTeleport, { dimension: player.dimension });
                playerUtils?.warnPlayer(player, teleportMessage, dependencies);
                logDetails = `Teleported player ${player?.nameTag} to ${finalTeleportDesc}. Check: ${checkType}. Message: '${teleportMessage}'`;
                actionProcessed = true;
            } catch (e) {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error teleporting player ${player?.nameTag} for teleportSafe: ${e.stack || e}`, player?.nameTag, dependencies);
                playerUtils?.warnPlayer(player, `Failed to teleport: ${e.message}`, dependencies);
                logDetails = `Failed to teleport player ${player?.nameTag} to ${teleportTargetDesc}. Check: ${checkType}. Error: ${e.message}`;
                logManager?.addLog({ actionType: 'errorAutomodTeleport', adminName: 'AutoMod', targetName: player?.nameTag, reason: `Target: ${teleportTargetDesc}`, details: `Error: ${e.message}`, checkType: checkType }, dependencies);
            }
            break;
        }
        case 'flagOnly': {
            const flagOnlyMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            logDetails = `flagOnly rule processed for ${player?.nameTag}, check: ${checkType}. Log Message: '${flagOnlyMessage}'`;
            actionProcessed = true; // Considered processed as it's an intentional logging step
            break;
        }
        default:
            playerUtils?.debugLog(`[AutoModManager] Unknown actionType '${actionType}' for ${player?.nameTag} in _executeAutomodAction.`, player?.nameTag, dependencies);
            logDetails = `Unknown actionType '${actionType}' for ${player?.nameTag}.`;
            break;
    }

    const finalReasonForLog = `automod.${checkType}.${actionType}`;

    if (actionProcessed) {
        logManager?.addLog({
            actionType: `automod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}Taken`, // e.g., automodWarnTaken
            adminName: 'AutoMod',
            targetName: player?.nameTag,
            targetId: player?.id,
            duration: durationForLog, // null if not applicable
            reason: finalReasonForLog,
            details: logDetails,
            checkType: checkType,
            actionParams: { ...parameters, flagCount: flagCount }, // Log parameters used including actual flag count
        }, dependencies);

        const adminContext = { ...baseMessageContext }; // baseMessageContext already has updated duration, itemQuantity, teleportCoordinates
        const finalAdminMessage = formatAutomodMessage(adminMessageTemplate, adminContext);

        if (globalConfig.notifyOnAutoModAction !== false) {
            playerUtils?.notifyAdmins(finalAdminMessage, dependencies, player, pData);
        }
    } else {
        // Log a general processing failure if a critical action was intended but not processed.
        const criticalActions = ['warn', 'kick', 'tempBan', 'permBan', 'mute', 'removeIllegalItem', 'teleportSafe'];
        if (criticalActions.includes(actionType)) {
            playerUtils?.debugLog(`[AutoModManager CRITICAL] Action '${actionType}' for ${player?.nameTag} (check: ${checkType}) was not processed successfully. Details: ${logDetails}`, player?.nameTag, dependencies);
            logManager?.addLog({
                actionType: `errorAutomod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}Processing`,
                adminName: 'AutoMod',
                targetName: player?.nameTag,
                targetId: player?.id,
                details: logDetails, // Contains error info from switch cases or param validation
                checkType: checkType,
                actionParams: parameters,
            }, dependencies);
        }
    }
    return actionProcessed;
}

/**
 * Processes AutoMod actions for a player based on their current flags for a specific check type.
 * @param {import('@minecraft/server').Player} player - The player to process actions for.
 * @param {import('../types.js').PlayerAntiCheatData} pData - The player's AntiCheat data.
 * @param {string} checkType - The specific check type (e.g., 'movementFlyHover', 'playerAntiGmc') to evaluate rules for.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function processAutoModActions(player, pData, checkType, dependencies) {
    const { config: globalConfig, playerUtils, automodConfig: moduleAutomodConfig } = dependencies;

    if (!globalConfig?.enableAutoMod) {
        return;
    }

    // Find the ruleSet for the given checkType
    const ruleSet = moduleAutomodConfig?.automodRuleSets?.find(rs => rs.checkType === checkType);

    if (!ruleSet) {
        // playerUtils?.debugLog(`[AutoModManager] No AutoMod ruleSet defined for checkType '${checkType}'. Skipping for ${player?.nameTag}.`, player?.nameTag, dependencies);
        return;
    }

    if (!ruleSet.enabled) {
        playerUtils?.debugLog(`[AutoModManager] AutoMod for checkType '${checkType}' on ${player?.nameTag} is disabled in its ruleSet.`, player?.nameTag, dependencies);
        return;
    }

    const rulesForCheck = ruleSet.tiers;
    if (!rulesForCheck || rulesForCheck.length === 0) {
        // playerUtils?.debugLog(`[AutoModManager] No tiers defined in AutoMod ruleSet for checkType '${checkType}'. Skipping for ${player?.nameTag}.`, player?.nameTag, dependencies);
        return;
    }

    const currentFlags = pData?.flags?.[checkType]?.count || 0;
    if (currentFlags === 0) {
        return;
    }

    pData.automodState ??= {};
    pData.automodState[checkType] ??= { lastActionThreshold: 0, lastActionTimestamp: 0, lastActionedFlagCount: 0 };
    const checkState = pData.automodState[checkType];

    let bestRuleToApply = null;
    for (const rule of rulesForCheck) {
        if (currentFlags >= rule.flagThreshold) {
            // Only consider this rule if it's a higher threshold than previously actioned,
            // OR if it's the same threshold but more flags have accumulated since last action at this threshold.
            if (rule.flagThreshold > checkState.lastActionThreshold ||
                (rule.flagThreshold === checkState.lastActionThreshold && currentFlags > checkState.lastActionedFlagCount)) {
                if (!bestRuleToApply || rule.flagThreshold > bestRuleToApply.flagThreshold) {
                    bestRuleToApply = rule;
                }
            }
        }
    }

    if (bestRuleToApply) {
        // This specific check prevents re-actioning if the flag count is identical to when the last action for this exact threshold was taken.
        // This allows re-actioning if flags increase, even if they don't hit a *new* higher threshold, but have surpassed the last actioned count for the current threshold.
        if (bestRuleToApply.flagThreshold === checkState.lastActionThreshold && currentFlags === checkState.lastActionedFlagCount) {
            playerUtils?.debugLog(`[AutoModManager] Rule for threshold ${bestRuleToApply.flagThreshold} for ${checkType} on ${player?.nameTag} was already the last actioned at this exact flag count (${currentFlags}). Skipping.`, player?.nameTag, dependencies);
            return;
        }

        playerUtils?.debugLog(`[AutoModManager] ${player?.nameTag} (flags: ${currentFlags} for ${checkType}) meets threshold ${bestRuleToApply.flagThreshold}. Intended action: ${bestRuleToApply.actionType}`, player?.nameTag, dependencies);
        if (bestRuleToApply.parameters) {
            playerUtils?.debugLog(`[AutoModManager] Action parameters: ${JSON.stringify(bestRuleToApply.parameters)}`, player?.nameTag, dependencies);
        }

        // Pass the actual threshold of the rule being applied for context in _executeAutomodAction
        const finalParameters = { ...(bestRuleToApply.parameters || {}), flagThresholdInternal: bestRuleToApply.flagThreshold };
        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, finalParameters, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionedFlagCount = currentFlags; // Record the flag count at which this action was taken
            checkState.lastActionTimestamp = Date.now();
            if (pData) pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils?.debugLog(`[AutoModManager] Resetting flags for ${checkType} on ${player?.nameTag} as per rule (Threshold: ${bestRuleToApply.flagThreshold}, Action: ${bestRuleToApply.actionType}).`, player?.nameTag, dependencies);
                if (pData?.flags?.[checkType]) {
                    if (typeof pData.flags.totalFlags === 'number' && typeof pData.flags[checkType].count === 'number') {
                        pData.flags.totalFlags = Math.max(0, pData.flags.totalFlags - pData.flags[checkType].count);
                    }
                    pData.flags[checkType].count = 0;
                    // Also reset the automod state for this check type since flags are reset
                    pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0, lastActionedFlagCount: 0 };
                }
                if (pData) pData.isDirtyForSave = true;
            }
        }
    } else {
        // This block means no new rule threshold was met that was higher than the last actioned one,
        // or flags haven't increased past the last actioned count for the current highest met threshold.
        // playerUtils?.debugLog(`[AutoModManager] No new qualifying AutoMod rule to apply for ${player?.nameTag} on ${checkType}. Current flags: ${currentFlags}, Last action threshold: ${checkState.lastActionThreshold}, Last actioned flags: ${checkState.lastActionedFlagCount}.`, player?.nameTag, dependencies);
    }

    // Handle global flag reset timer for the checkType if defined in the ruleSet
    if (ruleSet.resetFlagsAfterSeconds && ruleSet.resetFlagsAfterSeconds > 0) {
        const lastFlagTime = pData?.flags?.[checkType]?.lastDetectionTime || 0;
        const now = Date.now();
        if (lastFlagTime > 0 && (now - lastFlagTime) > (ruleSet.resetFlagsAfterSeconds * 1000)) {
            // Check if any automod action was taken for this checkType *after* the last flag.
            // If an action was taken more recently than the last flag (shouldn't happen often but good to check),
            // or if an action was taken for a threshold higher than 0, respect its own reset logic.
            // This global reset is more of a cooldown if no specific rule's resetFlagsAfterAction was hit.
            if (checkState.lastActionTimestamp <= lastFlagTime || checkState.lastActionThreshold === 0) {
                playerUtils?.debugLog(`[AutoModManager] Globally resetting flags for ${checkType} on ${player?.nameTag} due to inactivity (resetAfterSeconds: ${ruleSet.resetFlagsAfterSeconds}).`, player?.nameTag, dependencies);
                if (pData?.flags?.[checkType]) {
                    if (typeof pData.flags.totalFlags === 'number' && typeof pData.flags[checkType].count === 'number') {
                        pData.flags.totalFlags = Math.max(0, pData.flags.totalFlags - pData.flags[checkType].count);
                    }
                    pData.flags[checkType].count = 0;
                }
                // Reset automod state for this check as well
                pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0, lastActionedFlagCount: 0 };
                if (pData) pData.isDirtyForSave = true;
            }
        }
    }
}
