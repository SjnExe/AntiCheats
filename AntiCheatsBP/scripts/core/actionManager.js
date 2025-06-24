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
 * @param {string} checkType - The type of check that was triggered.
 * @param {object | undefined} violationDetails - An object containing details of the violation.
 * @returns {string} The formatted message.
 */
function formatActionMessage(template, playerName, checkType, violationDetails) {
    if (!template) {
        return '';
    }
    let message = template;
    message = message.replace(/{playerName}/g, playerName);
    message = message.replace(/{checkType}/g, checkType); // Ensure checkType (potentially with adjusted casing) is used.
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
 * Handles cases where `player` might be null (e.g., system-level checks).
 * @param {import('@minecraft/server').Player | null} player - The player involved, or null if not player-specific.
 * @param {string} checkType - The identifier for the check type (e.g., 'movementFlyHover', 'playerAntigmc'). This should match keys in `config.checkActionProfiles`.
 * @param {object | undefined} violationDetails - An object containing specific details about the violation.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { config, playerDataManager, playerUtils, logManager } = dependencies;
    const playerNameForLog = player ? player.nameTag : 'System'; // Consistent variable name

    if (!config.checkActionProfiles) {
        playerUtils.debugLog(`[ActionManager] checkActionProfiles not found in config. Cannot process action for ${checkType}. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    // Standardize checkType for map lookup (e.g. playerAntiGMC -> playerAntigmc)
    // This is based on the new guideline for checkType strings.
    const standardizedCheckType = checkType.replace(/GMC/g, 'Gmc').replace(/TPA/g, 'Tpa').replace(/TPS/g, 'Tps'); // Add more if needed

    const profile = config.checkActionProfiles[standardizedCheckType];
    if (!profile) {
        playerUtils.debugLog(`[ActionManager] No action profile found for checkType: '${standardizedCheckType}' (original: '${checkType}'). Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    if (!profile.enabled) {
        playerUtils.debugLog(`[ActionManager] Actions for checkType '${standardizedCheckType}' are disabled in its profile. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    const baseReasonTemplate = profile.flag?.reason || `Triggered ${standardizedCheckType}`;
    const flagReasonMessage = formatActionMessage(
        baseReasonTemplate,
        playerNameForLog,
        standardizedCheckType,
        violationDetails
    );

    if (player && profile.flag) {
        const flagType = profile.flag.type || standardizedCheckType;
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;
        const flagDetailsForAdminNotify = formatViolationDetails(violationDetails);

        for (let i = 0; i < increment; i++) {
            await playerDataManager.addFlag(player, flagType, flagReasonMessage, flagDetailsForAdminNotify, dependencies);
        }
        playerUtils.debugLog(`[ActionManager] Flagged ${playerNameForLog} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player ? player.nameTag : null, dependencies);
    } else if (!player && profile.flag) {
        playerUtils.debugLog(`[ActionManager] Skipping flagging for checkType '${standardizedCheckType}' because player is null. Profile had flagging enabled.`, null, dependencies);
    }

    if (profile.log) {
        const logActionType = profile.log.actionType || `detected_${standardizedCheckType}`;
        let logDetailsString = profile.log.detailsPrefix || '';
        if (profile.log.includeViolationDetails !== false) {
            logDetailsString += formatViolationDetails(violationDetails);
        }
        logManager.addLog({
            adminName: 'System', // Actions are system-triggered based on profiles
            actionType: logActionType,
            targetName: playerNameForLog,
            details: logDetailsString.trim(),
            reason: flagReasonMessage, // Use the formatted reason
        }, dependencies);
    }

    if (profile.notifyAdmins?.message) {
        const notifyMsg = formatActionMessage(
            profile.notifyAdmins.message,
            playerNameForLog,
            standardizedCheckType,
            violationDetails
        );
        const pData = player ? playerDataManager.getPlayerData(player.id) : null;
        playerUtils.notifyAdmins(notifyMsg, dependencies, player, pData);
    }

    // Store last violation item details if applicable
    if (player && violationDetails?.itemTypeId) {
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData) {
            if (!pData.lastViolationDetailsMap) {
                pData.lastViolationDetailsMap = {};
            }
            pData.lastViolationDetailsMap[standardizedCheckType] = { // Use standardizedCheckType
                itemTypeId: violationDetails.itemTypeId,
                timestamp: Date.now(),
            };
            pData.isDirtyForSave = true;
            playerUtils.debugLog(`[ActionManager] Stored itemTypeId '${violationDetails.itemTypeId}' for check '${standardizedCheckType}' in pData.lastViolationDetailsMap for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        } else {
            playerUtils.debugLog(`[ActionManager] Could not store itemTypeId for check '${standardizedCheckType}' because pData could not be retrieved for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        }
    } else if (!player && violationDetails?.itemTypeId) {
        playerUtils.debugLog(`[ActionManager] Skipping storage of itemTypeId for check '${standardizedCheckType}' because player is null.`, null, dependencies);
    }
}
