const secondsPerMinute = 60;
const minutesPerHour = 60;
const hoursPerDay = 24;
const defaultAutomodTempbanDurationMs = 300000;
const defaultAutomodMuteDurationMs = 600000;
/**
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

    let totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / (hoursPerDay * minutesPerHour * secondsPerMinute));
    totalSeconds %= (hoursPerDay * minutesPerHour * secondsPerMinute);

    const hours = Math.floor(totalSeconds / (minutesPerHour * secondsPerMinute));
    totalSeconds %= (minutesPerHour * secondsPerMinute);

    const minutes = Math.floor(totalSeconds / secondsPerMinute);
    const seconds = totalSeconds % secondsPerMinute;

    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0 || parts.length === 0) {
        parts.push(`${seconds}s`);
    }
    return parts.join(' ');
}
/**
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
            // Using a replacer function ensures the replacement is treated as a literal string,
            // preventing issues with special replacement patterns like `$&`.
            message = message.replace(regex, () => String(context[key]));
        }
    }
    return message;
}
function _resetCheckFlags(pData, checkType, flagData, dependencies) {
    const { playerUtils } = dependencies;
    if (flagData) {
        pData.flags.totalFlags = Math.max(0, (pData.flags.totalFlags || 0) - flagData.count);
        flagData.count = 0;
    }
    pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0, lastActionedFlagCount: 0 };
    pData.isDirtyForSave = true;
    playerUtils?.debugLog(`[AutoModManager] Reset flags for ${checkType} on ${pData.playerNameTag}.`, pData.playerNameTag, dependencies);
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {string} actionType
 * @param {import('../types.js').AutoModActionParameters & { flagThresholdInternal?: number }} parameters
 * @param {string} checkType
 * @param {import('../types.js').Dependencies} dependencies
 * @param {import('../types.js').ViolationDetails} [violationDetails]
 * @returns {boolean} True if the action was processed, false otherwise.
 */
