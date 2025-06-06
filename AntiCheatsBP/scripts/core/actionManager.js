// AntiCheatsBP/scripts/core/actionManager.js

/**
 * Formats a violation details object into a concise string.
 * @param {object} violationDetails - The details of the violation.
 * @returns {string} A string representation of the violation details.
 */
function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return "N/A";
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
}

/**
 * Formats a message template with player, checkType, and violation details.
 * @param {string} template - The message template.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {string} checkType - The type of check.
 * @param {object} violationDetails - The details of the violation.
 * @returns {string} The formatted message.
 */
function formatActionMessage(template, player, checkType, violationDetails) {
    if (!template) return "";
    let message = template;
    message = message.replace(/{playerName}/g, player.nameTag);
    message = message.replace(/{checkType}/g, checkType);
    message = message.replace(/{detailsString}/g, formatViolationDetails(violationDetails));

    // Allow direct access to violationDetails properties like {propertyName}
    if (violationDetails && typeof violationDetails === 'object') {
        for (const key in violationDetails) {
            if (Object.hasOwnProperty.call(violationDetails, key)) {
                const placeholder = new RegExp(`{${key}}`, 'g');
                message = message.replace(placeholder, violationDetails[key]);
            }
        }
    }
    return message;
}

/**
 * Executes configured actions for a detected cheat/violation.
 * @param {import('@minecraft/server').Player} player - The player who committed the violation.
 * @param {string} checkType - A unique string identifying the check (e.g., "fly_hover", "speed_ground").
 * @param {object} violationDetails - An object containing specific details about the violation.
 * @param {object} dependencies - An object containing dependencies like config, managers, and utils.
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { config, playerDataManager, playerUtils, logManager } = dependencies;

    if (!config || !config.checkActionProfiles) {
        if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`[ActionManager] checkActionProfiles not found in config for ${checkType}.`, null);
        return;
    }

    const profile = config.checkActionProfiles[checkType];

    if (!profile) {
        if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`[ActionManager] No action profile found for checkType: ${checkType}`, null);
        return;
    }

    if (!profile.enabled) {
        if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`[ActionManager] Actions for ${checkType} are disabled in profile.`, null);
        return;
    }

    let flagReasonMessage = "Violation detected."; // Default reason

    // Handle Flagging
    if (profile.flag && playerDataManager && playerDataManager.addFlag) {
        const flagType = profile.flag.type || checkType;
        const increment = profile.flag.increment || 1;
        flagReasonMessage = formatActionMessage(profile.flag.reason || `Triggered ${checkType}`, player, checkType, violationDetails);

        // Assuming addFlag signature is addFlag(player, type, reason, detailsForNotify)
        // The 'reason' here is for the flag itself.
        // The 'detailsForNotify' in addFlag is often a concise version for admin chat.
        // For now, we'll pass the formatted reason as the main reason.
        // The `playerDataManager.addFlag` in this project is `addFlag(player, flagType, reasonMessage, detailsForNotify)`
        // and it increments by 1 each time. So we call it multiple times.
        const flagDetailsForNotify = formatViolationDetails(violationDetails); // For the notification part of addFlag
        for (let i = 0; i < increment; i++) {
             playerDataManager.addFlag(player, flagType, flagReasonMessage, flagDetailsForNotify);
        }
        if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`[ActionManager] Flagged ${player.nameTag} for ${flagType} (x${increment}). Reason: ${flagReasonMessage}`, null);
    }

    // Handle Logging
    if (profile.log && logManager && logManager.addLog) {
        const logActionType = profile.log.actionType || `detected_${checkType}`;
        let logDetails = profile.log.detailsPrefix || "";

        if (profile.log.includeViolationDetails !== false) { // Default to true
            logDetails += formatViolationDetails(violationDetails);
        }

        logManager.addLog({
            adminName: 'System', // Checks are system-detected
            actionType: logActionType,
            targetName: player.nameTag,
            details: logDetails.trim(),
            reason: flagReasonMessage, // Use the reason formulated for flagging, or a specific log reason if defined
            increment: profile.flag ? (profile.flag.increment || 1) : 0 // Log how much the flag was meant to increment by
        });
    }

    // Handle Admin Notification
    if (profile.notifyAdmins && profile.notifyAdmins.message && playerUtils && playerUtils.notifyAdmins) {
        const notifyMsg = formatActionMessage(profile.notifyAdmins.message, player, checkType, violationDetails);
        playerUtils.notifyAdmins(notifyMsg, null); // null for adminPerformingAction as it's a system alert
    }

    // Future: Handle executeCommands, messagePlayer etc.
}
