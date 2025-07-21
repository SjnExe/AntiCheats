/**
 * @file Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 * @module AntiCheatsBP/scripts/core/actionManager
 * This module is responsible for interpreting check results and applying configured consequences.
 */
const DECIMAL_PLACES_FOR_VIOLATION_DETAILS = 3;
/**
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails - An object containing details of the violation.
 * @returns {string} A comma-separated string of key-value pairs, or 'N/A'.
 */
function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return 'N/A';
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => {
            if (typeof value === 'number' && !Number.isInteger(value)) {
                return `${key}: ${value.toFixed(DECIMAL_PLACES_FOR_VIOLATION_DETAILS)}`;
            }
            return `${key}: ${String(value)}`;
        })
        .join(', ');
}
/**
 * @param {string | undefined} template - The message template with placeholders like {playerName}, {checkType}, {detailsString}, and any keys from violationDetails.
 * @param {string} playerName - The name of the player involved.
 * @param {string} checkType - The type of check that was triggered (camelCase).
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails - An object containing details of the violation.
 * @returns {string} The formatted message.
 */
function formatActionMessage(template, playerName, checkType, violationDetails) {
    if (!template) {
        return '';
    }

    const detailsString = formatViolationDetails(violationDetails);

    const replacements = {
        playerName,
        checkType,
        detailsString,
        ...violationDetails,
    };

    return template.replace(/{(\w+)}/g, (placeholder, key) => {
        const value = replacements[key];
        if (value !== undefined) {
            if (typeof value === 'number' && !Number.isInteger(value)) {
                return value.toFixed(DECIMAL_PLACES_FOR_VIOLATION_DETAILS);
            }
            return String(value);
        }
        return placeholder;
    });
}
/**
 * @param {import('@minecraft/server').Player | null} player - The player involved, or null if not player-specific.
 * @param {string} checkType - The identifier for the check type (camelCase). This should match keys in `checkActionProfiles`.
 * @param {import('../types.js').ViolationDetails | undefined} [violationDetails] - An object containing specific details about the violation.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
async function _handleFlagging(player, profile, flagReasonMessage, checkType, dependencies, violationDetails) {
    if (!player || !profile.flag) {
        if (!player && profile.flag) {
            dependencies.playerUtils?.debugLog(`[ActionManager] Skipping flagging for checkType '${checkType}' (player is null).`, null, dependencies);
        }
        return;
    }

    const flagType = profile.flag.type || checkType;
    const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;

    // Call addFlag once with the total increment amount for efficiency and atomicity.
    await dependencies.playerDataManager?.addFlag(player, flagType, flagReasonMessage, dependencies, violationDetails, increment);

    // The debug log inside addFlag is now more detailed, so this one can be simplified or removed.
    // For now, we'll keep it to confirm the action was initiated from ActionManager.
    dependencies.playerUtils?.debugLog(`[ActionManager] Dispatched flag action for ${player.nameTag} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player.nameTag, dependencies);
}

function _handleLogging(player, profile, flagReasonMessage, checkType, violationDetails, dependencies) {
    if (!profile.log) return;

    const { logManager } = dependencies;
    const playerNameForLog = player?.nameTag ?? 'System';
    const logActionType = profile.log.actionType || `detected${checkType.charAt(0).toUpperCase() + checkType.slice(1)}`;
    let logDetailsString = profile.log.detailsPrefix || '';
    if (profile.log.includeViolationDetails !== false) {
        logDetailsString += formatViolationDetails(violationDetails);
    }

    logManager?.addLog({
        adminName: 'System',
        actionType: logActionType,
        targetName: playerNameForLog,
        targetId: player?.id,
        details: logDetailsString.trim() || 'N/A',
        reason: flagReasonMessage,
        checkType,
        location: player?.location,
        dimensionId: player?.dimension?.id,
    }, dependencies);
}

function _handleAdminNotifications(player, profile, checkType, violationDetails, dependencies) {
    // Exit early if there's no player or the profile doesn't have a notification message.
    if (!player || !profile.notifyAdmins?.message) {
        return;
    }
    // Also exit if the player object is no longer valid.
    if (!player.isValid()) {
        return;
    }

    const { playerUtils, playerDataManager } = dependencies;
    const notifyMsg = formatActionMessage(profile.notifyAdmins.message, player.nameTag, checkType, violationDetails);
    const pData = playerDataManager?.getPlayerData(player.id);

    // Re-validate player right before sending notification to be safe
    if (!player.isValid()) {
        return;
    }
    playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
}

function _handleViolationDetailsStorage(player, checkType, violationDetails, dependencies) {
    if (!player || !violationDetails || Object.keys(violationDetails).length === 0) {
        if (!player && violationDetails && Object.keys(violationDetails).length > 0) {
            dependencies.playerUtils?.debugLog(`[ActionManager] Skipping violation details storage for '${checkType}' (player is null).`, null, dependencies);
        }
        return;
    }

    if (!player.isValid()) {
        dependencies.playerUtils?.debugLog(`[ActionManager] Player became invalid before storing violation details. Skipping for check '${checkType}'.`, null, dependencies);
        return;
    }

    const { playerDataManager, playerUtils } = dependencies;
    const currentPData = playerDataManager?.getPlayerData(player.id);
    if (currentPData) {
        // Ensure player is still valid right before updating their data
        if (!player.isValid()) {
            playerUtils?.debugLog(`[ActionManager] Player ${currentPData.name} became invalid after getting pData. Skipping details map update.`, null, dependencies);
            return;
        }
        currentPData.lastViolationDetailsMap ??= {};
        const detailsToStore = {
            timestamp: Date.now(),
            details: formatViolationDetails(violationDetails),
            ...(violationDetails.itemTypeId && { itemTypeId: violationDetails.itemTypeId }),
            ...(typeof violationDetails.quantityFound === 'number' && { quantityFound: violationDetails.quantityFound }),
        };
        currentPData.lastViolationDetailsMap[checkType] = detailsToStore;
        currentPData.isDirtyForSave = true;
        playerUtils?.debugLog(`[ActionManager] Stored violation details for check '${checkType}' for ${player.name}: ${JSON.stringify(detailsToStore)}`, player.name, dependencies);
    } else {
        // This case might happen if the player leaves right as this is called.
        playerUtils?.debugLog(`[ActionManager] Could not store violation details for '${checkType}' (pData not found for player).`, null, dependencies);
    }
}

export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { playerUtils, checkActionProfiles } = dependencies;
    const playerNameForLog = player?.name ?? 'System';

    if (!checkActionProfiles) {
        playerUtils?.debugLog(`[ActionManager CRITICAL] checkActionProfiles not found. Cannot process action for ${checkType}.`, null, dependencies);
        return;
    }

    const profile = checkActionProfiles[checkType];
    if (!profile) {
        playerUtils?.debugLog(`[ActionManager] No action profile for checkType: '${checkType}'.`, null, dependencies);
        return;
    }

    if (!profile.enabled) {
        playerUtils?.debugLog(`[ActionManager] Actions for '${checkType}' are disabled.`, null, dependencies);
        return;
    }

    const baseReasonTemplate = profile.flag?.reason || `Triggered ${checkType}`;
    const flagReasonMessage = formatActionMessage(baseReasonTemplate, playerNameForLog, checkType, violationDetails);

    await _handleFlagging(player, profile, flagReasonMessage, checkType, dependencies, violationDetails);
    _handleLogging(player, profile, flagReasonMessage, checkType, violationDetails, dependencies);
    _handleAdminNotifications(player, profile, checkType, violationDetails, dependencies);
    _handleViolationDetailsStorage(player, checkType, violationDetails, dependencies);
}
