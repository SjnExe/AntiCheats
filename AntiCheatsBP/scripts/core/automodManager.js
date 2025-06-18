/**
 * @file AntiCheatsBP/scripts/core/automodManager.js
 * Manages automated moderation actions based on player flags and configured rules.
 * @version 1.0.1
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
    if (ms < 1000) return \`\${ms}ms\`;

    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    const parts = [];
    if (days > 0) parts.push(\`\${days}d\`); // Assuming d, h, m, s are fine as short units
    if (hours > 0) parts.push(\`\${hours}h\`);
    if (minutes > 0) parts.push(\`\${minutes}m\`);
    if (seconds > 0 || parts.length === 0) parts.push(\`\${seconds}s\`);

    return parts.join(' ');
}

/**
 * Internal function to dispatch and execute specific automod actions.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, commandModules, getString } = dependencies;
    const currentAutomodConfig = config.automodConfig; // config is already from dependencies

    playerUtils.debugLog(\`[AutoModManager] Dispatching action '\${actionType}' for \${player.nameTag} due to \${checkType}. Params: \${JSON.stringify(parameters)}\`, player.nameTag);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;
    let adminNotifyDetails = "";

    switch (actionType) {
        case "warn":
            const reasonKeyWarn = parameters.reasonKey || 'automod.unknown.warn';
            const messageWarnUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyWarn] || "automod.action.warnDefaultReason";
            const localizedMessageWarn = getString(messageWarnUnlocalized); // getString from dependencies

            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, localizedMessageWarn);
                logDetails = \`Warned player. Check: \${checkType}, Reason: \${localizedMessageWarn}\`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(\`[AutoModManager] playerUtils.warnPlayer not found for WARN action.\`, player.nameTag);
            }
            break;
        case "kick":
            const reasonKeyKick = parameters.reasonKey || 'automod.unknown.kick';
            const kickReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyKick] || "automod.action.kickDefaultReason";
            const localizedKickReason = getString(kickReasonUnlocalized); // getString from dependencies

            try {
                player.kick(localizedKickReason);
                logDetails = \`Kicked player. Check: \${checkType}, Reason: \${localizedKickReason}\`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(\`[AutoModManager] Error kicking player \${player.nameTag}: \${e.stack || e}\`, player.nameTag);
                logDetails = \`Failed to kick player \${player.nameTag}. Check: \${checkType}, Reason: \${localizedKickReason}, Error: \${e.stack || e}\`;
                actionProcessed = false;
            }
            break;
        case "tempBan":
            const reasonKeyTempBan = parameters.reasonKey || 'automod.unknown.tempban';
            const reasonMessageTempBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTempBan] || "automod.action.tempbanDefaultReason";
            const localizedReasonMsgTempBan = getString(reasonMessageTempBanUnlocalized); // getString from dependencies
            const durationStringTempBan = parameters.duration || "5m";

            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null || (parsedDurationMsTempBan <= 0 && parsedDurationMsTempBan !== Infinity)) {
                playerUtils.debugLog(\`[AutoModManager] Invalid duration string "\${durationStringTempBan}" for TEMP_BAN on \${player.nameTag}. Defaulting to 5m.\`, player.nameTag);
                parsedDurationMsTempBan = 300000;
            }
            // Pass dependencies to addBan
            if (playerDataManager?.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, localizedReasonMsgTempBan, "AutoMod", true, checkType, dependencies)) {
                durationForLog = parsedDurationMsTempBan;
                const friendlyDuration = formatDuration(parsedDurationMsTempBan, getString); // Pass getString

                const kickMsgHeader = getString("automod.kickMessage.tempban.header"); // getString from dependencies
                const kickMsgReasonPart = getString("automod.kickMessage.common.reason", { reason: localizedReasonMsgTempBan }); // getString from dependencies
                const kickMsgDurationPart = getString("automod.kickMessage.common.duration", { duration: friendlyDuration }); // getString from dependencies
                const kickMsgTempBan = \`\${kickMsgHeader}\n\${kickMsgReasonPart}\n\${kickMsgDurationPart}\`;

                adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: friendlyDuration }); // getString from dependencies
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = \`Temp banned player for \${friendlyDuration}. Check: \${checkType}, Reason: \${localizedReasonMsgTempBan}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`[AutoModManager] Error kicking player \${player.nameTag} after TEMP_BAN: \${e.stack || e}\`, player.nameTag);
                    logDetails = \`Temp banned player (kick failed). Duration: \${friendlyDuration}, Check: \${checkType}, Reason: \${localizedReasonMsgTempBan}, Error: \${e.stack || e}\`;
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(\`[AutoModManager] Failed to apply TEMP_BAN to \${player.nameTag} via playerDataManager.addBan.\`, player.nameTag);
                logDetails = \`Failed to apply TEMP_BAN. Check: \${checkType}, Reason: \${localizedReasonMsgTempBan}\`;
                actionProcessed = false;
            }
            break;
        case "permBan":
            const reasonKeyPermBan = parameters.reasonKey || 'automod.unknown.permban';
            const reasonMessagePermBanUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyPermBan] || "automod.action.permbanDefaultReason";
            const localizedReasonMsgPermBan = getString(reasonMessagePermBanUnlocalized); // getString from dependencies

            if (commandModules?.ban?.execute) { // commandModules is from dependencies
                try {
                    const args = [player.nameTag, "perm", ...localizedReasonMsgPermBan.split(' ')];
                    await commandModules.ban.execute(null, args, dependencies, "AutoMod", true, checkType);
                    durationForLog = Infinity;
                    adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: getString("common.value.permanent") }); // getString from dependencies
                    logDetails = \`PERM_BAN action delegated to ban command for \${player.nameTag}. Reason: \${localizedReasonMsgPermBan}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`[AutoModManager] Error delegating PERM_BAN for \${player.nameTag} to ban command: \${e.stack || e}\`, player.nameTag);
                    logDetails = \`Failed to delegate PERM_BAN for \${player.nameTag}. Error: \${e.stack || e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`[AutoModManager] Ban command module not available for PERM_BAN on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Ban command module not found for PERM_BAN.";
                actionProcessed = false;
            }
            break;
        case "mute":
            const reasonKeyMute = parameters.reasonKey || 'automod.unknown.mute';
            const reasonMessageMuteUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyMute] || "automod.action.muteDefaultReason";
            const localizedReasonMsgMute = getString(reasonMessageMuteUnlocalized); // getString from dependencies
            const durationStringMute = parameters.duration || "10m";

            if (commandModules?.mute?.execute) { // commandModules is from dependencies
                try {
                    const args = [player.nameTag, durationStringMute, ...localizedReasonMsgMute.split(' ')];
                    await commandModules.mute.execute(null, args, dependencies, "AutoMod", true, checkType);
                    durationForLog = playerUtils.parseDuration(durationStringMute) || 0;
                    adminNotifyDetails = getString("automod.adminNotify.details.duration", { duration: formatDuration(durationForLog, getString) }); // Pass getString
                    logDetails = \`MUTE action delegated to mute command for \${player.nameTag}. Duration: \${durationStringMute}, Reason: \${localizedReasonMsgMute}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`[AutoModManager] Error delegating MUTE for \${player.nameTag} to mute command: \${e.stack || e}\`, player.nameTag);
                    logDetails = \`Failed to delegate MUTE for \${player.nameTag}. Duration: \${durationStringMute}, Error: \${e.stack || e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`[AutoModManager] Mute command module not available for MUTE on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Mute command module not found for MUTE.";
                actionProcessed = false;
            }
            break;
        case "freeze":
            const reasonKeyFreeze = parameters.reasonKey || 'automod.unknown.freeze';
            const reasonMessageFreezeUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyFreeze] || "automod.action.freezeDefaultReason";
            const localizedReasonMsgFreeze = getString(reasonMessageFreezeUnlocalized); // getString from dependencies

            if (commandModules?.freeze?.execute) { // commandModules is from dependencies
                try {
                    const args = [player.nameTag, "on"];
                    await commandModules.freeze.execute(null, args, dependencies, "AutoMod");
                    durationForLog = null;
                    adminNotifyDetails = "";
                    logDetails = \`FREEZE action (state: on) delegated to freeze command for \${player.nameTag}. LogReason: \${localizedReasonMsgFreeze}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`[AutoModManager] Error delegating FREEZE for \${player.nameTag} to freeze command: \${e.stack || e}\`, player.nameTag);
                    logDetails = \`Failed to delegate FREEZE for \${player.nameTag}. Error: \${e.stack || e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`[AutoModManager] Freeze command module not available for FREEZE on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Freeze command module not found for FREEZE.";
                actionProcessed = false;
            }
            break;
        case "removeIllegalItem":
            const itemTypeIdToRemove = parameters.itemToRemoveTypeId;
            if (!itemTypeIdToRemove) {
                playerUtils.debugLog(\`[AutoModManager] itemToRemoveTypeId not provided for REMOVE_ILLEGAL_ITEM on \${player.nameTag}.\`, player.nameTag);
                logDetails = "itemToRemoveTypeId missing in parameters for REMOVE_ILLEGAL_ITEM.";
                actionProcessed = false;
                break;
            }
            try {
                const inventory = player.getComponent("minecraft:inventory");
                if (!inventory?.container) {
                    playerUtils.debugLog(\`[AutoModManager] Could not get inventory for \${player.nameTag} for REMOVE_ILLEGAL_ITEM.\`, player.nameTag);
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
                    let removalMessage = getString(currentAutomodConfig?.automodActionMessages?.[removalMessageKey] || "automod.default.itemRemoved", // getString from dependencies
                                                 { quantity: removedCount.toString(), itemTypeId: itemTypeIdToRemove });

                    if (playerUtils.warnPlayer) playerUtils.warnPlayer(player, removalMessage);
                    else player.sendMessage(removalMessage);

                    adminNotifyDetails = getString("automod.adminNotify.details.item", { item: itemTypeIdToRemove }); // getString from dependencies
                    logDetails = \`Removed \${removedCount}x \${itemTypeIdToRemove} from \${player.nameTag} (Check: \${checkType}).\`;
                } else {
                    logDetails = \`No items of type \${itemTypeIdToRemove} found to remove from \${player.nameTag} (Check: \${checkType}).\`;
                }
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(\`[AutoModManager] Error during REMOVE_ILLEGAL_ITEM for \${player.nameTag} (\${itemTypeIdToRemove}): \${e.stack || e}\`, player.nameTag);
                adminNotifyDetails = getString("common.error.generic") + \`: \${e.message || e}\`; // getString from dependencies
                logDetails = \`Error removing item \${itemTypeIdToRemove}: \${e.stack || e}\`;
                actionProcessed = false;
            }
            break;

        case "teleportSafe":
            const reasonKeyTeleport = parameters.reasonKey || 'automod.unknown.teleport';
            const teleportReasonUnlocalized = currentAutomodConfig?.automodActionMessages?.[reasonKeyTeleport] || "automod.action.teleportDefaultReason";
            const localizedTeleportReason = getString(teleportReasonUnlocalized); // getString from dependencies
            const targetCoordinates = parameters.coordinates; // Expected format: { x?: number, y: number, z?: number }

            if (!targetCoordinates || typeof targetCoordinates.y !== 'number') {
                playerUtils.debugLog(\`[AutoModManager] Invalid or missing coordinates for TELEPORT_SAFE on \${player.nameTag}. Y-coordinate is mandatory.\`, player.nameTag);
                logDetails = `Invalid coordinates for TELEPORT_SAFE. Y-coordinate missing. Check: ${checkType}`;
                actionProcessed = false;
                break;
            }

            // Use player's current X and Z if not provided in parameters
            const targetX = typeof targetCoordinates.x === 'number' ? targetCoordinates.x : player.location.x;
            const targetZ = typeof targetCoordinates.z === 'number' ? targetCoordinates.z : player.location.z;
            const targetY = targetCoordinates.y;

            const teleportLocation = { x: targetX, y: targetY, z: targetZ };

            try {
                // Attempt to find a safe location near the target.
                // Adjust searchDistance and maxHeightDifference as needed.
                const safeLocation = player.dimension.findClosestSafeLocation(teleportLocation, { maxHeightDifference: 5, searchDistance: 5 });

                if (safeLocation) {
                    player.teleport(safeLocation, { dimension: player.dimension });
                    if (playerUtils.warnPlayer) {
                        playerUtils.warnPlayer(player, localizedTeleportReason);
                    } else {
                        player.sendMessage(localizedTeleportReason);
                    }
                    logDetails = `Teleported player to safe location near ${JSON.stringify(teleportLocation)}. Reason: ${localizedTeleportReason}`;
                    adminNotifyDetails = getString("automod.adminNotify.details.teleport", { x: safeLocation.x.toFixed(1), y: safeLocation.y.toFixed(1), z: safeLocation.z.toFixed(1) }); // getString from dependencies
                    actionProcessed = true;
                } else {
                    // Fallback: try teleporting to the exact location if no clearly safe spot is found nearby.
                    // This might be okay for specific use cases like Nether Roof where Y is the primary concern.
                    playerUtils.debugLog(\`[AutoModManager] No ideal safe location found for TELEPORT_SAFE near ${JSON.stringify(teleportLocation)} for ${player.nameTag}. Attempting direct teleport.\`, player.nameTag);
                    player.teleport(teleportLocation, { dimension: player.dimension });
                     if (playerUtils.warnPlayer) {
                        playerUtils.warnPlayer(player, localizedTeleportReason);
                    } else {
                        player.sendMessage(localizedTeleportReason);
                    }
                    logDetails = `Teleported player directly to ${JSON.stringify(teleportLocation)} (safe location search failed). Reason: ${localizedTeleportReason}`;
                    adminNotifyDetails = getString("automod.adminNotify.details.teleport", { x: teleportLocation.x.toFixed(1), y: teleportLocation.y.toFixed(1), z: teleportLocation.z.toFixed(1) }); // getString from dependencies
                    actionProcessed = true; // Still considered processed if direct teleport is acceptable fallback
                }

            } catch (e) {
                playerUtils.debugLog(\`[AutoModManager] Error teleporting player ${player.nameTag} for TELEPORT_SAFE: \${e.stack || e}\`, player.nameTag);
                logDetails = \`Failed to teleport player \${player.nameTag} to ${JSON.stringify(teleportLocation)}. Reason: \${localizedTeleportReason}, Error: \${e.stack || e}\`;
                adminNotifyDetails = getString("common.error.generic") + \`: \${e.message || e}\`; // getString from dependencies
                actionProcessed = false;
            }
            break;

        case "flagOnly":
            logDetails = \`FLAG_ONLY rule processed for check: \${checkType}. No punitive action taken by design. ReasonKey: \${parameters.reasonKey || 'N/A'}\`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(\`[AutoModManager] Unknown actionType '\${actionType}' for \${player.nameTag} in _executeAutomodAction.\`, player.nameTag);
            actionProcessed = false;
            break;
    }

    if (actionProcessed && logManager?.addLog) {
        logManager.addLog({
            actionType: \`automod_\${actionType.toLowerCase()}\`,
            adminName: 'AutoMod',
            targetName: player.nameTag,
            duration: durationForLog,
            reason: parameters?.reasonKey || \`Automated action for \${checkType}\`, // This should be the unlocalized key
            details: logDetails
        });

        if (playerUtils && playerUtils.notifyAdmins) {
            const basePrefix = getString("automod.adminNotify.basePrefix"); // getString from dependencies
            // Ensure reasonMessageUnlocalized is the key, not already localized string.
            const reasonMessageUnlocalized = currentAutomodConfig?.automodActionMessages?.[parameters.reasonKey] || parameters.reasonKey || "automod.action.unknownReason";
            const localizedReasonForNotification = getString(reasonMessageUnlocalized); // getString from dependencies

            const adminMessage = getString("automod.adminNotify.actionReport", { // getString from dependencies
                basePrefix: basePrefix,
                actionType: actionType,
                playerName: player.nameTag,
                checkType: checkType,
                reason: localizedReasonForNotification, // Use the localized reason here
                details: adminNotifyDetails
            });
            playerUtils.notifyAdmins(adminMessage, player, pData);
        }
    } else if (!actionProcessed) {
        if (actionType !== "FLAG_ONLY" && (actionType === "WARN" || actionType === "KICK" || actionType === "TEMP_BAN" || actionType === "PERM_BAN" || actionType === "MUTE" || actionType === "FREEZE" || actionType === "REMOVE_ILLEGAL_ITEM")) {
             playerUtils.debugLog(\`AutomodManager: Action '\${actionType}' failed to process correctly for \${player.nameTag}. Details: \${logDetails}\`, player.nameTag);
        }
    }
    return actionProcessed;
}

/**
 * Processes automated moderation actions for a player based on a specific check type trigger.
 */
