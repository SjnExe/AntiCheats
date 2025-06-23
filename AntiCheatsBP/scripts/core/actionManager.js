/**
 * Manages the execution of actions (flagging, logging, notifying) based on cheat detection profiles.
 * This module is responsible for interpreting check results and applying configured consequences.
 */

function formatViolationDetails(violationDetails) {
    if (!violationDetails || typeof violationDetails !== 'object' || Object.keys(violationDetails).length === 0) {
        return "N/A";
    }
    return Object.entries(violationDetails)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');
}

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
 * Handles cases where `player` might be null (e.g., system-level checks).
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { config, playerDataManager, playerUtils, logManager } = dependencies;
    const playerNameForLog = player ? player.nameTag : "System";

    if (!config.checkActionProfiles) {
        playerUtils.debugLog(`[ActionManager] checkActionProfiles not found in config. Cannot process action for ${checkType}. Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    const profile = config.checkActionProfiles[checkType];
    if (!profile) {
        playerUtils.debugLog(`[ActionManager] No action profile found for checkType: "${checkType}". Context: ${playerNameForLog}`, null, dependencies);
        return;
    }

    if (!profile.enabled) {
        playerUtils.debugLog(`[ActionManager] Actions for checkType "${checkType}" are disabled in its profile. Context: ${playerNameForLog}`, null, dependencies);
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
        const flagType = profile.flag.type || checkType;
        const increment = typeof profile.flag.increment === 'number' ? profile.flag.increment : 1;
        const flagDetailsForAdminNotify = formatViolationDetails(violationDetails);

        for (let i = 0; i < increment; i++) {
            await playerDataManager.addFlag(player, flagType, flagReasonMessage, flagDetailsForAdminNotify, dependencies);
        }
        playerUtils.debugLog(`[ActionManager] Flagged ${playerNameForLog} for ${flagType} (x${increment}). Reason: "${flagReasonMessage}"`, player ? player.nameTag : null, dependencies);
    } else if (!player && profile.flag) {
        playerUtils.debugLog(`[ActionManager] Skipping flagging for checkType "${checkType}" because player is null. Profile had flagging enabled.`, null, dependencies);
    }

    if (profile.log) {
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
        }, dependencies);
    }

    if (profile.notifyAdmins?.message) {
        const notifyMsg = formatActionMessage(
            profile.notifyAdmins.message,
            playerNameForLog,
            checkType,
            violationDetails
        );
        const pData = player ? playerDataManager.getPlayerData(player.id) : null;
        playerUtils.notifyAdmins(notifyMsg, dependencies, player, pData); // Adjusted order for notifyAdmins
    }

    if (player && violationDetails?.itemTypeId) {
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData) {
            if (!pData.lastViolationDetailsMap) {
                pData.lastViolationDetailsMap = {};
            }
            pData.lastViolationDetailsMap[checkType] = {
                itemTypeId: violationDetails.itemTypeId,
                timestamp: Date.now()
            };
            pData.isDirtyForSave = true;
            playerUtils.debugLog(`[ActionManager] Stored itemTypeId '${violationDetails.itemTypeId}' for check '${checkType}' in pData.lastViolationDetailsMap for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        } else {
            playerUtils.debugLog(`[ActionManager] Could not store itemTypeId for check '${checkType}' because pData could not be retrieved for ${playerNameForLog}.`, player ? player.nameTag : null, dependencies);
        }
    } else if (!player && violationDetails?.itemTypeId) {
        playerUtils.debugLog(`[ActionManager] Skipping storage of itemTypeId for check '${checkType}' because player is null.`, null, dependencies);
    }
}
