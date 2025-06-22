/**
 * @file AntiCheatsBP/scripts/core/actionManager.js
 * Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 * This module is responsible for interpreting check results and applying configured consequences.
 * @version 1.1.0
 */
/**
 * Formats a violation details object into a concise string.
 * Converts an object containing violation specifics (e.g., counts, thresholds)
 * into a human-readable string.
 * Example: `{ "value": 5, "threshold": 2 }` becomes `"value: 5, threshold: 2"`.
 * @param {object} violationDetails - The details of the violation.
 * @returns {string} A string representation of the violation details, or "N/A" if details are empty or invalid.
 */
function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return "N/A";
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
}
/**
 * Formats a message template with player name, checkType, and violation details.
 * Replaces placeholders in a template string with actual values.
 * Supported placeholders: `{playerName}`, `{checkType}`, `{detailsString}`,
 * and any key from `violationDetails` (e.g., `{value}`).
 * @param {string} template - The message template string.
 * @param {string} playerName - The name of the player involved, or a system identifier (e.g., "System").
 * @param {string} checkType - The type of check (e.g., "fly_hover").
 * @param {object} violationDetails - An object containing specific details of the violation.
 * @returns {string} The formatted message. Returns an empty string if the template is falsy.
 */
function formatActionMessage(template, playerName, checkType, violationDetails) {
    if (!template) {
        return "";
    }

    let message = template;
    message = message.replace(/{playerName}/g, playerName);
    message = message.replace(/{checkType}/g, checkType);
    message = message.replace(/{detailsString}/g, formatViolationDetails(violationDetails));

    if (violationDetails && typeof violationDetails === 'object') {
        for (const key in violationDetails) {
            if (Object.prototype.hasOwnProperty.call(violationDetails, key)) {
                const placeholderRegex = new RegExp(`{${key}}`, 'g');
                message = message.replace(placeholderRegex, String(violationDetails[key]));
            }
        }
    }
    return message;
}
/**
 * Executes configured actions for a detected cheat/violation based on predefined profiles.
 * This is the core function for handling consequences of cheat detections.
 * It checks action profiles, flags players, logs events, and notifies admins based on configuration.
 * It now handles cases where the `player` object might be null (e.g., for system-level checks
 * or events not directly tied to a specific player).
 * @param {import('@minecraft/server').Player | null} player - The player who committed the violation, or null if not player-specific.
 * @param {string} checkType - A unique string identifying the check (e.g., "fly_hover", "speed_ground").
 * @param {object} violationDetails - An object containing specific details about the violation.
 * @param {import('../types.js').ActionManagerDependencies} dependencies - An object containing necessary dependencies:
 *                                       - `config`: The global configuration object.
 *                                       - `playerDataManager`: Manager for player data operations.
 *                                       - `playerUtils`: Utility functions for player interactions.
 *                                       - `logManager`: Manager for logging actions.
 * @returns {Promise<void>} A promise that resolves when all actions are completed.
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { config, playerDataManager, playerUtils, logManager } = dependencies;
    const playerNameForLog = player ? player.nameTag : "System";

    if (!config?.checkActionProfiles) {
        playerUtils?.debugLog?.(`[ActionManager] checkActionProfiles not found in config. Cannot process action for ${checkType}. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    const profile = config.checkActionProfiles[checkType];

    if (!profile) {
        playerUtils?.debugLog?.(`[ActionManager] No action profile found for checkType: "${checkType}". Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    if (!profile.enabled) {
        playerUtils?.debugLog?.(`[ActionManager] Actions for checkType "${checkType}" are disabled in its profile. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    let flagReasonMessage = `Violation detected for ${checkType}.`;

    const baseReasonTemplate = profile.flag?.reason || `Triggered ${checkType}`;
    flagReasonMessage = formatActionMessage(
        baseReasonTemplate,
        playerNameForLog,
        checkType,
        violationDetails
    );

    if (player && profile.flag && playerDataManager?.addFlag) {
        const flagType = profile.flag.type || checkType;
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;
        const flagDetailsForAdminNotify = formatViolationDetails(violationDetails);

        for (let i = 0; i < increment; i++) {
            await playerDataManager.addFlag(player, flagType, flagReasonMessage, flagDetailsForAdminNotify, dependencies);
        }
        playerUtils?.debugLog?.(`[ActionManager] Flagged ${playerNameForLog} for ${flagType} (x${increment}). Reason: "${flagReasonMessage}"`, player ? player.nameTag : null, dependencies);
    } else if (!player && profile.flag) {
        playerUtils?.debugLog?.(`[ActionManager] Skipping flagging for checkType "${checkType}" because player is null. Profile had flagging enabled.`, null, dependencies);
    }

    if (profile.log && logManager?.addLog) {
        const logActionType = profile.log.actionType || `detected_${checkType}`;
        let logDetailsString = profile.log.detailsPrefix || "";

        if (profile.log.includeViolationDetails !== false) {
            logDetailsString += formatViolationDetails(violationDetails);
        }

        logManager.addLog({
            adminName: 'System',
            actionType: logActionType,
            targetName: playerNameForLog,
            details: logDetailsString.trim(),
            reason: flagReasonMessage,
        });
    }

    if (profile.notifyAdmins?.message && playerUtils?.notifyAdmins) {
        const notifyMsg = formatActionMessage(
            profile.notifyAdmins.message,
            playerNameForLog,
            checkType,
            violationDetails
        );
        const pData = player && playerDataManager?.getPlayerData ? playerDataManager.getPlayerData(player.id) : null;
        playerUtils.notifyAdmins(notifyMsg, player, pData);
    }

    if (player && playerDataManager && violationDetails?.itemTypeId) {
        const pData = playerDataManager.getPlayerData?.(player.id);
        if (pData) {
            if (!pData.lastViolationDetailsMap) {
                pData.lastViolationDetailsMap = {};
            }
            pData.lastViolationDetailsMap[checkType] = {
                itemTypeId: violationDetails.itemTypeId,
                timestamp: Date.now()
            };
            pData.isDirtyForSave = true;
            playerUtils?.debugLog?.(`[ActionManager] Stored itemTypeId '${violationDetails.itemTypeId}' for check '${checkType}' in pData.lastViolationDetailsMap for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        } else {
            playerUtils?.debugLog?.(`[ActionManager] Could not store itemTypeId for check '${checkType}' because pData could not be retrieved for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        }
    } else if (!player && violationDetails?.itemTypeId) {
        playerUtils?.debugLog?.(`[ActionManager] Skipping storage of itemTypeId for check '${checkType}' because player is null.`, null, dependencies);
    }
}
