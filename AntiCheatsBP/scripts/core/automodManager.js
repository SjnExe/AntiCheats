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
function formatDuration(ms, translationsDict) {
    if (ms === Infinity) return translationsDict["common.value.permanent"] || "Permanent";
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
    const { playerUtils, logManager, config, playerDataManager } = dependencies; // Removed commandModules, getString
    const currentAutomodConfig = config.automodConfig;
    const translationsDict = dependencies.translations_dict || {}; // Assume translations_dict is passed in dependencies

    playerUtils.debugLog(dependencies, `[AutoModManager] Dispatching action '${actionType}' for ${player.nameTag} due to ${checkType}. Params: ${JSON.stringify(parameters)}`, player.nameTag);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;
    let adminNotifyDetails = "";

    switch (actionType) {
        case "warn":
            const reasonKeyWarn = parameters.reasonKey || 'automod.unknown.warn';
            const messageWarnUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyWarn] || "You have received an automated warning."; // automod.action.warnDefaultReason
            const localizedMessageWarn = translationsDict[messageWarnUnlocalized] || messageWarnUnlocalized;

            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, localizedMessageWarn);
                logDetails = `Warned player. Check: ${checkType}, Reason: ${localizedMessageWarn}`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(dependencies, `[AutoModManager] playerUtils.warnPlayer not found for WARN action.`, player.nameTag);
            }
            break;
        case "kick":
            const reasonKeyKick = parameters.reasonKey || 'automod.unknown.kick';
            const kickReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyKick] || "Kicked by AutoMod due to rule violation."; // automod.action.kickDefaultReason
            const localizedKickReason = translationsDict[kickReasonUnlocalized] || kickReasonUnlocalized;

            try {
                player.kick(localizedKickReason);
                logDetails = `Kicked player. Check: ${checkType}, Reason: ${localizedKickReason}`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(dependencies, `[AutoModManager] Error kicking player ${player.nameTag}: ${e.stack || e}`, player.nameTag);
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
        case "tempBan":
            const reasonKeyTempBan = parameters.reasonKey || 'automod.unknown.tempban';
            const reasonMessageTempBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTempBan] || "Temporarily banned by AutoMod for rule violations."; // automod.action.tempbanDefaultReason
            const localizedReasonMsgTempBan = translationsDict[reasonMessageTempBanUnlocalized] || reasonMessageTempBanUnlocalized;
            const durationStringTempBan = parameters.duration || "5m";

            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils.debugLog(dependencies, `[AutoModManager] Invalid duration string "${durationStringTempBan}" for TEMP_BAN on ${player.nameTag}. Defaulting to 5m.`, player.nameTag);
                parsedDurationMsTempBan = 300000; // 5 minutes
            }

            const banSuccessTemp = playerDataManager?.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, localizedReasonMsgTempBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                const friendlyDuration = formatDuration(parsedDurationMsTempBan, translationsDict);

                const kickMsgHeader = translationsDict["automod.kickMessage_tempban_header"] || "You are temporarily banned by AutoMod.";
                const kickMsgReasonPart = `Reason: ${localizedReasonMsgTempBan}`; // translationsDict["automod.kickMessage.common.reason"]
                const kickMsgDurationPart = `Duration: ${friendlyDuration}`; // translationsDict["automod.kickMessage.common.duration"]
                const kickMsgTempBan = `${kickMsgHeader}\n${kickMsgReasonPart}\n${kickMsgDurationPart}`;

                adminNotifyDetails = `. Duration: ${friendlyDuration}`; // translationsDict["automod.adminNotify.details.duration"]
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDuration}. Check: ${checkType}, Reason: ${localizedReasonMsgTempBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(dependencies, `[AutoModManager] Error kicking player ${player.nameTag} after TEMP_BAN: ${e.stack || e}`, player.nameTag);
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
                playerUtils.debugLog(dependencies, `[AutoModManager] Failed to apply TEMP_BAN to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag);
                logDetails = `Failed to apply TEMP_BAN. Check: ${checkType}, Reason: ${localizedReasonMsgTempBan}`;
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
        case "permBan":
            const reasonKeyPermBan = parameters.reasonKey || 'automod.unknown.permban';
            const reasonMessagePermBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyPermBan] || "Permanently banned by AutoMod for severe rule violations."; // automod.action.permbanDefaultReason
            const localizedReasonMsgPermBan = translationsDict[reasonMessagePermBanUnlocalized] || reasonMessagePermBanUnlocalized;

            const banSuccessPerm = playerDataManager?.addBan && playerDataManager.addBan(player, Infinity, localizedReasonMsgPermBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessPerm) {
                durationForLog = Infinity;
                adminNotifyDetails = `. Duration: ${translationsDict["common.value.permanent"] || "Permanent"}`; // translationsDict["automod.adminNotify.details.duration"]

                const kickMsgHeaderPerm = translationsDict["automod.kickMessage_permban_header"] || "You are permanently banned by AutoMod."; // Fallback for missing key
                const kickMsgReasonPartPerm = `Reason: ${localizedReasonMsgPermBan}`; // translationsDict["automod.kickMessage.common.reason"]
                const kickMsgPermBan = `${kickMsgHeaderPerm}\n${kickMsgReasonPartPerm}`;

                try {
                    player.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}, Reason: ${localizedReasonMsgPermBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(dependencies, `[AutoModManager] Error kicking player ${player.nameTag} after PERM_BAN: ${e.stack || e}`, player.nameTag);
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
                playerUtils.debugLog(dependencies, `[AutoModManager] Failed to apply PERM_BAN to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag);
                logDetails = `Failed to apply PERM_BAN. Check: ${checkType}, Reason: ${localizedReasonMsgPermBan}`;
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
        case "mute":
            const reasonKeyMute = parameters.reasonKey || 'automod.unknown.mute';
            const reasonMessageMuteUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyMute] || "Muted by AutoMod."; // automod.action.muteDefaultReason
            const localizedReasonMsgMute = translationsDict[reasonMessageMuteUnlocalized] || reasonMessageMuteUnlocalized;
            const durationStringMute = parameters.duration || "10m";
            let parsedDurationMsMute = playerUtils.parseDuration(durationStringMute) || 600000; // Default to 10m (600,000 ms) if parsing fails

            const muteSuccess = playerDataManager?.addMute && playerDataManager.addMute(player, parsedDurationMsMute, localizedReasonMsgMute, "AutoMod", true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                adminNotifyDetails = `. Duration: ${formatDuration(durationForLog, translationsDict)}`; // translationsDict["automod.adminNotify.details.duration"]
                logDetails = `Muted player. Duration: ${formatDuration(durationForLog, translationsDict)}, Check: ${checkType}, Reason: ${localizedReasonMsgMute}`;

                const muteNotificationToPlayer = `AutoMod: You have been muted for ${formatDuration(durationForLog, translationsDict)}. Reason: ${localizedReasonMsgMute}`; // Fallback for automod.playerNotification.mute
                playerUtils.warnPlayer(player, muteNotificationToPlayer);
                actionProcessed = true;
            } else {
                playerUtils.debugLog(dependencies, `[AutoModManager] Failed to apply MUTE to ${player.nameTag} via playerDataManager.addMute.`, player.nameTag);
                logDetails = `Failed to apply MUTE. Duration: ${durationStringMute}, Check: ${checkType}, Reason: ${localizedReasonMsgMute}`;
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
        case "freeze":
            // const reasonKeyFreeze = parameters.reasonKey || 'automod.unknown.freeze';
            // const reasonMessageFreezeUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyFreeze] || "automod.action.freezeDefaultReason";
            // const localizedReasonMsgFreeze = getString(reasonMessageFreezeUnlocalized);

            playerUtils.debugLog(dependencies, `[AutoModManager] 'freeze' action for ${player.nameTag} (check: ${checkType}) is currently a no-op. Direct freeze state management from automod is not yet implemented or command execution was removed.`, player.nameTag);
            logDetails = `'freeze' action is not directly supported by AutoMod in this version. Check: ${checkType}. Player: ${player.nameTag}`;
            actionProcessed = false; // Mark as not processed to avoid incorrect success logging.
            break;
        case "removeIllegalItem":
            const itemTypeIdToRemove = parameters.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils.debugLog(dependencies, `[AutoModManager] itemToRemoveTypeId not provided for REMOVE_ILLEGAL_ITEM on ${player.nameTag}.`, player.nameTag);
                logDetails = "itemToRemoveTypeId missing in parameters for REMOVE_ILLEGAL_ITEM.";
                actionProcessed = false;
                break;
            }
            try {
                const inventory = player.getComponent("minecraft:inventory");
                if (!inventory?.container) {
                    playerUtils.debugLog(dependencies, `[AutoModManager] Could not get inventory for ${player.nameTag} for REMOVE_ILLEGAL_ITEM.`, player.nameTag);
                    logDetails = "Failed to get player inventory for REMOVE_ILLEGAL_ITEM.";
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
                    let removalMessageUnlocalized = currentAutomodConfig?.automodActionMessages?.[removalMessageKey] || "AutoMod removed {quantity}x {itemTypeId} from your inventory."; // automod.default_itemRemoved
                    let removalMessage = (translationsDict[removalMessageUnlocalized] || removalMessageUnlocalized)
                                                 .replace("{quantity}", removedCount.toString())
                                                 .replace("{itemTypeId}", itemTypeIdToRemove);

                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    else player.sendMessage(removalMessage);

                    adminNotifyDetails = `. Item: ${itemTypeIdToRemove}`; // translationsDict["automod.adminNotify.details.item"]
                    logDetails = `Removed ${removedCount}x ${itemTypeIdToRemove} from ${player.nameTag} (Check: ${checkType}).`;
                } else {
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player.nameTag} (Check: ${checkType}).`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(dependencies, `[AutoModManager] Error during REMOVE_ILLEGAL_ITEM for ${player.nameTag} (${itemTypeIdToRemove}): ${e.stack || e}`, player.nameTag);
                adminNotifyDetails = getString("common.error.generic") + `: ${e.message || e}`;
                logDetails = `Error removing item ${itemTypeIdToRemove}: ${e.stack || e}`;
                actionProcessed = false;
            }
            break;

        case "teleportSafe":
            const reasonKeyTeleport = parameters.reasonKey || 'automod.unknown.teleport';
            const teleportReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTeleport] || "AutoMod: You have been teleported to a safe location."; // automod.action.teleportDefaultReason
            const localizedTeleportReason = translationsDict[teleportReasonUnlocalized] || teleportReasonUnlocalized;
            const targetCoordinates = parameters.coordinates;

            if (!targetCoordinates || typeof targetCoordinates.y !== 'number') {
                playerUtils.debugLog(dependencies, `[AutoModManager] Invalid or missing coordinates for TELEPORT_SAFE on ${player.nameTag}. Y-coordinate is mandatory.`, player.nameTag);
                logDetails = `Invalid coordinates for TELEPORT_SAFE. Y-coordinate missing. Check: ${checkType}`;
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
                    adminNotifyDetails = `Teleported to: X:${safeLocation.x.toFixed(1)} Y:${safeLocation.y.toFixed(1)} Z:${safeLocation.z.toFixed(1)}`; // translationsDict["automod.adminNotify.details.teleport"]
                    actionProcessed = true;
                } else {
                    playerUtils.debugLog(dependencies, `[AutoModManager] No ideal safe location found for TELEPORT_SAFE near ${JSON.stringify(teleportLocation)} for ${player.nameTag}. Attempting direct teleport.`, player.nameTag);
                    player.teleport(teleportLocation, { dimension: player.dimension });
                     if (playerUtils.warnPlayer) {
                        playerUtils.warnPlayer(player, localizedTeleportReason);
                    } else {
                        player.sendMessage(localizedTeleportReason);
                    }
                    logDetails = `Teleported player directly to ${JSON.stringify(teleportLocation)} (safe location search failed). Reason: ${localizedTeleportReason}`;
                    adminNotifyDetails = `Teleported to: X:${teleportLocation.x.toFixed(1)} Y:${teleportLocation.y.toFixed(1)} Z:${teleportLocation.z.toFixed(1)}`; // translationsDict["automod.adminNotify.details.teleport"]
                    actionProcessed = true;
                }

            } catch (e) {
                playerUtils.debugLog(dependencies, `[AutoModManager] Error teleporting player ${player.nameTag} for TELEPORT_SAFE: ${e.stack || e}`, player.nameTag);
                logDetails = `Failed to teleport player ${player.nameTag} to ${JSON.stringify(teleportLocation)}. Reason: ${localizedTeleportReason}, Error: ${e.stack || e}`;
                adminNotifyDetails = (translationsDict["common.error.generic"] || "§cAn unexpected error occurred.") + `: ${e.message || e}`;
                actionProcessed = false;
            }
            break;

        case "flagOnly":
            logDetails = `FLAG_ONLY rule processed for check: ${checkType}. No punitive action taken by design. ReasonKey: ${parameters.reasonKey || 'N/A'}`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(dependencies, `[AutoModManager] Unknown actionType '${actionType}' for ${player.nameTag} in _executeAutomodAction.`, player.nameTag);
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
            const basePrefix = translationsDict["automod.adminNotify_basePrefix"] || "§7[§cAutoMod§7]";
            const reasonMessageUnlocalized = currentAutomodConfig?.automodActionMessages?.[parameters.reasonKey] || parameters.reasonKey || "Automated action for unspecified reasons."; // automod.action.unknownReason
            const localizedReasonForNotification = translationsDict[reasonMessageUnlocalized] || reasonMessageUnlocalized;

            const adminMessage = `${basePrefix} Action: ${actionType} on ${player.nameTag} for ${checkType}. Reason: ${localizedReasonForNotification}${adminNotifyDetails}`; // Fallback for automod.adminNotify.actionReport
            /*getString("automod.adminNotify.actionReport", { // TODO: This complex template needs careful handling
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
             playerUtils.debugLog(dependencies, `AutomodManager: Action '${actionType}' failed to process correctly for ${player.nameTag}. Details: ${logDetails}`, player.nameTag);
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
        playerUtils.debugLog(dependencies, `AutomodManager: AutoMod for checkType '${checkType}' on ${player.nameTag} is disabled via per-check toggle.`, player.nameTag);
        return;
    }

    if (!currentAutomodConfig?.automodRules) {
        playerUtils.debugLog(dependencies, `AutomodManager: automodRules not found in currentAutomodConfig for ${player.nameTag}, checkType: ${checkType}`, player.nameTag);
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
            playerUtils.debugLog(dependencies, `AutomodManager: Rule for threshold ${bestRuleToApply.flagThreshold} for ${checkType} on ${player.nameTag} was already the last actioned. Current flags (${currentFlags}) haven't surpassed it. Skipping.`, player.nameTag);
            return;
        }

        playerUtils.debugLog(dependencies, `AutomodManager: ${player.nameTag} (flags: ${currentFlags} for ${checkType}) meets threshold ${bestRuleToApply.flagThreshold}. Intended action: ${bestRuleToApply.actionType}`, player.nameTag);

        if (bestRuleToApply.parameters) {
            playerUtils.debugLog(dependencies, `AutomodManager: Action parameters: ${JSON.stringify(bestRuleToApply.parameters)}`, player.nameTag);
        }

        let finalParameters = bestRuleToApply.parameters || {};

        if (bestRuleToApply.actionType === "REMOVE_ILLEGAL_ITEM") {
            if (pData.lastViolationDetailsMap && pData.lastViolationDetailsMap[checkType] && pData.lastViolationDetailsMap[checkType].itemTypeId) {
                const itemDetail = pData.lastViolationDetailsMap[checkType];
                finalParameters = {
                    ...finalParameters,
                    itemToRemoveTypeId: itemDetail.itemTypeId,
                };
                playerUtils.debugLog(dependencies, `AutomodManager: Extracted item ${itemDetail.itemTypeId} from pData.lastViolationDetailsMap for REMOVE_ILLEGAL_ITEM action.`, player.nameTag);
            } else {
                playerUtils.debugLog(dependencies, `AutomodManager: REMOVE_ILLEGAL_ITEM action for ${checkType} on ${player.nameTag} but no specific itemTypeId found in pData.lastViolationDetailsMap. Action might be ignored or fail in _executeAutomodAction.`, player.nameTag);
            }
        }

        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, finalParameters, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now();
            pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils.debugLog(dependencies, `AutomodManager: Resetting flags for ${checkType} on ${player.nameTag} as per rule (Threshold: ${bestRuleToApply.flagThreshold}, Action: ${bestRuleToApply.actionType}).`, player.nameTag);
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
