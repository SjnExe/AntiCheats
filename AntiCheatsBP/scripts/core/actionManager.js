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
    let message = template;
    message = message.replace(/{playerName}/g, playerName);
    message = message.replace(/{checkType}/g, checkType);
    message = message.replace(/{detailsString}/g, formatViolationDetails(violationDetails));
    if (violationDetails && typeof violationDetails === 'object') {
        for (const key in violationDetails) {
            if (Object.prototype.hasOwnProperty.call(violationDetails, key)) {
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const placeholderRegex = new RegExp(`{${escapedKey}}`, 'g');
                let valueStr = String(violationDetails[key]);
                if (typeof violationDetails[key] === 'number' && !Number.isInteger(violationDetails[key])) {
                    valueStr = violationDetails[key].toFixed(DECIMAL_PLACES_FOR_VIOLATION_DETAILS);
                }
                message = message.replace(placeholderRegex, valueStr);
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
 * @param {import('../types.js').ViolationDetails | undefined} [violationDetails] - An object containing specific details about the violation.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies object.
 * @returns {Promise<void>}
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { playerDataManager, playerUtils, logManager, checkActionProfiles, config } = dependencies;
    const playerNameForLog = player?.nameTag ?? 'System';
    if (!checkActionProfiles) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction CRITICAL] checkActionProfiles not found in dependencies. Cannot process action for ${checkType}. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }
    const profile = checkActionProfiles[checkType];
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
        violationDetails,
    );
    if (player && profile.flag) {
        const flagType = profile.flag.type || checkType;
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;
        for (let i = 0; i < increment; i++) {
            await playerDataManager?.addFlag(player, flagType, flagReasonMessage, dependencies, violationDetails);
        }
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Flagged ${playerNameForLog} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player?.nameTag, dependencies);
    } else if (!player && profile.flag) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Skipping flagging for checkType '${checkType}' (player is null).`, null, dependencies);
    }
    if (profile.log) {
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
    if (profile.notifyAdmins?.message) {
        const notifyMsg = formatActionMessage(
            profile.notifyAdmins.message,
            playerNameForLog,
            checkType,
            violationDetails,
        );
        const pDataAfterAwait = player && player.isValid() ? playerDataManager?.getPlayerData(player.id) : null;
        if (config.notifyOnPlayerFlagged !== false) {
            playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pDataAfterAwait);
        }
    }
    if (player && player.isValid() && violationDetails && Object.keys(violationDetails).length > 0) {
        const currentPData = playerDataManager?.getPlayerData(player.id);
        if (currentPData) {
            currentPData.lastViolationDetailsMap ??= {};
            const detailsToStore = {
                timestamp: Date.now(),
                details: formatViolationDetails(violationDetails),
            };
            if (violationDetails.itemTypeId) {
                detailsToStore.itemTypeId = violationDetails.itemTypeId;
            }
            if (typeof violationDetails.quantityFound === 'number') {
                detailsToStore.quantityFound = violationDetails.quantityFound;
            }
            currentPData.lastViolationDetailsMap[checkType] = detailsToStore;
            currentPData.isDirtyForSave = true;
            playerUtils?.debugLog(`[ActionManager.executeCheckAction] Stored violation details for check '${checkType}' for ${playerNameForLog}: ${JSON.stringify(detailsToStore)}`, player?.nameTag, dependencies);
        } else {
            playerUtils?.debugLog(`[ActionManager.executeCheckAction] Could not store violation details for '${checkType}' (pData not found for ${playerNameForLog} after await).`, player?.nameTag, dependencies);
        }
    } else if (player && !player.isValid() && violationDetails && Object.keys(violationDetails).length > 0) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Player ${playerNameForLog} became invalid. Skipping details map update.`, null, dependencies);
    } else if (!player && violationDetails && Object.keys(violationDetails).length > 0) {
        playerUtils?.debugLog(`[ActionManager.executeCheckAction] Skipping violation details storage for '${checkType}' (player is null).`, null, dependencies);
    }
}
