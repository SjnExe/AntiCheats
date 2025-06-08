/**
 * @file AntiCheatsBP/scripts/core/automodManager.js
 * Manages automated moderation actions based on player flags and configured rules.
 * @version 1.0.0
 */

// Imports will be added here as needed, e.g.:
// import * as mc from '@minecraft/server';
// import { automodRules, automodActionMessages } from '../automodConfig'; // Assuming this path
// import { debugLog } from '../utils/playerUtils'; // Assuming this path

/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1d 2h 30m 15s").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} A human-readable duration string. Returns "Permanent" if ms is Infinity.
 */
function formatDuration(ms) {
    if (ms === Infinity) return "Permanent";
    if (ms < 1000) return \`\${ms}ms\`; // Milliseconds for durations less than a second

    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    const parts = [];
    if (days > 0) parts.push(\`\${days}d\`);
    if (hours > 0) parts.push(\`\${hours}h\`);
    if (minutes > 0) parts.push(\`\${minutes}m\`);
    // Always show seconds if it's the only unit or if other units are present but seconds are non-zero.
    if (seconds > 0 || parts.length === 0) parts.push(\`\${seconds}s\`);

    return parts.join(' ');
}


/**
 * Internal function to dispatch and execute specific automod actions.
 * For Phase 1 & 2, this logs intended actions. Full execution logic in later phases.
 *
 * @param {mc.Player} player The player instance.
 * @param {object} pData The player's anti-cheat data object.
 * @param {string} actionType The type of action to execute (e.g., "WARN", "KICK").
 * @param {object} parameters Parameters for the action (e.g., duration, reasonKey).
 * @param {string} checkType The type of check that triggered this action.
 * @param {object} dependencies An object containing dependencies.
 *                              Expected: { playerUtils, logManager, config, automodConfig, playerDataManager, commandModules }
 * @returns {boolean} True if the action was handled (even if just logged), false otherwise.
 */
async function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, automodConfig, config, playerDataManager, commandModules } = dependencies;

    playerUtils.debugLog(\`AutomodManager: Dispatching action '\${actionType}' for \${player.nameTag} due to \${checkType}. Params: \${JSON.stringify(parameters)}\`, player.nameTag);

    let actionProcessed = false;
    let logDetails = "";
    let durationForLog = null;

    switch (actionType) {
        case "WARN":
            const reasonKeyWarn = parameters.reasonKey || 'automod.unknown.warn';
            const messageWarn = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyWarn])
                ? automodConfig.automodActionMessages[reasonKeyWarn]
                : "You have received an automated warning.";

            if (playerUtils.warnPlayer) {
                playerUtils.warnPlayer(player, messageWarn);
                logDetails = \`Warned player. Check: \${checkType}, Reason: \${messageWarn}\`;
                actionProcessed = true;
            } else {
                playerUtils.debugLog(\`AutomodManager: playerUtils.warnPlayer not found in dependencies for WARN action.\`, player.nameTag);
            }
            break;
        case "KICK":
            const reasonKeyKick = parameters.reasonKey || 'automod.unknown.kick';
            const kickReason = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyKick])
                ? automodConfig.automodActionMessages[reasonKeyKick]
                : "Kicked by AutoMod due to rule violation.";

            try {
                player.kick(kickReason);
                logDetails = \`Kicked player. Check: \${checkType}, Reason: \${kickReason}\`;
                actionProcessed = true;
            } catch (e) {
                playerUtils.debugLog(\`AutomodManager: Error kicking player \${player.nameTag}: \${e}\`, player.nameTag);
                logDetails = \`Failed to kick player \${player.nameTag}. Check: \${checkType}, Reason: \${kickReason}, Error: \${e}\`;
                actionProcessed = false;
            }
            break;
        case "TEMP_BAN":
            const reasonKeyTempBan = parameters.reasonKey || 'automod.unknown.tempban';
            const reasonMessageTempBan = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyTempBan])
                ? automodConfig.automodActionMessages[reasonKeyTempBan]
                : "Temporarily banned by AutoMod for rule violations.";
            const durationStringTempBan = parameters.duration || "5m";

            let parsedDurationMsTempBan = playerUtils.parseDuration(durationStringTempBan);
            if (parsedDurationMsTempBan === null) {
                playerUtils.debugLog(\`AutomodManager: Invalid duration string "\${durationStringTempBan}" for TEMP_BAN on \${player.nameTag}. Defaulting to 5m.\`, player.nameTag);
                parsedDurationMsTempBan = 300000; // 5 minutes in ms
            }

            if (playerDataManager && playerDataManager.addBan && playerDataManager.addBan(player, parsedDurationMsTempBan, reasonMessageTempBan, "AutoMod")) {
                durationForLog = parsedDurationMsTempBan;
                const friendlyDuration = formatDuration(parsedDurationMsTempBan);
                const kickMsgTempBan = \`You are temporarily banned by AutoMod.\nReason: \${reasonMessageTempBan}\nDuration: \${friendlyDuration}\`;
                try {
                    player.kick(kickMsgTempBan);
                    logDetails = \`Temp banned player for \${friendlyDuration}. Check: \${checkType}, Reason: \${reasonMessageTempBan}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`AutomodManager: Error kicking player \${player.nameTag} after TEMP_BAN: \${e}\`, player.nameTag);
                    logDetails = \`Temp banned player (kick failed). Duration: \${friendlyDuration}, Check: \${checkType}, Reason: \${reasonMessageTempBan}, Error: \${e}\`;
                    actionProcessed = true;
                }
            } else {
                playerUtils.debugLog(\`AutomodManager: Failed to apply TEMP_BAN to \${player.nameTag} via playerDataManager.addBan.\`, player.nameTag);
                logDetails = \`Failed to apply TEMP_BAN. Check: \${checkType}, Reason: \${reasonMessageTempBan}\`;
                actionProcessed = false;
            }
            break;
        case "PERM_BAN":
            const reasonKeyPermBan = parameters.reasonKey || 'automod.unknown.permban';
            const reasonMessagePermBan = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyPermBan])
                ? automodConfig.automodActionMessages[reasonKeyPermBan]
                : "Permanently banned by AutoMod for severe rule violations.";

            if (commandModules && commandModules.ban && typeof commandModules.ban.execute === 'function') {
                try {
                    const args = [player.nameTag, "perm", ...reasonMessagePermBan.split(' ')];
                    await commandModules.ban.execute(null, args, dependencies, "AutoMod");

                    durationForLog = Infinity;
                    logDetails = \`PERM_BAN action delegated to ban command for \${player.nameTag}. Reason: \${reasonMessagePermBan}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`AutomodManager: Error delegating PERM_BAN for \${player.nameTag} to ban command: \${e}\`, player.nameTag);
                    logDetails = \`Failed to delegate PERM_BAN for \${player.nameTag}. Error: \${e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`AutomodManager: Ban command module not available for PERM_BAN on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Ban command module not found for PERM_BAN.";
                actionProcessed = false;
            }
            break;
        case "MUTE":
            const reasonKeyMute = parameters.reasonKey || 'automod.unknown.mute';
            const reasonMessageMute = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyMute])
                ? automodConfig.automodActionMessages[reasonKeyMute]
                : "Muted by AutoMod.";
            const durationStringMute = parameters.duration || "10m";

            if (commandModules && commandModules.mute && typeof commandModules.mute.execute === 'function') {
                try {
                    const args = [player.nameTag, durationStringMute, ...reasonMessageMute.split(' ')];
                    await commandModules.mute.execute(null, args, dependencies, "AutoMod");

                    durationForLog = playerUtils.parseDuration(durationStringMute) || 0;
                    logDetails = \`MUTE action delegated to mute command for \${player.nameTag}. Duration: \${durationStringMute}, Reason: \${reasonMessageMute}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`AutomodManager: Error delegating MUTE for \${player.nameTag} to mute command: \${e}\`, player.nameTag);
                    logDetails = \`Failed to delegate MUTE for \${player.nameTag}. Duration: \${durationStringMute}, Error: \${e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`AutomodManager: Mute command module not available for MUTE on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Mute command module not found for MUTE.";
                actionProcessed = false;
            }
            break;
        case "FREEZE":
            const reasonKeyFreeze = parameters.reasonKey || 'automod.unknown.freeze';
            const reasonMessageFreeze = (automodConfig && automodConfig.automodActionMessages && automodConfig.automodActionMessages[reasonKeyFreeze])
                ? automodConfig.automodActionMessages[reasonKeyFreeze]
                : "Player frozen by AutoMod due to rule violation.";

            if (commandModules && commandModules.freeze && typeof commandModules.freeze.execute === 'function') {
                try {
                    const args = [player.nameTag, "on"]; // Command expects "on" or "off"
                    await commandModules.freeze.execute(null, args, dependencies, "AutoMod");

                    durationForLog = null; // Freeze is a state, not a duration for this log.
                    logDetails = \`FREEZE action (state: on) delegated to freeze command for \${player.nameTag}. LogReason: \${reasonMessageFreeze}\`;
                    actionProcessed = true;
                } catch (e) {
                    playerUtils.debugLog(\`AutomodManager: Error delegating FREEZE for \${player.nameTag} to freeze command: \${e}\`, player.nameTag);
                    logDetails = \`Failed to delegate FREEZE for \${player.nameTag}. Error: \${e}\`;
                    actionProcessed = false;
                }
            } else {
                playerUtils.debugLog(\`AutomodManager: Freeze command module not available for FREEZE on \${player.nameTag}.\`, player.nameTag);
                logDetails = "Freeze command module not found for FREEZE.";
                actionProcessed = false;
            }
            break;
        case "FLAG_ONLY":
            logDetails = \`FLAG_ONLY rule processed for check: \${checkType}. No punitive action taken by design. ReasonKey: \${parameters.reasonKey || 'N/A'}\`;
            actionProcessed = true;
            break;
        default:
            playerUtils.debugLog(\`AutomodManager: Unknown actionType '\${actionType}' for \${player.nameTag} in _executeAutomodAction.\`, player.nameTag);
            actionProcessed = false;
            break;
    }

    if (actionProcessed && logManager && logManager.addLog) {
        logManager.addLog({
            actionType: \`automod_\${actionType.toLowerCase()}\`,
            adminName: 'AutoMod',
            targetName: player.nameTag,
            duration: durationForLog,
            reason: parameters?.reasonKey || \`Automated action for \${checkType}\`,
            details: logDetails
        });
    } else if (!actionProcessed) {
        if (actionType !== "FLAG_ONLY" && (actionType === "WARN" || actionType === "KICK" || actionType === "TEMP_BAN" || actionType === "PERM_BAN" || actionType === "MUTE" || actionType === "FREEZE")) {
             playerUtils.debugLog(\`AutomodManager: Action '\${actionType}' failed to process correctly for \${player.nameTag}.\`, player.nameTag);
        }
    }

    return actionProcessed;
}


/**
 * Processes automated moderation actions for a player based on a specific check type trigger.
 * In Phase 1, this function will primarily log intended actions rather than executing them.
 *
 * @param {mc.Player} player The player instance.
 * @param {object} pData The player's anti-cheat data object.
 * @param {string} checkType The type of check that was flagged (e.g., "fly", "speed").
 * @param {object} dependencies An object containing dependencies like config, utility functions, etc.
 *                              Expected to include: { config, automodConfig, playerUtils, logManager, playerDataManager, commandModules }
 */
export async function processAutoModActions(player, pData, checkType, dependencies) {
    const { config, automodConfig, playerUtils } = dependencies;

    if (!config.enableAutoMod) {
        return; // AutoMod is globally disabled
    }

    if (!automodConfig || !automodConfig.automodRules) {
        playerUtils.debugLog(\`AutomodManager: automodRules not found in automodConfig for \${player.nameTag}, checkType: \${checkType}\`, player.nameTag);
        return;
    }

    const rulesForCheck = automodConfig.automodRules[checkType];
    if (!rulesForCheck || rulesForCheck.length === 0) {
        // No AutoMod rules defined for this specific checkType
        return;
    }

    const currentFlags = pData.flags[checkType]?.count || 0;
    if (currentFlags === 0) {
        // No flags, nothing to do
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

        const actionSuccess = await _executeAutomodAction(player, pData, bestRuleToApply.actionType, bestRuleToApply.parameters || {}, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now();
            pData.isDirtyForSave = true;

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils.debugLog(\`AutomodManager: Resetting flags for \${checkType} on \${player.nameTag} as per rule (Threshold: \${bestRuleToApply.flagThreshold}, Action: \${bestRuleToApply.actionType}).\`, player.nameTag);
                if (pData.flags && pData.flags[checkType]) {
                    pData.flags[checkType].count = 0;
                }
                if (pData.automodState && pData.automodState[checkType]) {
                    pData.automodState[checkType].lastActionThreshold = 0;
                }
                pData.isDirtyForSave = true;
            }
        }
    } else {
        // playerUtils.debugLog(\`AutomodManager: No new automod action threshold met for \${player.nameTag} for \${checkType} at \${currentFlags} flags. Last action at \${checkState.lastActionThreshold}.\`, player.nameTag);
    }
}

// Other helper functions for AutoModManager can be defined below if needed.
