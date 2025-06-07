/**
 * @file AntiCheatsBP/scripts/core/actionManager.js
 * Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 */

/**
 * Formats a violation details object into a concise string.
 * Example: { "value": 5, "threshold": 2 } becomes "value: 5, threshold: 2".
 * @param {object} violationDetails - The details of the violation.
 * @returns {string} A string representation of the violation details, or "N/A" if details are empty or invalid.
 */
function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return "N/A";
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => `${key}: ${String(value)}`) // Ensure value is stringified
        .join(', ');
}

/**
 * Formats a message template with player, checkType, and violation details.
 * Supports placeholders: {playerName}, {checkType}, {detailsString}, and any key from violationDetails (e.g., {value}).
 * @param {string} template - The message template string.
 * @param {import('@minecraft/server').Player} player - The player object.
 * @param {string} checkType - The type of check (e.g., "fly_hover").
 * @param {object} violationDetails - An object containing specific details of the violation.
 * @returns {string} The formatted message. Returns an empty string if the template is falsy.
 */
function formatActionMessage(template, player, checkType, violationDetails) {
    if (!template) return "";

    let message = template;
    // Basic placeholders
    message = message.replace(/{playerName}/g, player.nameTag);
    message = message.replace(/{checkType}/g, checkType);
    message = message.replace(/{detailsString}/g, formatViolationDetails(violationDetails));

    // Allow direct access to violationDetails properties like {propertyName}
    if (violationDetails && typeof violationDetails === 'object') {
        for (const key in violationDetails) {
            // Ensure the property belongs to the object itself, not its prototype
            if (Object.prototype.hasOwnProperty.call(violationDetails, key)) {
                // Create a RegExp for global replacement of this specific key's placeholder
                const placeholderRegex = new RegExp(`{${key}}`, 'g');
                message = message.replace(placeholderRegex, String(violationDetails[key]));
            }
        }
    }
    return message;
}

/**
 * Executes configured actions for a detected cheat/violation based on predefined profiles.
 * Actions can include flagging the player, logging the event, and notifying administrators.
 *
 * @param {import('@minecraft/server').Player} player - The player who committed the violation.
 * @param {string} checkType - A unique string identifying the check (e.g., "fly_hover", "speed_ground").
 *                             This key is used to find the corresponding action profile in `config.checkActionProfiles`.
 * @param {object} violationDetails - An object containing specific details about the violation (e.g., { "speed": 10, "maxSpeed": 8 }).
 *                                    These details can be used in formatted messages.
 * @param {import('../types.js').ActionManagerDependencies} dependencies - An object containing necessary dependencies:
 *                                       - `config`: The global configuration object, expected to have `checkActionProfiles`.
 *                                       - `playerDataManager`: Manager for player data operations (e.g., `addFlag`).
 *                                       - `playerUtils`: Utility functions for player interactions (e.g., `debugLog`, `notifyAdmins`).
 *                                       - `logManager`: Manager for logging actions.
 * @returns {Promise<void>}
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { config, playerDataManager, playerUtils, logManager } = dependencies;

    if (!config?.checkActionProfiles) {
        playerUtils?.debugLog?.(`[ActionManager] checkActionProfiles not found in config. Cannot process action for ${checkType}.`, player.nameTag);
        return;
    }

    const profile = config.checkActionProfiles[checkType];

    if (!profile) {
        playerUtils?.debugLog?.(`[ActionManager] No action profile found for checkType: "${checkType}".`, player.nameTag);
        return;
    }

    if (!profile.enabled) {
        playerUtils?.debugLog?.(`[ActionManager] Actions for checkType "${checkType}" are disabled in its profile.`, player.nameTag);
        return;
    }

    // Default reason, can be overridden by profile.flag.reason
    let flagReasonMessage = `Violation detected for ${checkType}.`;

    // 1. Handle Flagging
    if (profile.flag && playerDataManager?.addFlag) {
        const flagType = profile.flag.type || checkType; // Use specific flag type from profile, or default to checkType
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;

        // Format the reason message that will be shown to the player and potentially logged
        flagReasonMessage = formatActionMessage(
            profile.flag.reason || `Triggered ${checkType}`, // Default reason if not specified in profile
            player,
            checkType,
            violationDetails
        );

        // The `detailsForNotify` parameter of `addFlag` is for the concise part of the admin notification from `addFlag` itself.
        const flagDetailsForAdminNotify = formatViolationDetails(violationDetails);

        for (let i = 0; i < increment; i++) {
            // `playerDataManager.addFlag` handles its own admin notification part.
            playerDataManager.addFlag(player, flagType, flagReasonMessage, flagDetailsForAdminNotify);
        }
        playerUtils?.debugLog?.(`[ActionManager] Flagged ${player.nameTag} for ${flagType} (x${increment}). Reason: "${flagReasonMessage}"`, player.nameTag);
    }

    // 2. Handle Logging (to logManager)
    if (profile.log && logManager?.addLog) {
        const logActionType = profile.log.actionType || `detected_${checkType}`; // e.g., "detected_fly_hover"
        let logDetailsString = profile.log.detailsPrefix || "";

        if (profile.log.includeViolationDetails !== false) { // Defaults to true if not specified
            logDetailsString += formatViolationDetails(violationDetails);
        }

        logManager.addLog({
            adminName: 'System', // Anti-cheat checks are system-detected events
            actionType: logActionType,
            targetName: player.nameTag,
            details: logDetailsString.trim(),
            // Use the fully formatted flagReasonMessage as the primary reason for the log for consistency.
            // If a specific log reason was needed, it could be added to profile.log.reason.
            reason: flagReasonMessage,
            // Optional: include how many flags were added by this action, if flagging occurred.
            // This might be redundant if addFlag also logs, but can be useful here.
            // For now, not adding increment directly to log entry, assuming flagReasonMessage is sufficient.
        });
    }

    // 3. Handle Admin Notification (separate from addFlag's notification, if any)
    // This allows for a potentially different or more detailed notification specifically from ActionManager.
    if (profile.notifyAdmins?.message && playerUtils?.notifyAdmins) {
        const notifyMsg = formatActionMessage(profile.notifyAdmins.message, player, checkType, violationDetails);
        // The `playerUtils.notifyAdmins` function typically takes (message, playerContext, pDataForContext).
        // Here, `player` is the context. `pData` could be fetched if needed for the notification.
        // For a simple system alert, player context might be enough.
        const pData = playerDataManager?.getPlayerData?.(player.id); // Optionally fetch pData for context
        playerUtils.notifyAdmins(notifyMsg, player, pData);
    }

    // Future actions (e.g., running commands, custom events) could be handled here based on profile.
    // Example: if (profile.runCommands && Array.isArray(profile.runCommands)) { ... }
}
