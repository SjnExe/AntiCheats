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
        return '0s';
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
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
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
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedPlaceholder, 'g');
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
 * @param {import('./automodConfig.js').AutoModRuleParameters & { flagThreshold: number }} parameters - Parameters for the action, including flagThreshold.
 * @param {string} checkType - The check type that triggered this action (already standardized, e.g., 'playerAntiGmc').
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<boolean>} True if the action was processed (even if it internally failed but was logged), false otherwise.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, config: globalConfig, playerDataManager } = dependencies;
    playerUtils?.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player?.nameTag} due to ${checkType}. Rule Params: ${JSON.stringify(parameters)}`, player?.nameTag, dependencies);

    let actionProcessed = false;
    let logDetails = '';
    let durationForLog = null;
    let finalTeleportDesc = 'N/A';
    let removedItemCount = 0;

    const flagCount = pData.flags[checkType]?.count || 0;
    // flagThreshold is now guaranteed in parameters by the caller (processAutoModActions)

    const baseMessageContext = {
        playerName: player?.nameTag,
        actionType: actionType,
        checkType: checkType,
        flagCount: flagCount,
        flagThreshold: parameters.flagThreshold, // Directly from enriched parameters
        duration: 'N/A',
        itemTypeId: parameters.itemToRemoveTypeId || 'N/A',
        itemQuantity: 0,
        teleportCoordinates: 'N/A',
    };

    const messageTemplate = parameters.messageTemplate || `AutoMod Default: {actionType} for {checkType} on {playerName} (Flags: {flagCount}/{flagThreshold}).`;
    const adminMessageTemplate = parameters.adminMessageTemplate || `§7[§cAutoMod§7] Action: {actionType} on {playerName} for {checkType} (Flags: {flagCount}/{flagThreshold}). Rule Threshold: {flagThreshold}. Duration: {duration}. Item: {itemTypeId}x{itemQuantity}. Coords: {teleportCoordinates}.`;

    switch (actionType) {
        case 'warn': {
            const messageWarn = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils?.warnPlayer(player, messageWarn, dependencies); // Pass dependencies
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
                const errorMsg = e.stack || e;
                playerUtils?.debugLog(`[AutoModManager] Error kicking player ${player?.nameTag}: ${errorMsg}`, player?.nameTag, dependencies);
                logDetails = `Failed to kick player ${player?.nameTag}. Check: ${checkType}. Reason: '${kickReason}'. Error: ${e.message}`;
                logManager?.addLog({ event: 'automodKickFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickReason, details: `Error: ${e.message}`, checkType: checkType, actionType: 'error' }, dependencies);
            }
            break;
        }
        case 'tempBan': {
            const durationStringTempBan = parameters?.duration || '5m';
            let parsedDurationMsTempBan = playerUtils?.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringTempBan}' for tempBan on ${player?.nameTag}. Defaulting to 5m.`, player?.nameTag, dependencies);
                parsedDurationMsTempBan = 300000; // 5 minutes in ms
            }
            const friendlyDurationTempBan = formatDuration(parsedDurationMsTempBan);
            const tempBanContext = { ...baseMessageContext, duration: friendlyDurationTempBan };
            const kickMsgTempBan = formatAutomodMessage(messageTemplate, tempBanContext);
            const banReasonForStorageTemp = `AutoMod ${checkType} - ${actionType} (${friendlyDurationTempBan})`;

            const banSuccessTemp = playerDataManager?.addBan(player, parsedDurationMsTempBan, banReasonForStorageTemp, 'AutoMod', true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                baseMessageContext.duration = friendlyDurationTempBan;
                try {
                    player?.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDurationTempBan}. Check: ${checkType}. Kick Reason: '${kickMsgTempBan}'. Stored Reason: ${banReasonForStorageTemp}`;
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies); // Sound on successful ban + kick
                } catch (e) {
                    const errorMsg = e.stack || e;
                    playerUtils?.debugLog(`[AutoModManager] Error kicking player ${player?.nameTag} after tempBan: ${errorMsg}`, player?.nameTag, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDurationTempBan}, Check: ${checkType}. Stored Reason: ${banReasonForStorageTemp}. Error: ${e.message}`;
                    logManager?.addLog({ event: 'automodKickFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickMsgTempBan, details: `Error: ${e.message}`, checkType: checkType, actionType: 'error' }, dependencies);
                    // Still play sound if ban was added but kick failed, as ban is the primary action
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
                }
                actionProcessed = true; // Ban was successful
            } else {
                playerUtils?.debugLog(`[AutoModManager] Failed to apply tempBan to ${player?.nameTag} via playerDataManager.addBan.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}. Reason: ${banReasonForStorageTemp}`;
                logManager?.addLog({ event: 'automodAddBanFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: banReasonForStorageTemp, details: `Duration: ${parsedDurationMsTempBan}ms`, checkType: checkType, actionType: 'error' }, dependencies);
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
                baseMessageContext.duration = 'Permanent';
                try {
                    player?.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}. Kick Reason: '${kickMsgPermBan}'. Stored Reason: ${permBanReasonForStorage}`;
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies); // Sound on successful ban + kick
                } catch (e) {
                    const errorMsg = e.stack || e;
                    playerUtils?.debugLog(`[AutoModManager] Error kicking player ${player?.nameTag} after permBan: ${errorMsg}`, player?.nameTag, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}. Stored Reason: ${permBanReasonForStorage}. Error: ${e.message}`;
                    logManager?.addLog({ event: 'automodKickFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: kickMsgPermBan, details: `Error: ${e.message}`, checkType: checkType, actionType: 'error' }, dependencies);
                    playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies); // Still play sound if ban was added but kick failed
                }
                actionProcessed = true; // Ban was successful
            } else {
                playerUtils?.debugLog(`[AutoModManager] Failed to apply permBan to ${player?.nameTag} via playerDataManager.addBan.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}. Reason: ${permBanReasonForStorage}`;
                logManager?.addLog({ event: 'automodAddBanFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: permBanReasonForStorage, details: 'Duration: Infinity', checkType: checkType, actionType: 'error' }, dependencies);
            }
            break;
        }
        case 'mute': {
            const durationStringMute = parameters?.duration || '10m';
            let parsedDurationMsMute = playerUtils?.parseDuration(durationStringMute);
            if (parsedDurationMsMute === null || (parsedDurationMsMute <= 0 && parsedDurationMsMute !== Infinity)) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringMute}' for mute on ${player?.nameTag}. Defaulting to 10m.`, player?.nameTag, dependencies);
                parsedDurationMsMute = 600000; // 10 minutes in ms
            }
            const friendlyDurationMute = formatDuration(parsedDurationMsMute);
            const muteContext = { ...baseMessageContext, duration: friendlyDurationMute };
            const muteReasonForStorage = `AutoMod ${checkType} - ${actionType} (${friendlyDurationMute})`;

            const muteSuccess = playerDataManager?.addMute(player, parsedDurationMsMute, muteReasonForStorage, 'AutoMod', true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                baseMessageContext.duration = friendlyDurationMute;
                const muteNotificationToPlayer = formatAutomodMessage(messageTemplate, muteContext);
                playerUtils?.warnPlayer(player, muteNotificationToPlayer, dependencies); // Pass dependencies
                logDetails = `Muted player for ${friendlyDurationMute}. Check: ${checkType}. Reason: ${muteReasonForStorage}. Notification: '${muteNotificationToPlayer}'`;
                actionProcessed = true;
                playerUtils?.playSoundForEvent(player, "automodActionTaken", dependencies);
            } else {
                playerUtils?.debugLog(`[AutoModManager] Failed to apply mute to ${player?.nameTag} via playerDataManager.addMute.`, player?.nameTag, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}. Reason: ${muteReasonForStorage}`;
                logManager?.addLog({ event: 'automodAddMuteFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: muteReasonForStorage, details: `Duration: ${parsedDurationMsMute}ms`, checkType: checkType, actionType: 'error' }, dependencies);
            }
            break;
        }
        case 'freeze': {
            const freezeMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils?.warnPlayer(player, freezeMessage, dependencies); // Pass dependencies
            logDetails = `Player ${player?.nameTag} 'frozen' by AutoMod for ${checkType}. Message: '${freezeMessage}'. (Note: Actual freeze mechanics depend on separate implementation).`;
            actionProcessed = true;
            playerUtils?.debugLog(`[AutoModManager] 'freeze' action for ${player?.nameTag} (check: ${checkType}). Player notified.`, player?.nameTag, dependencies);
            break;
        }
        case 'removeIllegalItem': {
            const itemTypeIdToRemove = parameters?.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils?.debugLog(`[AutoModManager] itemToRemoveTypeId not provided for removeIllegalItem on ${player?.nameTag}.`, player?.nameTag, dependencies);
                logDetails = 'itemToRemoveTypeId missing in parameters for removeIllegalItem.';
                actionProcessed = false;
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
                        container.setItem(i, undefined);
                    }
                }

                baseMessageContext.itemQuantity = removedItemCount;
                const removeItemContext = { ...baseMessageContext }; // itemQuantity already updated in baseMessageContext

                const removalMessage = formatAutomodMessage(messageTemplate, removeItemContext);
                if (removedItemCount > 0) {
                    playerUtils?.warnPlayer(player, removalMessage, dependencies); // Pass dependencies
                    logDetails = `Removed ${removedItemCount}x ${itemTypeIdToRemove} from ${player?.nameTag} (Check: ${checkType}). Message: '${removalMessage}'`;
                } else {
                    playerUtils?.warnPlayer(player, removalMessage, dependencies); // Pass dependencies & Notify even if no items found
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player?.nameTag} (Check: ${checkType}). Player notified with: '${removalMessage}'`;
                }
                actionProcessed = true;
            } catch (e) {
                const errorMsg = e.stack || e;
                playerUtils?.debugLog(`[AutoModManager] Error during removeIllegalItem for ${player?.nameTag} (${itemTypeIdToRemove}): ${errorMsg}`, player?.nameTag, dependencies);
                logDetails = `Error removing item ${itemTypeIdToRemove} from ${player?.nameTag}: ${e.message}`;
                logManager?.addLog({ event: 'automodRemoveItemFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: `Item: ${itemTypeIdToRemove}`, details: `Error: ${e.message}`, checkType: checkType, actionType: 'error' }, dependencies);
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
            finalTeleportDesc = teleportTargetDesc;
            const teleportLocation = { x: targetX, y: targetY, z: targetZ };

            try {
                const safeLocation = player?.dimension?.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });
                const locationToTeleport = safeLocation || teleportLocation;

                if (safeLocation) {
                    finalTeleportDesc = `X:${safeLocation.x.toFixed(1)}, Y:${safeLocation.y.toFixed(1)}, Z:${safeLocation.z.toFixed(1)} (near requested ${teleportTargetDesc})`;
                }
                baseMessageContext.teleportCoordinates = finalTeleportDesc;
                const teleportContext = { ...baseMessageContext }; // teleportCoordinates already updated in baseMessageContext

                const teleportMessage = formatAutomodMessage(messageTemplate, teleportContext);
                player?.teleport(locationToTeleport, { dimension: player.dimension });
                playerUtils?.warnPlayer(player, teleportMessage, dependencies); // Pass dependencies
                logDetails = `Teleported player ${player?.nameTag} to ${finalTeleportDesc}. Check: ${checkType}. Message: '${teleportMessage}'`;
                actionProcessed = true;
            } catch (e) {
                const errorMsg = e.stack || e;
                playerUtils?.debugLog(`[AutoModManager] Error teleporting player ${player?.nameTag} for teleportSafe: ${errorMsg}`, player?.nameTag, dependencies);
                playerUtils?.warnPlayer(player, `Failed to teleport: ${e.message}`, dependencies); // Pass dependencies
                logDetails = `Failed to teleport player ${player?.nameTag} to ${teleportTargetDesc}. Check: ${checkType}. Error: ${e.message}`;
                logManager?.addLog({ event: 'automodTeleportFailure', adminName: 'AutoMod', targetName: player?.nameTag, reason: `Target: ${teleportTargetDesc}`, details: `Error: ${e.message}`, checkType: checkType, actionType: 'error' }, dependencies);
            }
            break;
        }
        case 'flagOnly': {
            const flagOnlyMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            logDetails = `flagOnly rule processed for ${player?.nameTag}, check: ${checkType}. Log Message: '${flagOnlyMessage}'`;
            actionProcessed = true;
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
            event: `automod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`,
            adminName: 'AutoMod',
            targetName: player?.nameTag,
            duration: durationForLog,
            reason: finalReasonForLog,
            details: logDetails,
            checkType: checkType,
            actionParams: parameters, // Includes flagThreshold
        }, dependencies);

        const adminContext = {
            ...baseMessageContext, // Already contains updated itemQuantity, teleportCoordinates, duration (if applicable)
        };
        const finalAdminMessage = formatAutomodMessage(adminMessageTemplate, adminContext);
        // Configurable notification for AutoMod actions
        if (dependencies.config.notifications?.notifyOnAutoModAction !== false) { // Default true if undefined
            playerUtils?.notifyAdmins(finalAdminMessage, dependencies, player, pData);
        }

    } else {
        const criticalActions = ['warn', 'kick', 'tempBan', 'permBan', 'mute', 'removeIllegalItem', 'teleportSafe'];
        if (criticalActions.includes(actionType)) {
            // Debug log for failure already exists in most cases.
            // Generic log for processing failure
            logManager?.addLog({
                event: `automod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}ProcessingFailure`,
                adminName: 'AutoMod',
                targetName: player?.nameTag,
                details: logDetails, // Contains error info from switch cases
                checkType: checkType,
                actionParams: parameters,
                actionType: 'error',
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
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function processAutoModActions(player, pData, checkType, dependencies) {
    const { config: globalConfig, playerUtils, automodConfig: dependenciesAutomodConfig } = dependencies;

    if (!globalConfig?.enableAutoMod) {
        return;
    }

    if (dependenciesAutomodConfig?.automodPerCheckTypeToggles?.[checkType] === false) {
        playerUtils?.debugLog(`AutomodManager: AutoMod for checkType '${checkType}' on ${player?.nameTag} is disabled via per-check toggle.`, player?.nameTag, dependencies);
        return;
    }

    if (!dependenciesAutomodConfig?.automodRules) {
        playerUtils?.debugLog(`AutomodManager: automodRules not found in dependenciesAutomodConfig for ${player?.nameTag}, checkType: ${checkType}`, player?.nameTag, dependencies);
        return;
    }

    const rulesForCheck = dependenciesAutomodConfig?.automodRules?.[checkType];
    if (!rulesForCheck || rulesForCheck.length === 0) {
        return;
    }

    const currentFlags = pData?.flags?.[checkType]?.count || 0;
    if (currentFlags === 0) {
        return;
    }

    pData.automodState ??= {};
    pData.automodState[checkType] ??= { lastActionThreshold: 0, lastActionTimestamp: 0 };
    const checkState = pData.automodState[checkType];

    let bestRuleToApply = null;
    // Find the highest threshold rule that the player meets and hasn't been actioned at this exact flag count or higher.
    // This ensures escalating punishments are applied if flags increase or a higher threshold is met.
    for (const rule of rulesForCheck) { // rulesForCheck is already checked
        if (currentFlags >= rule.flagThreshold) {
            if (rule.flagThreshold > checkState.lastActionThreshold || (rule.flagThreshold === checkState.lastActionThreshold && currentFlags > checkState.lastActionThreshold) ) {
                if (!bestRuleToApply || rule.flagThreshold > bestRuleToApply.flagThreshold) {
                    bestRuleToApply = rule;
                }
            }
        }
    }

    if (bestRuleToApply) {
        // Prevents re-actioning if flag count hasn't changed from the point the last action for this threshold was taken.
        if (bestRuleToApply.flagThreshold === checkState.lastActionThreshold && currentFlags === checkState.lastActionThreshold) {
            playerUtils?.debugLog(`AutomodManager: Rule for threshold ${bestRuleToApply.flagThreshold} for ${checkType} on ${player?.nameTag} was already the last actioned. Current flags (${currentFlags}) haven't surpassed it. Skipping.`, player?.nameTag, dependencies);
            return;
        }

        playerUtils?.debugLog(`AutomodManager: ${player?.nameTag} (flags: ${currentFlags} for ${checkType}) meets threshold ${bestRuleToApply.flagThreshold}. Intended action: ${bestRuleToApply.actionType}`, player?.nameTag, dependencies);
        if (bestRuleToApply.parameters) {
            playerUtils?.debugLog(`AutomodManager: Action parameters: ${JSON.stringify(bestRuleToApply.parameters)}`, player?.nameTag, dependencies);
        }

        const finalParameters = { ...(bestRuleToApply.parameters || {}), flagThreshold: bestRuleToApply.flagThreshold };

        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, finalParameters, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now();
            if (pData) pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils?.debugLog(`AutomodManager: Resetting flags for ${checkType} on ${player?.nameTag} as per rule (Threshold: ${bestRuleToApply.flagThreshold}, Action: ${bestRuleToApply.actionType}).`, player?.nameTag, dependencies);
                if (pData?.flags?.[checkType]) {
                    if (typeof pData.flags.totalFlags === 'number' && typeof pData.flags[checkType].count === 'number') {
                        pData.flags.totalFlags = Math.max(0, pData.flags.totalFlags - pData.flags[checkType].count);
                    }
                    pData.flags[checkType].count = 0;
                }
                if (pData?.automodState?.[checkType]) {
                    pData.automodState[checkType].lastActionThreshold = 0;
                }
                if (pData) pData.isDirtyForSave = true;
            }
        }
    }
}