function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies, violationDetails) {
    const { playerUtils, logManager, config: globalConfig, playerDataManager } = dependencies;

    if (!player.isValid()) {
        playerUtils?.debugLog(`[AutoModManager] Aborted action '${actionType}' for ${pData.playerNameTag} because player became invalid.`, 'SystemWarn', dependencies);
        return false;
    }

    const flagThresholdForRule = parameters.flagThresholdInternal || 0;
    playerUtils?.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player?.name} due to ${checkType}. Rule Params: ${JSON.stringify(parameters)}`, player?.name, dependencies);
    let actionProcessed = false;
    let logDetails = '';
    /** @type {number | null | typeof Infinity} */
    let durationForLog = null;
    let finalTeleportDesc = 'N/A';
    let removedItemCount = 0;
    const flagCount = pData.flags[checkType]?.count || 0;
    const baseMessageContext = {
        playerName: player?.name,
        actionType,
        checkType,
        flagCount,
        flagThreshold: flagThresholdForRule,
        duration: 'N/A',
        itemTypeId: parameters.itemToRemoveTypeId || 'N/A',
        itemQuantity: 0,
        teleportCoordinates: 'N/A',
    };
    const messageTemplate = parameters.messageTemplate || 'AutoMod Default: {actionType} for {checkType} on {playerName} (Flags: {flagCount}/{flagThreshold}).';
    const adminMessageTemplate = parameters.adminMessageTemplate || 'AutoMod Action: {actionType} on §e{playerName}§r for §b{checkType}§r (Flags: §a{flagCount}/{flagThreshold}§r). Rule Threshold: §a{flagThreshold}§r. Duration: §b{duration}§r. Item: §a{itemTypeId}x{itemQuantity}§r. Coords: §a{teleportCoordinates}§r.';
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
                playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.name}: ${e instanceof Error ? e.stack : errorMessage}`, player?.name, dependencies);
                logDetails = `Failed to kick player ${player?.name}. Check: ${checkType}. Reason: '${kickReason}'. Error: ${errorMessage}`;
                logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.name, reason: kickReason, details: `Error: ${errorMessage}`, checkType }, dependencies);
            }
            break;
        }
        case 'tempBan': {
            const durationStringTempBan = parameters?.duration || '5m';
            let parsedDurationMsTempBan = playerUtils?.parseDuration(durationStringTempBan);
            if (typeof parsedDurationMsTempBan !== 'number' && parsedDurationMsTempBan !== Infinity) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringTempBan}' for tempBan on ${player?.name}. Defaulting to 5m.`, player?.name, dependencies);
                parsedDurationMsTempBan = defaultAutomodTempbanDurationMs;
            }
            const friendlyDurationTempBan = formatDuration(parsedDurationMsTempBan);
            const banReasonForStorageTemp = `AutoMod ${checkType} - ${actionType} (${friendlyDurationTempBan})`;
            if (parsedDurationMsTempBan === null) break; // Should not happen due to default above, but for type safety
            const banSuccessTemp = playerDataManager?.addBan(player, parsedDurationMsTempBan, banReasonForStorageTemp, 'AutoMod', true, checkType, dependencies);
            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                baseMessageContext.duration = friendlyDurationTempBan;
                const tempBanContext = { ...baseMessageContext, duration: friendlyDurationTempBan };
                const kickMsgTempBan = formatAutomodMessage(messageTemplate, tempBanContext);
                try {
                    player?.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDurationTempBan}. Check: ${checkType}. Kick Reason: '${kickMsgTempBan}'. Stored Reason: ${banReasonForStorageTemp}`;
                    playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.name} after tempBan: ${e instanceof Error ? e.stack : errorMessage}`, player?.name, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDurationTempBan}, Check: ${checkType}. Stored Reason: ${banReasonForStorageTemp}. Error: ${errorMessage}`;
                    logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.name, reason: kickMsgTempBan, details: `Error: ${errorMessage}`, checkType }, dependencies);
                    playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
                }
                actionProcessed = true;
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply tempBan to ${player?.name} via playerDataManager.addBan.`, player?.name, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}. Reason: ${banReasonForStorageTemp}`;
                logManager?.addLog({ actionType: 'errorAutomodAddBan', adminName: 'AutoMod', targetName: player?.name, reason: banReasonForStorageTemp, details: `Duration: ${parsedDurationMsTempBan}ms`, checkType }, dependencies);
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
                    playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
                } catch (e) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    playerUtils?.debugLog(`[AutoModManager CRITICAL] Error kicking player ${player?.name} after permBan: ${e instanceof Error ? e.stack : errorMessage}`, player?.name, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}. Stored Reason: ${permBanReasonForStorage}. Error: ${errorMessage}`;
                    logManager?.addLog({ actionType: 'errorAutomodKick', adminName: 'AutoMod', targetName: player?.name, reason: kickMsgPermBan, details: `Error: ${errorMessage}`, checkType }, dependencies);
                    playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
                }
                actionProcessed = true;
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply permBan to ${player?.name} via playerDataManager.addBan.`, player?.name, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}. Reason: ${permBanReasonForStorage}`;
                logManager?.addLog({ actionType: 'errorAutomodAddBan', adminName: 'AutoMod', targetName: player?.name, reason: permBanReasonForStorage, details: 'Duration: Infinity', checkType }, dependencies);
            }
            break;
        }
        case 'mute': {
            const durationStringMute = parameters?.duration || '10m';
            let parsedDurationMsMute = playerUtils?.parseDuration(durationStringMute);
            if (typeof parsedDurationMsMute !== 'number' && parsedDurationMsMute !== Infinity) {
                playerUtils?.debugLog(`[AutoModManager] Invalid duration string '${durationStringMute}' for mute on ${player?.name}. Defaulting to 10m.`, player?.name, dependencies);
                parsedDurationMsMute = defaultAutomodMuteDurationMs;
            }
            const friendlyDurationMute = formatDuration(parsedDurationMsMute);
            const muteReasonForStorage = `AutoMod ${checkType} - ${actionType} (${friendlyDurationMute})`;
            if (parsedDurationMsMute === null) break; // Should not happen due to default above, but for type safety
            const muteSuccess = playerDataManager?.addMute(player, parsedDurationMsMute, muteReasonForStorage, 'AutoMod', true, checkType, dependencies);
            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                baseMessageContext.duration = friendlyDurationMute;
                const muteContext = { ...baseMessageContext, duration: friendlyDurationMute };
                const muteNotificationToPlayer = formatAutomodMessage(messageTemplate, muteContext);
                playerUtils?.warnPlayer(player, muteNotificationToPlayer, dependencies);
                logDetails = `Muted player for ${friendlyDurationMute}. Check: ${checkType}. Reason: ${muteReasonForStorage}. Notification: '${muteNotificationToPlayer}'`;
                actionProcessed = true;
                playerUtils?.playSoundForEvent(player, 'automodActionTaken', dependencies);
            } else {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Failed to apply mute to ${player?.name} via playerDataManager.addMute.`, player?.name, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}. Reason: ${muteReasonForStorage}`;
                logManager?.addLog({ actionType: 'errorAutomodAddMute', adminName: 'AutoMod', targetName: player?.name, reason: muteReasonForStorage, details: `Duration: ${parsedDurationMsMute}ms`, checkType }, dependencies);
            }
            break;
        }
        case 'freezePlayer': {
            const freezeMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            playerUtils?.warnPlayer(player, freezeMessage, dependencies);
            logDetails = `Player ${player?.name} 'frozen' by AutoMod for ${checkType}. Message: '${freezeMessage}'. (Note: Actual freeze mechanics depend on separate implementation and 'frozenPlayerTag' from config.js).`;
            actionProcessed = true;
            playerUtils?.debugLog(`[AutoModManager] 'freezePlayer' action for ${player?.name} (check: ${checkType}). Player notified.`, player?.name, dependencies);
            if (globalConfig.frozenPlayerTag && typeof globalConfig.frozenPlayerTag === 'string') {
                player?.addTag(globalConfig.frozenPlayerTag);
            }
            break;
        }
        case 'removeIllegalItem': {
            const itemTypeIdToRemove = parameters?.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils?.debugLog(`[AutoModManager] itemToRemoveTypeId not provided for removeIllegalItem on ${player?.name}.`, player?.name, dependencies);
                logDetails = 'itemToRemoveTypeId missing in parameters for removeIllegalItem.';
                actionProcessed = false;
                break;
            }
            try {
                const inventory = player?.getComponent('minecraft:inventory');
                if (!inventory?.container) {
                    playerUtils?.debugLog(`[AutoModManager] Could not get inventory for ${player?.name} for removeIllegalItem.`, player?.name, dependencies);
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
                if (removedItemCount > 0) {
                    const removalMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
                    playerUtils?.warnPlayer(player, removalMessage, dependencies);
                    logDetails = `Removed ${removedItemCount}x ${itemTypeIdToRemove} from ${player?.name} (Check: ${checkType}). Message: '${removalMessage}'`;
                } else {
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player?.name} (Check: ${checkType}).`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error during removeIllegalItem for ${player?.name} (${itemTypeIdToRemove}): ${e.stack || e}`, player?.name, dependencies);
                logDetails = `Error removing item ${itemTypeIdToRemove} from ${player?.name}: ${e.message}`;
                logManager?.addLog({ actionType: 'errorAutomodRemoveItem', adminName: 'AutoMod', targetName: player?.name, reason: `Item: ${itemTypeIdToRemove}`, details: `Error: ${e.message}`, checkType }, dependencies);
            }
            break;
        }
        case 'teleportSafe': {
            const { world } = dependencies;
            const targetCoordinatesParam = parameters?.coordinates;
            if (!targetCoordinatesParam || typeof targetCoordinatesParam.y !== 'number') {
                playerUtils?.debugLog(`[AutoModManager] Invalid or missing coordinates for teleportSafe on ${player?.name}. Y-coordinate is mandatory.`, player?.name, dependencies);
                logDetails = `Invalid coordinates for teleportSafe. Y-coordinate missing. Check: ${checkType}`;
                actionProcessed = false;
                break;
            }

            let targetDimension = player.dimension;
            const targetDimensionId = targetCoordinatesParam.dimensionId;
            if (targetDimensionId && typeof targetDimensionId === 'string') {
                try {
                    targetDimension = world.getDimension(targetDimensionId);
                } catch (e) {
                    playerUtils?.debugLog(`[AutoModManager] Invalid dimensionId '${targetDimensionId}' specified for teleportSafe. Defaulting to player's current dimension. Error: ${e.message}`, player?.name, dependencies);
                }
            }

            const targetX = targetCoordinatesParam.x ?? player.location.x;
            const targetZ = targetCoordinatesParam.z ?? player.location.z;
            const targetY = targetCoordinatesParam.y;
            const teleportTargetDesc = `X:${targetX.toFixed(1)}, Y:${targetY.toFixed(1)}, Z:${targetZ.toFixed(1)} in ${targetDimension.id}`;
            finalTeleportDesc = teleportTargetDesc;
            /** @type {import('@minecraft/server').Vector3} */
            const teleportLocation = { x: targetX, y: targetY, z: targetZ };
            try {
                const safeLocation = targetDimension?.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });
                const locationToTeleport = safeLocation || teleportLocation;
                if (safeLocation) {
                    finalTeleportDesc = `X:${safeLocation.x.toFixed(1)}, Y:${safeLocation.y.toFixed(1)}, Z:${safeLocation.z.toFixed(1)} (near requested ${teleportTargetDesc})`;
                }
                baseMessageContext.teleportCoordinates = finalTeleportDesc;
                const teleportMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
                player?.teleport(locationToTeleport, { dimension: targetDimension });
                playerUtils?.warnPlayer(player, teleportMessage, dependencies);
                logDetails = `Teleported player ${player?.name} to ${finalTeleportDesc}. Check: ${checkType}. Message: '${teleportMessage}'`;
                actionProcessed = true;
            } catch (e) {
                playerUtils?.debugLog(`[AutoModManager CRITICAL] Error teleporting player ${player?.name} for teleportSafe: ${e.stack || e}`, player?.name, dependencies);
                playerUtils?.warnPlayer(player, `Failed to teleport: ${e.message}`, dependencies);
                logDetails = `Failed to teleport player ${player?.name} to ${teleportTargetDesc}. Check: ${checkType}. Error: ${e.message}`;
                logManager?.addLog({ actionType: 'errorAutomodTeleport', adminName: 'AutoMod', targetName: player?.name, reason: `Target: ${teleportTargetDesc}`, details: `Error: ${e.message}`, checkType }, dependencies);
            }
            break;
        }
        case 'flagOnly': {
            const flagOnlyMessage = formatAutomodMessage(messageTemplate, baseMessageContext);
            logDetails = `flagOnly rule processed for ${player?.name}, check: ${checkType}. Log Message: '${flagOnlyMessage}'`;
            actionProcessed = true;
            break;
        }
    }
    const finalReasonForLog = `automod.${checkType}.${actionType}`;
    if (actionProcessed) {
        logManager?.addLog({
            actionType: `automod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}Taken`,
            adminName: 'AutoMod',
            targetName: player?.name,
            targetId: player?.id,
            duration: durationForLog,
            reason: finalReasonForLog,
            details: logDetails,
            checkType,
            actionParams: { ...parameters, flagCount, ...violationDetails },
        }, dependencies);
        const adminContext = { ...baseMessageContext };
        const finalAdminMessage = formatAutomodMessage(adminMessageTemplate, adminContext);
        if (globalConfig.notifyOnAutoModAction !== false) {
            playerUtils?.notifyAdmins(finalAdminMessage, dependencies, player, pData);
        }
    } else {
        const criticalActions = ['warn', 'kick', 'tempBan', 'permBan', 'mute', 'removeIllegalItem', 'teleportSafe'];
        if (criticalActions.includes(actionType)) {
            playerUtils?.debugLog(`[AutoModManager CRITICAL] Action '${actionType}' for ${player?.name} (check: ${checkType}) was not processed successfully. Details: ${logDetails}`, player?.name, dependencies);
            logManager?.addLog({
                actionType: `errorAutomod${actionType.charAt(0).toUpperCase() + actionType.slice(1)}Processing`,
                adminName: 'AutoMod',
                targetName: player?.name,
                targetId: player?.id,
                details: logDetails,
                checkType,
                actionParams: parameters,
            }, dependencies);
        }
    }
    return actionProcessed;
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').PlayerAntiCheatData} pData
 * @param {string} checkType
 * @param {import('../types.js').Dependencies} dependencies
 * @param {import('../types.js').ViolationDetails} [violationDetails]
 */
