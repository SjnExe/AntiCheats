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
 * Internal function to dispatch and execute specific automod actions.
 * For Phase 1 & 2, this logs intended actions. Full execution logic in later phases.
 *
 * @param {mc.Player} player The player instance.
 * @param {object} pData The player's anti-cheat data object.
 * @param {string} actionType The type of action to execute (e.g., "WARN", "KICK").
 * @param {object} parameters Parameters for the action (e.g., duration, reasonKey).
 * @param {string} checkType The type of check that triggered this action.
 * @param {object} dependencies An object containing dependencies.
 *                              Expected: { playerUtils, logManager, config, automodConfig }
 * @returns {boolean} True if the action was handled (even if just logged), false otherwise.
 */
function _executeAutomodAction(player, pData, actionType, parameters, checkType, dependencies) {
    const { playerUtils, logManager, automodConfig, config } = dependencies; // Added automodConfig and config

    playerUtils.debugLog(\`AutomodManager: Dispatching action '\${actionType}' for \${player.nameTag} due to \${checkType}. Params: \${JSON.stringify(parameters)}\`, player.nameTag);

    let actionProcessed = false;
    let logDetails = ""; // This will store the specific details for logging, like the warning message.
    let durationForLog = null; // For actions like ban/mute

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
        case "FLAG_ONLY":
            logDetails = \`FLAG_ONLY rule processed for check: \${checkType}. No punitive action taken by design. ReasonKey: \${parameters.reasonKey || 'N/A'}\`;
            actionProcessed = true; // Mark as processed so automodState updates and flags can reset if configured
            break;
        default:
            playerUtils.debugLog(\`AutomodManager: Unknown actionType '\${actionType}' for \${player.nameTag} in _executeAutomodAction.\`, player.nameTag);
            actionProcessed = false; // Unknown action
            break;
    }

    if (actionProcessed && logManager && logManager.addLog) {
        logManager.addLog({
            actionType: \`automod_\${actionType.toLowerCase()}\`, // e.g., automod_warn
            adminName: 'AutoMod',
            targetName: player.nameTag,
            duration: durationForLog, // Will be null for WARN/KICK/FLAG_ONLY, set for BAN/MUTE
            reason: parameters?.reasonKey || \`Automated action for \${checkType}\`, // Log the key or a generic reason
            details: logDetails // Specific details like the message sent
        });
    } else if (!actionProcessed) {
        // This log is for actions that failed (e.g. KICK failed) or were unknown.
        // The default case in the switch already logs unknown action types.
        // This specific condition avoids double-logging for "unknown" and also won't log if FLAG_ONLY was the type (as it's not an error).
        if (actionType !== "FLAG_ONLY" && (actionType === "WARN" || actionType === "KICK")) { // Only log if WARN/KICK failed internally
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
 *                              Expected to include: { config, automodConfig, playerUtils, logManager }
 */
export function processAutoModActions(player, pData, checkType, dependencies) {
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

    // Initialize pData.automodState if it doesn't exist
    if (!pData.automodState) {
        pData.automodState = {};
    }
    if (!pData.automodState[checkType]) {
        pData.automodState[checkType] = { lastActionThreshold: 0, lastActionTimestamp: 0 };
    }

    const checkState = pData.automodState[checkType];
    let bestRuleToApply = null;

    // Find the highest threshold rule that is met and hasn't been applied yet for this count
    for (const rule of rulesForCheck) {
        if (currentFlags >= rule.flagThreshold) {
            if (rule.flagThreshold > checkState.lastActionThreshold || currentFlags > checkState.lastActionThreshold) {
                 // This rule is for a higher threshold than last applied, OR
                 // current flags have increased past the last threshold where an action was taken.
                 // This simple check helps avoid re-applying for the exact same flag count if flags are not reset.
                 // More sophisticated logic might be needed if flags can decrement or rules are very complex.
                if (!bestRuleToApply || rule.flagThreshold > bestRuleToApply.flagThreshold) {
                    bestRuleToApply = rule;
                }
            }
        }
    }

    if (bestRuleToApply) {
        // Check if this specific threshold was the last one actioned upon.
        // This is a simplified attempt to prevent immediate re-triggering if flags haven't changed
        // relative to this specific threshold since the last action.
        // A more robust solution might involve timestamp checks or more detailed state.
        if (bestRuleToApply.flagThreshold === checkState.lastActionThreshold && currentFlags === checkState.lastActionThreshold) {
            playerUtils.debugLog(\`AutomodManager: Rule for threshold \${bestRuleToApply.flagThreshold} for \${checkType} on \${player.nameTag} was already the last actioned. Current flags (\${currentFlags}) haven't surpassed it. Skipping.\`, player.nameTag);
            return;
        }

        playerUtils.debugLog(\`AutomodManager: \${player.nameTag} (flags: \${currentFlags} for \${checkType}) meets threshold \${bestRuleToApply.flagThreshold}. Intended action: \${bestRuleToApply.actionType}\`, player.nameTag);

        if (bestRuleToApply.parameters) {
            playerUtils.debugLog(\`AutomodManager: Action parameters: \${JSON.stringify(bestRuleToApply.parameters)}\`, player.nameTag);
        }

        // Call the dispatcher
        const actionSuccess = _executeAutomodAction(player, pData, bestRuleToApply.actionType, bestRuleToApply.parameters || {}, checkType, dependencies);

        if (actionSuccess) {
            checkState.lastActionThreshold = bestRuleToApply.flagThreshold;
            checkState.lastActionTimestamp = Date.now(); // For potential future use
            pData.isDirtyForSave = true; // Mark pData as dirty since automodState changed

            if (bestRuleToApply.resetFlagsAfterAction) {
                playerUtils.debugLog(\`AutomodManager: Resetting flags for \${checkType} on \${player.nameTag} as per rule (Threshold: \${bestRuleToApply.flagThreshold}, Action: \${bestRuleToApply.actionType}).\`, player.nameTag);
                if (pData.flags && pData.flags[checkType]) { // Ensure flags for checkType exist
                    pData.flags[checkType].count = 0;
                    // Optionally, also reset .lastDetectionTime if it exists for that flag type
                    // pData.flags[checkType].lastDetectionTime = 0;
                }
                // Reset lastActionThreshold in automodState for this checkType so all rules are fresh for evaluation
                if (pData.automodState && pData.automodState[checkType]) {
                    pData.automodState[checkType].lastActionThreshold = 0;
                    // lastActionTimestamp can remain as is, or be reset too if desired.
                    // Resetting lastActionThreshold is key for re-evaluation from lowest rule.
                }
                pData.isDirtyForSave = true; // Ensure this is set
            }
        }
    } else {
        // playerUtils.debugLog(\`AutomodManager: No new automod action threshold met for \${player.nameTag} for \${checkType} at \${currentFlags} flags. Last action at \${checkState.lastActionThreshold}.\`, player.nameTag);
    }
}

// Other helper functions for AutoModManager can be defined below if needed.
