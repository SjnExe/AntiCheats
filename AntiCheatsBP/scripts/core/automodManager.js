/**
 * @file AntiCheatsBP/scripts/core/automodManager.js
 * Manages automated moderation actions based on player flags and configured rules.
 * @version 1.0.2
 */
// import * as mc from '@minecraft/server'; // REMOVED - Unused
// getString will be passed as a dependency

/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1d 2h 30m 15s").
 * @param {number} ms - The duration in milliseconds.
 * @param {function} getStringFn - The getString function from i18n.
 * @returns {string} A human-readable duration string. Returns "Permanent" if ms is Infinity.
 */
function formatDuration(ms, getStringFn) {
    if (ms === Infinity) return getStringFn("common.value.permanent");
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
 * Internal function to dispatch and execute specific automod actions.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, getString } = dependencies; // Removed commandModules
    const currentAutomodConfig = config.automodConfig;

    playerUtils.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player.nameTag} due to ${checkType}. Params: ${JSON.stringify(parameters)}`, player.nameTag, dependencies);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;
    let adminNotifyDetails = "";

    // Corrected switch cases to use camelCase
    switch (actionType) {
        case "warn": // Corrected from "WARN"
            const reasonKeyWarn = parameters.reasonKey || 'automod.unknown.warn';
            const messageWarnUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyWarn] || "automod.action.warnDefaultReason";
            const localizedMessageWarn = getString(messageWarnUnlocalized);

            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, localizedMessageWarn);
                logDetails = `Warned player. Check: ${checkType}, Reason: ${localizedMessageWarn}`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] playerUtils.warnPlayer not found for warn action.`, player.nameTag, dependencies);
            }
            break;
        case "kick": // Corrected from "KICK"
            const reasonKeyKick = parameters.reasonKey || 'automod.unknown.kick';
            const kickReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyKick] || "automod.action.kickDefaultReason";
            const localizedKickReason = getString(kickReasonUnlocalized);

            try {
                player.kick(localizedKickReason);
                logDetails = `Kicked player. Check: ${checkType}, Reason: ${localizedKickReason}`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Failed to kick player ${player.nameTag}. Check: ${checkType}, Reason: ${localizedKickReason}, Error: ${e.stack || e}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_kick_failure',
                        player: player.nameTag,
                        reason: localizedKickReason,
                        error: e.message,
                        context: 'kick_action'
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "tempBan": // Corrected from "TEMP_BAN"
            const reasonKeyTempBan = parameters.reasonKey || 'automod.unknown.tempban';
            const reasonMessageTempBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTempBan] || "automod.action.tempbanDefaultReason";
            const localizedReasonMsgTempBan = getString(reasonMessageTempBanUnlocalized);
            const durationStringTempBan = parameters.duration || "5m";

            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils.debugLog(`[AutoModManager] Invalid duration string "${durationStringTempBan}" for tempBan on ${player.nameTag}. Defaulting to 5m.`, player.nameTag, dependencies);
                parsedDurationMsTempBan = 300000; // 5 minutes
            }

            const banSuccessTemp = playerDataManager?.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, localizedReasonMsgTempBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                const friendlyDuration = formatDuration(parsedDurationMsTempBan, getString);

                const kickMsgHeader = getString("automod.kickMessage.tempban.header");
                const kickMsgReasonPart = getString("automod.kickMessage.common.reason", { reason: localizedReasonMsgTempBan });
                const kickMsgDurationPart = getString("automod.kickMessage.common.duration", { duration: friendlyDuration });
                const kickMsgTempBan = `${kickMsgHeader}\n${kickMsgReasonPart}\n${kickMsgDurationPart}`;

                adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: friendlyDuration });
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDuration}. Check: ${checkType}, Reason: ${localizedReasonMsgTempBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after tempBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDuration}, Check: ${checkType}, Reason: ${localizedReasonMsgTempBan}, Error: ${e.stack || e}`;
                    if (logManager?.addLog) {
                        logManager.addLog('error', {
                            event: 'automod_kick_failure',
                            player: player.nameTag,
                            reason: kickMsgTempBan, // Full kick message
                            error: e.message,
                            context: 'tempBan_action_kick'
                        }, dependencies);
                    }
                    actionProcessed = true; // Ban was applied, kick failed
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply tempBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}, Reason: ${localizedReasonMsgTempBan}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addBan_failure',
                        player: player.nameTag,
                        action: 'tempBan',
                        reason: localizedReasonMsgTempBan,
                        duration: parsedDurationMsTempBan
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "permBan": // Corrected from "PERM_BAN"
            const reasonKeyPermBan = parameters.reasonKey || 'automod.unknown.permban';
            const reasonMessagePermBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyPermBan] || "automod.action.permbanDefaultReason";
            const localizedReasonMsgPermBan = getString(reasonMessagePermBanUnlocalized);

            const banSuccessPerm = playerDataManager?.addBan && playerDataManager.addBan(player, Infinity, localizedReasonMsgPermBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessPerm) {
                durationForLog = Infinity;
                adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: getString("common.value.permanent") });

                const kickMsgHeaderPerm = getString("automod.kickMessage.permban.header");
                const kickMsgReasonPartPerm = getString("automod.kickMessage.common.reason", { reason: localizedReasonMsgPermBan });
                const kickMsgPermBan = `${kickMsgHeaderPerm}\n${kickMsgReasonPartPerm}`;

                try {
                    player.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}, Reason: ${localizedReasonMsgPermBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after permBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}, Reason: ${localizedReasonMsgPermBan}, Error: ${e.stack || e}`;
                    if (logManager?.addLog) {
                        logManager.addLog('error', {
                            event: 'automod_kick_failure',
                            player: player.nameTag,
                            reason: kickMsgPermBan,
                            error: e.message,
                            context: 'permBan_action_kick'
                        }, dependencies);
                    }
                    actionProcessed = true; // Ban was applied, kick failed
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply permBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}, Reason: ${localizedReasonMsgPermBan}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addBan_failure',
                        player: player.nameTag,
                        action: 'permBan',
                        reason: localizedReasonMsgPermBan,
                        duration: Infinity
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "mute": // Corrected from "MUTE"
            const reasonKeyMute = parameters.reasonKey || 'automod.unknown.mute';
            const reasonMessageMuteUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyMute] || "automod.action.muteDefaultReason";
            const localizedReasonMsgMute = getString(reasonMessageMuteUnlocalized);
            const durationStringMute = parameters.duration || "10m";
            let parsedDurationMsMute = playerUtils.parseDuration(durationStringMute) || 600000; // Default to 10m (600,000 ms) if parsing fails

            const muteSuccess = playerDataManager?.addMute && playerDataManager.addMute(player, parsedDurationMsMute, localizedReasonMsgMute, "AutoMod", true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: formatDuration(durationForLog, getString) });
                logDetails = `Muted player. Duration: ${formatDuration(durationForLog, getString)}, Check: ${checkType}, Reason: ${localizedReasonMsgMute}`;

                const muteNotificationToPlayer = getString("automod.playerNotification.mute", {
                    reason: localizedReasonMsgMute,
                    duration: formatDuration(durationForLog, getString)
                });
                playerUtils.warnPlayer(player, muteNotificationToPlayer);
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply mute to ${player.nameTag} via playerDataManager.addMute.`, player.nameTag, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}, Reason: ${localizedReasonMsgMute}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addMute_failure',
                        player: player.nameTag,
                        reason: localizedReasonMsgMute,
                        duration: parsedDurationMsMute
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "freeze": // Corrected from "FREEZE"
            // const reasonKeyFreeze = parameters.reasonKey || 'automod.unknown.freeze';
            // const reasonMessageFreezeUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyFreeze] || "automod.action.freezeDefaultReason";
            // const localizedReasonMsgFreeze = getString(reasonMessageFreezeUnlocalized);

            playerUtils.debugLog(`[AutoModManager] 'freeze' action for ${player.nameTag} (check: ${checkType}) is currently a no-op. Direct freeze state management from automod is not yet implemented or command execution was removed.`, player.nameTag, dependencies);
            logDetails = `'freeze' action is not directly supported by AutoMod in this version. Check: ${checkType}. Player: ${player.nameTag}`;
            actionProcessed = false; // Mark as not processed to avoid incorrect success logging.
            break;
        case "removeIllegalItem": // Corrected from "REMOVE_ILLEGAL_ITEM"
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
                let removedCount = 0;
                for (let i = 0; i < container.size; i++) {
                    const itemStack = container.getItem(i);
                    if (itemStack && itemStack.typeId === itemTypeIdToRemove) {
                        removedCount += itemStack.amount;
                        container.setItem(i, undefined);
                    }
                }
                if (removedCount > 0) {
                    let removalMessageKey = parameters.reasonKey || 'automod.unknown.itemRemoved';
                    let removalMessage = getString(currentAutomodConfig?.automodActionMessages?.[removalMessageKey] || "automod.default.itemRemoved",
                                                 { quantity: removedCount.toString(), itemTypeId: itemTypeIdToRemove });

                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    else player.sendMessage(removalMessage);

                    adminNotifyDetails = getString("automod.adminNotify.details.item", { item: itemTypeIdToRemove });
                    logDetails = `Removed ${removedCount}x ${itemTypeIdToRemove} from ${player.nameTag} (Check: ${checkType}).`;
                } else {
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player.nameTag} (Check: ${checkType}).`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error during removeIllegalItem for ${player.nameTag} (${itemTypeIdToRemove}): ${e.stack || e}`, player.nameTag, dependencies);
                adminNotifyDetails = getString("common.error.generic") + `: ${e.message || e}`;
                logDetails = `Error removing item ${itemTypeIdToRemove}: ${e.stack || e}`;
                actionProcessed = false;
            }
            break;

        case "teleportSafe": // Corrected from "TELEPORT_SAFE"
            const reasonKeyTeleport = parameters.reasonKey || 'automod.unknown.teleport';
            const teleportReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTeleport] || "automod.action.teleportDefaultReason";
            const localizedTeleportReason = getString(teleportReasonUnlocalized);
            const targetCoordinates = parameters.coordinates;

            if (!targetCoordinates || typeof targetCoordinates.y !== 'number') {
                playerUtils.debugLog(`[AutoModManager] Invalid or missing coordinates for teleportSafe on ${player.nameTag}. Y-coordinate is mandatory.`, player.nameTag, dependencies);
                logDetails = `Invalid coordinates for teleportSafe. Y-coordinate missing. Check: ${checkType}`;
                actionProcessed = false;
                break;
            }

            const targetX = typeof targetCoordinates.x === 'number' ? targetCoordinates.x : player.location.x;
            const targetZ = typeof targetCoordinates.z === 'number' ? targetCoordinates.z : player.location.z;
            const targetY = targetCoordinates.y;

            const teleportLocation = { x: targetX, y: targetY, z: targetZ };

            try {
                const safeLocation = player.dimension.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });

                if (safeLocation) {
                    player.teleport(safeLocation, { dimension: player.dimension });
                    if (playerUtils.warnPlayer) {
                        playerUtils.warnPlayer(player, localizedTeleportReason);
                    } else {
                        player.sendMessage(localizedTeleportReason);
                    }
                    logDetails = `Teleported player to safe location near ${JSON.stringify(teleportLocation)}. Reason: ${localizedTeleportReason}`;
                    adminNotifyDetails = getString("automod.adminNotify.details.teleport", { x: safeLocation.x.toFixed(1), y: safeLocation.y.toFixed(1), z: safeLocation.z.toFixed(1) });
                    actionProcessed = true;
                } else {
                    playerUtils.debugLog(`[AutoModManager] No ideal safe location found for teleportSafe near ${JSON.stringify(teleportLocation)} for ${player.nameTag}. Attempting direct teleport.`, player.nameTag, dependencies);
                    player.teleport(teleportLocation, { dimension: player.dimension });
                     if (playerUtils.warnPlayer) {
                        playerUtils.warnPlayer(player, localizedTeleportReason);
                    } else {
                        player.sendMessage(localizedTeleportReason);
                    }
                    logDetails = `Teleported player directly to ${JSON.stringify(teleportLocation)} (safe location search failed). Reason: ${localizedTeleportReason}`;
                    adminNotifyDetails = getString("automod.adminNotify.details.teleport", { x: teleportLocation.x.toFixed(1), y: teleportLocation.y.toFixed(1), z: teleportLocation.z.toFixed(1) });
                    actionProcessed = true;
                }

            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error teleporting player ${player.nameTag} for teleportSafe: ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Failed to teleport player ${player.nameTag} to ${JSON.stringify(teleportLocation)}. Reason: ${localizedTeleportReason}, Error: ${e.stack || e}`;
                adminNotifyDetails = getString("common.error.generic") + `: ${e.message || e}`;
                actionProcessed = false;
            }
            break;

        case "flagOnly": // Corrected from "FLAG_ONLY"
            logDetails = `flagOnly rule processed for check: ${checkType}. No punitive action taken by design. ReasonKey: ${parameters.reasonKey || 'N/A'}`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(`[AutoModManager] Unknown actionType '${actionType}' for ${player.nameTag} in _executeAutomodAction.`, player.nameTag, dependencies);
            actionProcessed = false;
            break;
    }

    if (actionProcessed && logManager?.addLog) {
        logManager.addLog('info', { // Changed to 'info' for successful automod actions. Errors are logged with 'error' type directly.
            event: `automod_${actionType.toLowerCase()}`, // Standardized event naming
            adminName: 'AutoMod', // Consistent adminName
            targetName: player.nameTag,
            duration: durationForLog, // Can be null if not applicable
            reason: parameters?.reasonKey || `Automated action for ${checkType}`,
            details: logDetails,
            checkType: checkType, // Added for better context in logs
            actionParams: parameters // Log parameters for better diagnostics
        }, dependencies);


        if (playerUtils && playerUtils.notifyAdmins) {
            const basePrefix = getString("automod.adminNotify.basePrefix");
            const reasonMessageUnlocalized = currentAutomodConfig?.automodActionMessages?.[parameters.reasonKey] || parameters.reasonKey || "automod.action.unknownReason";
            const localizedReasonForNotification = getString(reasonMessageUnlocalized);

            const adminMessage = getString("automod.adminNotify.actionReport", {
                basePrefix: basePrefix,
                actionType: actionType,
                playerName: player.nameTag,
                checkType: checkType,
                reason: localizedReasonForNotification,
                details: adminNotifyDetails
            });
            playerUtils.notifyAdmins(adminMessage, dependencies, player, pData); // Pass dependencies
        }
    } else if (!actionProcessed && logManager?.addLog) { // Log if action was meant to do something but failed
        // Avoid logging for 'flagOnly' or if the action type itself is unknown (already debug logged)
        const criticalActions = ["warn", "kick", "tempBan", "permBan", "mute", "removeIllegalItem", "teleportSafe"];
        if (criticalActions.includes(actionType)) {
             playerUtils.debugLog(`AutomodManager: Action '${actionType}' failed to process correctly for ${player.nameTag}. Details: ${logDetails}`, player.nameTag, dependencies);
             logManager.addLog('warn', { // Use 'warn' as it's a failure of a defined action, not necessarily a system error.
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
