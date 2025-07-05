/**
 * @file Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 * This module is responsible for interpreting check results and applying configured consequences.
 */

/**
 * Formats violation details into a readable string.
 * @param {object | undefined} violationDetails - An object containing details of the violation.
 * @returns {string} A comma-separated string of key-value pairs, or 'N/A'.
 */
function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return 'N/A';
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
}

/**
 * Formats a message template with player name, check type, and violation details.
 * @param {string | undefined} template - The message template with placeholders like {playerName}, {checkType}, {detailsString}, and any keys from violationDetails.
 * @param {string} playerName - The name of the player involved.
 * @param {string} checkType - The type of check that was triggered (camelCase).
 * @param {object | undefined} violationDetails - An object containing details of the violation.
 * @returns {string} The formatted message.
 */
function formatActionMessage(template, playerName, checkType, violationDetails) {
    if (!template) {
        return '';
    }
    let message = template;
    // Ensure global replacement for all placeholders
    message = message.replace(/{playerName}/g, playerName);
    message = message.replace(/{checkType}/g, checkType);
    message = message.replace(/{detailsString}/g, formatViolationDetails(violationDetails));

    if (violationDetails && typeof violationDetails === 'object') {
        for (const key in violationDetails) {
            if (Object.prototype.hasOwnProperty.call(violationDetails, key)) {
                // Escape key for regex, then create global regex
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const placeholderRegex = new RegExp(`{${escapedKey}}`, 'g');
                message = message.replace(placeholderRegex, String(violationDetails[key]));
            }
        }
    }
    return message;
}

/**
 * Executes configured actions for a detected cheat/violation based on predefined profiles.
 * Handles cases where `player` might be null (e.g., system-level checks).
 * Assumes `checkType` is provided in correct camelCase format (e.g., 'playerAntiGmc', 'movementFlyHover').
 * @param {import('@minecraft/server').Player | null} player - The player involved, or null if not player-specific.
 * @param {string} checkType - The identifier for the check type (camelCase). This should match keys in `checkActionProfiles`.
 * @param {object | undefined} [violationDetails] - An object containing specific details about the violation.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { playerDataManager, playerUtils, logManager, checkActionProfiles } = dependencies;
    const playerNameForLog = player?.nameTag ?? 'System'; // Use optional chaining and nullish coalescing

    if (!checkActionProfiles) { // checkActionProfiles comes from dependencies
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] checkActionProfiles not found in dependencies. Cannot process action for ${checkType}. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    const profile = checkActionProfiles?.[checkType]; // Added ?. for safety, though checkActionProfiles is checked above.
    if (!profile) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] No action profile found for checkType: '${checkType}'. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    if (!profile.enabled) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Actions for checkType '${checkType}' are disabled. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    const baseReasonTemplate = profile.flag?.reason || `Triggered ${checkType}`;
    const flagReasonMessage = formatActionMessage(
        baseReasonTemplate,
        playerNameForLog,
        checkType,
        violationDetails
    );

    if (player && profile.flag) {
        const flagType = profile.flag.type || checkType; // Default to checkType if specific flag type isn't set
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;
        const flagDetailsForAdminNotify = formatViolationDetails(violationDetails); // Already a string or 'N/A'

        for (let i = 0; i < increment; i++) {
            // Ensure playerDataManager and addFlag are available
            await playerDataManager?.addFlag(player, flagType, flagReasonMessage, flagDetailsForAdminNotify, dependencies);
        }
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Flagged ${playerNameForLog} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player?.nameTag, dependencies);
    } else if (!player && profile.flag) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Skipping flagging for checkType '${checkType}' (player is null).`, null, dependencies);
    }

    if (profile.log) {
        // Default logActionType to camelCase `detected<CheckType>` if not specified.
        // The original `detected${checkType.charAt(0).toUpperCase() + checkType.slice(1)}` creates PascalCase.
        // Adhering to camelCase for actionType literals as per guidelines.
        const defaultLogActionType = `detected${checkType.charAt(0).toUpperCase() + checkType.slice(1)}`;
        const logActionType = profile.log.actionType || defaultLogActionType.charAt(0).toLowerCase() + defaultLogActionType.slice(1);

        let logDetailsString = profile.log.detailsPrefix || '';
        if (profile.log.includeViolationDetails !== false) { // Explicitly check for false
            logDetailsString += formatViolationDetails(violationDetails);
        }
        logManager?.addLog({
            adminName: 'System', // Or derive if applicable
            actionType: logActionType, // Ensure this is camelCase
            targetName: playerNameForLog,
            details: logDetailsString.trim(),
            reason: flagReasonMessage, // Use the formatted reason
        }, dependencies);
    }

    if (profile.notifyAdmins?.message) {
        const notifyMsg = formatActionMessage(
            profile.notifyAdmins.message,
            playerNameForLog,
            checkType,
            violationDetails
        );
        const pData = player ? playerDataManager?.getPlayerData(player.id) : null;
        // Configurable notification
        if (dependencies.config.notifications?.notifyOnPlayerFlagged !== false) { // Default to true if undefined
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
        }
    }

    // Store last violation item details if applicable
    if (player && violationDetails?.itemTypeId) {
        const pData = playerDataManager?.getPlayerData(player.id);
        if (pData) {
            pData.lastViolationDetailsMap ??= {}; // Ensure map exists
            pData.lastViolationDetailsMap[checkType] = {
                itemTypeId: violationDetails.itemTypeId,
                timestamp: Date.now(), // Record when this violation detail was stored
            };
            pData.isDirtyForSave = true; // Mark for saving
            playerUtils?.debugLog(`[ActionManager.executeCheckAction] Stored itemTypeId '${violationDetails.itemTypeId}' for check '${checkType}' for ${playerNameForLog}.`, player?.nameTag, dependencies);
        } else {
            playerUtils?.debugLog(`[ActionManager.executeCheckAction] Could not store itemTypeId for '${checkType}' (pData not found for ${playerNameForLog}).`, player?.nameTag, dependencies);
        }
    } else if (!player && violationDetails?.itemTypeId) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Skipping itemTypeId storage for '${checkType}' (player is null).`, null, dependencies);
    }
}
