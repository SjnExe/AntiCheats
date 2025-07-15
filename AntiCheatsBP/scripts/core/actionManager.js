/**
 * @file Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 * @module AntiCheatsBP/scripts/core/actionManager
 * This module is responsible for interpreting check results and applying configured consequences.
 */
const DECIMAL_PLACES_FOR_VIOLATION_DETAILS = 3;
/**
 * Formats violation details into a readable string.
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
 * Formats a message template with player name, check type, and violation details.
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
        ...violationDetails
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
 * Executes configured actions for a detected cheat/violation based on predefined profiles.
 * Handles cases where `player` might be null (e.g., system-level checks).
 * Assumes `checkType` is provided in correct camelCase format (e.g., 'playerAntiGmc', 'movementFlyHover').
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
    for (let i = 0; i < increment; i++) {
        await dependencies.playerDataManager?.addFlag(player, flagType, flagReasonMessage, dependencies, violationDetails);
    }
    dependencies.playerUtils?.debugLog(`[ActionManager] Flagged ${player.nameTag} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player.nameTag, dependencies);
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
    if (!profile.notifyAdmins?.message || dependencies.config.notifyOnPlayerFlagged === false) return;

    const { playerUtils, playerDataManager } = dependencies;
    const playerNameForLog = player?.nameTag ?? 'System';
    const notifyMsg = formatActionMessage(profile.notifyAdmins.message, playerNameForLog, checkType, violationDetails);
    const pDataAfterAwait = player?.isValid() ? playerDataManager?.getPlayerData(player.id) : null;
    playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pDataAfterAwait);
}

function _handleViolationDetailsStorage(player, checkType, violationDetails, dependencies) {
    if (!player || !violationDetails || Object.keys(violationDetails).length === 0) {
        if (!player && violationDetails && Object.keys(violationDetails).length > 0) {
            dependencies.playerUtils?.debugLog(`[ActionManager] Skipping violation details storage for '${checkType}' (player is null).`, null, dependencies);
        }
        return;
    }

    if (!player.isValid()) {
        dependencies.playerUtils?.debugLog(`[ActionManager] Player ${player.nameTag} became invalid. Skipping details map update.`, null, dependencies);
        return;
    }

    const { playerDataManager, playerUtils } = dependencies;
    const currentPData = playerDataManager?.getPlayerData(player.id);
    if (currentPData) {
        currentPData.lastViolationDetailsMap ??= {};
        const detailsToStore = {
            timestamp: Date.now(),
            details: formatViolationDetails(violationDetails),
            ...(violationDetails.itemTypeId && { itemTypeId: violationDetails.itemTypeId }),
            ...(typeof violationDetails.quantityFound === 'number' && { quantityFound: violationDetails.quantityFound }),
        };
        currentPData.lastViolationDetailsMap[checkType] = detailsToStore;
        currentPData.isDirtyForSave = true;
        playerUtils?.debugLog(`[ActionManager] Stored violation details for check '${checkType}' for ${player.nameTag}: ${JSON.stringify(detailsToStore)}`, player.nameTag, dependencies);
    } else {
        playerUtils?.debugLog(`[ActionManager] Could not store violation details for '${checkType}' (pData not found for ${player.nameTag} after await).`, player.nameTag, dependencies);
    }
}

export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { playerUtils, checkActionProfiles } = dependencies;
    const playerNameForLog = player?.nameTag ?? 'System';

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