export function processAutoModActions(player, pData, checkType, dependencies, violationDetails) {
    const { config: globalConfig, playerUtils, automodConfig: moduleAutomodConfig } = dependencies;
    if (!globalConfig?.automod?.enabled) {
        return;
    }

    if (!player.isValid()) {
        playerUtils?.debugLog(`[AutoModManager] Aborted processAutoModActions for ${pData.playerNameTag} because player became invalid.`, 'SystemWarn', dependencies);
        return;
    }

    const ruleSet = moduleAutomodConfig?.automodRuleSets?.find(rs => rs.checkType === checkType);
    if (!ruleSet || !ruleSet.enabled) {
        return;
    }

    const rulesForCheck = ruleSet.tiers?.slice().sort((a, b) => b.flagThreshold - a.flagThreshold) || [];
    if (rulesForCheck.length === 0) {
        return;
    }

    const flagData = pData?.flags?.[checkType];
    const currentFlags = flagData?.count || 0;
    if (currentFlags === 0) {
        return;
    }

    pData.automodState ??= {};
    pData.automodState[checkType] ??= { lastActionThreshold: 0, lastActionTimestamp: 0, lastActionedFlagCount: 0 };
    const checkState = pData.automodState[checkType];

    // Find the highest-tier rule the player currently qualifies for.
    /** @type {import('../types.js').AutomodTier | undefined} */
    const applicableRule = rulesForCheck.find(rule => currentFlags >= rule.flagThreshold);

    if (!applicableRule || applicableRule.flagThreshold <= checkState.lastActionThreshold) {
        playerUtils?.debugLog(`[AutoModManager] No new action needed for ${player?.name} for ${checkType}. Current flags: ${currentFlags}, Last action threshold: ${checkState.lastActionThreshold}.`, player?.name, dependencies);
        return;
    }

    if (applicableRule.flagThreshold < checkState.lastActionThreshold) {
        playerUtils?.debugLog(`[AutoModManager] Player ${player?.name} qualifies for a lower-tier rule (${applicableRule.flagThreshold}) for ${checkType} after a likely flag reset. Last action was at ${checkState.lastActionThreshold}. Proceeding.`, player?.name, dependencies);
    }

    playerUtils?.debugLog(`[AutoModManager] ${player?.name} (flags: ${currentFlags} for ${checkType}) meets threshold ${applicableRule.flagThreshold}. Intended action: ${applicableRule.actionType}`, player?.name, dependencies);
    if (applicableRule.parameters) {
        playerUtils?.debugLog(`[AutoModManager] Action parameters: ${JSON.stringify(applicableRule.parameters)}`, player?.name, dependencies);
    }

    /** @type {import('../types.js').AutoModActionParameters & { flagThresholdInternal: number }} */
    const finalParameters = { ...(applicableRule.parameters || {}), flagThresholdInternal: applicableRule.flagThreshold };
    const actionSuccess = _executeAutomodAction(player, pData, applicableRule.actionType, finalParameters, checkType, dependencies, violationDetails);

    if (actionSuccess) {
        checkState.lastActionThreshold = applicableRule.flagThreshold;
        checkState.lastActionedFlagCount = currentFlags;
        checkState.lastActionTimestamp = Date.now();
        pData.isDirtyForSave = true;

        if (applicableRule.resetFlagsAfterAction) {
            playerUtils?.debugLog(`[AutoModManager] Resetting flags for ${checkType} on ${player?.name} as per rule (Threshold: ${applicableRule.flagThreshold}, Action: ${applicableRule.actionType}).`, player?.name, dependencies);
            _resetCheckFlags(pData, checkType, flagData, dependencies);
        }
    }

    if (ruleSet.resetFlagsAfterSeconds && ruleSet.resetFlagsAfterSeconds > 0) {
        const lastFlagTime = flagData?.lastDetectionTime || 0;
        const now = Date.now();
        if (lastFlagTime > 0 && (now - lastFlagTime) > (ruleSet.resetFlagsAfterSeconds * 1000)) {
            if (checkState.lastActionTimestamp <= lastFlagTime || flagData.count === 0) {
                playerUtils?.debugLog(`[AutoModManager] Globally resetting flags for ${checkType} on ${player?.name} due to inactivity (resetAfterSeconds: ${ruleSet.resetFlagsAfterSeconds}).`, player?.name, dependencies);
                _resetCheckFlags(pData, checkType, flagData, dependencies);
            }
        }
    }
}
