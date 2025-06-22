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
 * @returns {string} A human-readable duration string. Returns "Permanent" if ms is Infinity.
 */
function formatDuration(ms) { // getStringFn removed
    if (ms === Infinity) return "Permanent"; // Direct string
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
    const { playerUtils, logManager, config, playerDataManager } = dependencies; // getString removed
    const currentAutomodConfig = config.automodConfig;

    playerUtils.debugLog(`[AutoModManager] Dispatching action '${actionType}' for ${player.nameTag} due to ${checkType}. Params: ${JSON.stringify(parameters)}`, player.nameTag, dependencies);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;
    let adminNotifyDetails = "";

    // Invented strings based on keys. This is a large section and will require careful, context-based invention.
    // Helper to get message from config or use a default based on key
    const getActionMessage = (key, defaultKeyBasedMessage) => {
        return currentAutomodConfig?.automodActionMessages?.[key] || defaultKeyBasedMessage;
    };

    // Corrected switch cases to use camelCase
    switch (actionType) {
        case "warn":
            const reasonKeyWarn = parameters.reasonKey || 'automod.unknown.warn';
            // "automod.action.warnDefaultReason" -> "You have received an automated warning."
            const messageWarn = getActionMessage(reasonKeyWarn, "You have received an automated warning.");

            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, messageWarn);
                logDetails = `Warned player. Check: ${checkType}, Reason: ${messageWarn}`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] playerUtils.warnPlayer not found for warn action.`, player.nameTag, dependencies);
            }
            break;
        case "kick":
            const reasonKeyKick = parameters.reasonKey || 'automod.unknown.kick';
            // "automod.action.kickDefaultReason" -> "Kicked by AutoMod due to rule violation."
            const kickReason = getActionMessage(reasonKeyKick, "Kicked by AutoMod due to rule violation.");

            try {
                player.kick(kickReason);
                logDetails = `Kicked player. Check: ${checkType}, Reason: ${kickReason}`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Failed to kick player ${player.nameTag}. Check: ${checkType}, Reason: ${kickReason}, Error: ${e.stack || e}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_kick_failure',
                        player: player.nameTag,
                        reason: kickReason,
                        error: e.message,
                        context: 'kick_action'
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "tempBan":
            const reasonKeyTempBan = parameters.reasonKey || 'automod.unknown.tempban';
            // "automod.action.tempbanDefaultReason" -> "Temporarily banned by AutoMod for rule violations."
            const reasonMsgTempBan = getActionMessage(reasonKeyTempBan, "Temporarily banned by AutoMod for rule violations.");
            const durationStringTempBan = parameters.duration || "5m";

            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils.debugLog(`[AutoModManager] Invalid duration string "${durationStringTempBan}" for tempBan on ${player.nameTag}. Defaulting to 5m.`, player.nameTag, dependencies);
                parsedDurationMsTempBan = 300000; // 5 minutes
            }

            const banSuccessTemp = playerDataManager?.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, reasonMsgTempBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessTemp) {
                durationForLog = parsedDurationMsTempBan;
                const friendlyDuration = formatDuration(parsedDurationMsTempBan); // getString removed

                // "automod.kickMessage.tempban.header" -> "You are temporarily banned by AutoMod."
                // "automod.kickMessage.common.reason" -> "Reason: {reason}"
                // "automod.kickMessage.common.duration" -> "Duration: {duration}"
                const kickMsgTempBan = `You are temporarily banned by AutoMod.\nReason: ${reasonMsgTempBan}\nDuration: ${friendlyDuration}`;

                // "automod.adminNotify.details.duration" -> ". Duration: {duration}"
                adminNotifyDetails = `. Duration: ${friendlyDuration}`;
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = `Temp banned player for ${friendlyDuration}. Check: ${checkType}, Reason: ${reasonMsgTempBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after tempBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Temp banned player (kick failed). Duration: ${friendlyDuration}, Check: ${checkType}, Reason: ${reasonMsgTempBan}, Error: ${e.stack || e}`;
                    if (logManager?.addLog) {
                        logManager.addLog('error', {
                            event: 'automod_kick_failure',
                            player: player.nameTag,
                            reason: kickMsgTempBan,
                            error: e.message,
                            context: 'tempBan_action_kick'
                        }, dependencies);
                    }
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply tempBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply tempBan. Check: ${checkType}, Reason: ${reasonMsgTempBan}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addBan_failure',
                        player: player.nameTag,
                        action: 'tempBan',
                        reason: reasonMsgTempBan,
                        duration: parsedDurationMsTempBan
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "permBan":
            const reasonKeyPermBan = parameters.reasonKey || 'automod.unknown.permban';
            // "automod.action.permbanDefaultReason" -> "Permanently banned by AutoMod for severe rule violations."
            const reasonMsgPermBan = getActionMessage(reasonKeyPermBan, "Permanently banned by AutoMod for severe rule violations.");

            const banSuccessPerm = playerDataManager?.addBan && playerDataManager.addBan(player, Infinity, reasonMsgPermBan, "AutoMod", true, checkType, dependencies);

            if (banSuccessPerm) {
                durationForLog = Infinity;
                // "automod.adminNotify.details.duration", "common.value.permanent" -> ". Duration: Permanent"
                adminNotifyDetails = ". Duration: Permanent";

                // "automod.kickMessage.permban.header" -> "You have been permanently banned by AutoMod." (Invented as not in en_US.js)
                // "automod.kickMessage.common.reason" -> "Reason: {reason}"
                const kickMsgPermBan = `You have been permanently banned by AutoMod.\nReason: ${reasonMsgPermBan}`;

                try {
                    player.kick(kickMsgPermBan);
                    logDetails = `Permanently banned player. Check: ${checkType}, Reason: ${reasonMsgPermBan}`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(`[AutoModManager] Error kicking player ${player.nameTag} after permBan: ${e.stack || e}`, player.nameTag, dependencies);
                    logDetails = `Permanently banned player (kick failed). Check: ${checkType}, Reason: ${reasonMsgPermBan}, Error: ${e.stack || e}`;
                    if (logManager?.addLog) {
                        logManager.addLog('error', {
                            event: 'automod_kick_failure',
                            player: player.nameTag,
                            reason: kickMsgPermBan,
                            error: e.message,
                            context: 'permBan_action_kick'
                        }, dependencies);
                    }
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply permBan to ${player.nameTag} via playerDataManager.addBan.`, player.nameTag, dependencies);
                logDetails = `Failed to apply permBan. Check: ${checkType}, Reason: ${reasonMsgPermBan}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addBan_failure',
                        player: player.nameTag,
                        action: 'permBan',
                        reason: reasonMsgPermBan,
                        duration: Infinity
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "mute":
            const reasonKeyMute = parameters.reasonKey || 'automod.unknown.mute';
            // "automod.action.muteDefaultReason" -> "Muted by AutoMod."
            const reasonMsgMute = getActionMessage(reasonKeyMute, "Muted by AutoMod.");
            const durationStringMute = parameters.duration || "10m";
            let parsedDurationMsMute = playerUtils.parseDuration(durationStringMute) || 600000;

            const muteSuccess = playerDataManager?.addMute && playerDataManager.addMute(player, parsedDurationMsMute, reasonMsgMute, "AutoMod", true, checkType, dependencies);

            if (muteSuccess) {
                durationForLog = parsedDurationMsMute;
                // "automod.adminNotify.details.duration" -> ". Duration: {duration}"
                adminNotifyDetails = `. Duration: ${formatDuration(durationForLog)}`;
                logDetails = `Muted player. Duration: ${formatDuration(durationForLog)}, Check: ${checkType}, Reason: ${reasonMsgMute}`;

                // "automod.playerNotification.mute" -> "You have been muted by AutoMod for {reason}. Duration: {duration}" (Invented as not in en_US.js)
                const muteNotificationToPlayer = `You have been muted by AutoMod for ${reasonMsgMute}. Duration: ${formatDuration(durationForLog)}`;
                playerUtils.warnPlayer(player, muteNotificationToPlayer);
                actionProcessed = true;
            } else {
                playerUtils.debugLog(`[AutoModManager] Failed to apply mute to ${player.nameTag} via playerDataManager.addMute.`, player.nameTag, dependencies);
                logDetails = `Failed to apply mute. Duration: ${durationStringMute}, Check: ${checkType}, Reason: ${reasonMsgMute}`;
                if (logManager?.addLog) {
                    logManager.addLog('error', {
                        event: 'automod_addMute_failure',
                        player: player.nameTag,
                        reason: reasonMsgMute,
                        duration: parsedDurationMsMute
                    }, dependencies);
                }
                actionProcessed = false;
            }
            break;
        case "freeze":
            playerUtils.debugLog(`[AutoModManager] 'freeze' action for ${player.nameTag} (check: ${checkType}) is currently a no-op. Direct freeze state management from automod is not yet implemented or command execution was removed.`, player.nameTag, dependencies);
            logDetails = `'freeze' action is not directly supported by AutoMod in this version. Check: ${checkType}. Player: ${player.nameTag}`;
            actionProcessed = false;
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
                    // "automod.default.itemRemoved" -> "AutoMod removed {quantity}x {itemTypeId} from your inventory."
                    let removalMessage = getActionMessage(removalMessageKey, `AutoMod removed ${removedCount}x ${itemTypeIdToRemove} from your inventory.`)
                                                .replace("{quantity}", removedCount.toString())
                                                .replace("{itemTypeId}", itemTypeIdToRemove);

                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    else player.sendMessage(removalMessage);

                    // "automod.adminNotify.details.item" -> ". Item: {item}"
                    adminNotifyDetails = `. Item: ${itemTypeIdToRemove}`;
                    logDetails = `Removed ${removedCount}x ${itemTypeIdToRemove} from ${player.nameTag} (Check: ${checkType}).`;
                } else {
                    logDetails = `No items of type ${itemTypeIdToRemove} found to remove from ${player.nameTag} (Check: ${checkType}).`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error during removeIllegalItem for ${player.nameTag} (${itemTypeIdToRemove}): ${e.stack || e}`, player.nameTag, dependencies);
                // "common.error.generic" -> "§cAn unexpected error occurred."
                adminNotifyDetails = `§cAn unexpected error occurred.: ${e.message || e}`;
                logDetails = `Error removing item ${itemTypeIdToRemove}: ${e.stack || e}`;
                actionProcessed = false;
            }
            break;

        case "teleportSafe":
            const reasonKeyTeleport = parameters.reasonKey || 'automod.unknown.teleport';
            // "automod.action.teleportDefaultReason" -> "AutoMod: You have been teleported to a safe location."
            const localizedTeleportReason = getActionMessage(reasonKeyTeleport, "AutoMod: You have been teleported to a safe location.");
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
                    // "automod.adminNotify.details.teleport" -> "Teleported to: X:{x} Y:{y} Z:{z}"
                    adminNotifyDetails = `Teleported to: X:${safeLocation.x.toFixed(1)} Y:${safeLocation.y.toFixed(1)} Z:${safeLocation.z.toFixed(1)}`;
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
                    adminNotifyDetails = `Teleported to: X:${teleportLocation.x.toFixed(1)} Y:${teleportLocation.y.toFixed(1)} Z:${teleportLocation.z.toFixed(1)}`;
                    actionProcessed = true;
                }

            } catch (e) {
                playerUtils.debugLog(`[AutoModManager] Error teleporting player ${player.nameTag} for teleportSafe: ${e.stack || e}`, player.nameTag, dependencies);
                logDetails = `Failed to teleport player ${player.nameTag} to ${JSON.stringify(teleportLocation)}. Reason: ${localizedTeleportReason}, Error: ${e.stack || e}`;
                adminNotifyDetails = `§cAn unexpected error occurred.: ${e.message || e}`; // Based on common.error.generic
                actionProcessed = false;
            }
            break;

        case "flagOnly":
            logDetails = `flagOnly rule processed for check: ${checkType}. No punitive action taken by design. ReasonKey: ${parameters.reasonKey || 'N/A'}`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(`[AutoModManager] Unknown actionType '${actionType}' for ${player.nameTag} in _executeAutomodAction.`, player.nameTag, dependencies);
            actionProcessed = false;
            break;
    }

    if (actionProcessed && logManager?.addLog) {
        logManager.addLog('info', {
            event: `automod_${actionType.toLowerCase()}`,
            adminName: 'AutoMod',
            targetName: player.nameTag,
            duration: durationForLog,
            reason: parameters?.reasonKey || `Automated action for ${checkType}`,
            details: logDetails,
            checkType: checkType,
            actionParams: parameters
        }, dependencies);


        if (playerUtils && playerUtils.notifyAdmins) {
            // "automod.adminNotify.basePrefix" -> "§7[§cAutoMod§7]"
            const basePrefix = "§7[§cAutoMod§7]";
            const reasonMessageUnlocalized = currentAutomodConfig?.automodActionMessages?.[parameters.reasonKey] || parameters.reasonKey || "automod.action.unknownReason";
            // "automod.action.unknownReason" -> "Unknown or unspecified reason." (Invented)
            const localizedReasonForNotification = getActionMessage(reasonMessageUnlocalized, "Unknown or unspecified reason.");

            // "automod.adminNotify.actionReport" -> "{basePrefix} Action: {actionType} on {playerName} for {checkType}. Reason: {reason}{details}"
            const adminMessage = `${basePrefix} Action: ${actionType} on ${player.nameTag} for ${checkType}. Reason: ${localizedReasonForNotification}${adminNotifyDetails}`;
            playerUtils.notifyAdmins(adminMessage, dependencies, player, pData);
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