export async function processAutoModActions(player, pData, checkType, dependencies) {
    const { config, playerUtils } = dependencies;
    // automodConfig is now part of dependencies.config
    const currentAutomodConfig = dependencies.config.automodConfig;

    if (!config.enableAutoMod) {
        return;
    }

    if (currentAutomodConfig.automodPerCheckTypeToggles &&
        typeof currentAutomodConfig.automodPerCheckTypeToggles[checkType] === 'boolean' &&
        !currentAutomodConfig.automodPerCheckTypeToggles[checkType]) {
        playerUtils.debugLog(\`AutomodManager: AutoMod for checkType '\${checkType}' on \${player.nameTag} is disabled via per-check toggle.\`, player.nameTag);
        return;
    }

    if (!currentAutomodConfig?.automodRules) {
        playerUtils.debugLog(`AutomodManager: automodRules not found in currentAutomodConfig for ${player.nameTag}, checkType: ${checkType}`, player.nameTag);
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
            playerUtils.debugLog(\`AutomodManager: Rule for threshold \${bestRuleToApply.flagThreshold} for \${checkType} on \${player.nameTag} was already the last actioned. Current flags (\${currentFlags}) haven't surpassed it. Skipping.\`, player.nameTag);
            return;
        }

        playerUtils.debugLog(\`AutomodManager: \${player.nameTag} (flags: \${currentFlags} for \${checkType}) meets threshold \${bestRuleToApply.flagThreshold}. Intended action: \${bestRuleToApply.actionType}\`, player.nameTag);

        if (bestRuleToApply.parameters) {
            playerUtils.debugLog(\`AutomodManager: Action parameters: \${JSON.stringify(bestRuleToApply.parameters)}\`, player.nameTag);
        }

        let finalParameters = bestRuleToApply.parameters || {};

        if (bestRuleToApply.actionType === "REMOVE_ILLEGAL_ITEM") {
            if (pData.lastViolationDetailsMap && pData.lastViolationDetailsMap[checkType] && pData.lastViolationDetailsMap[checkType].itemTypeId) {
                const itemDetail = pData.lastViolationDetailsMap[checkType];
                finalParameters = {
                    ...finalParameters,
                    itemToRemoveTypeId: itemDetail.itemTypeId,
                };
                playerUtils.debugLog(\`AutomodManager: Extracted item \${itemDetail.itemTypeId} from pData.lastViolationDetailsMap for REMOVE_ILLEGAL_ITEM action.\`, player.nameTag);
            } else {
                playerUtils.debugLog(\`AutomodManager: REMOVE_ILLEGAL_ITEM action for \${checkType} on \${player.nameTag} but no specific itemTypeId found in pData.lastViolationDetailsMap. Action might be ignored or fail in _executeAutomodAction.\`, player.nameTag);
            }
        }

        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, finalParameters, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now();
            pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils.debugLog(\`AutomodManager: Resetting flags for \${checkType} on \${player.nameTag} as per rule (Threshold: \${bestRuleToApply.flagThreshold}, Action: \${bestRuleToApply.actionType}).\`, player.nameTag);
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

[end of AntiCheatsBP/scripts/core/automodManager.js]
