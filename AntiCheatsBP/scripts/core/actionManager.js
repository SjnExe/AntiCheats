const decimalPlacesForViolationDetails = 3;
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
                return `${key}: ${value.toFixed(decimalPlacesForViolationDetails)}`;
            }
            return `${key}: ${String(value)}`;
        })
        .join(', ');
}

/**
 * @param {string | undefined} template
 * @param {string} playerName
 * @param {string} checkType
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails
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

    /** @param {any} text */
    const performReplacement = (text) => {
        if (typeof text !== 'string') return text;
        return text.replace(/{(\w+)}/g, (placeholder, placeholderKey) => {
            const replacementValue = replacements[placeholderKey];
            if (replacementValue !== undefined) {
                if (typeof replacementValue === 'number' && !Number.isInteger(replacementValue)) {
                    return replacementValue.toFixed(decimalPlacesForViolationDetails);
                }
                return String(replacementValue);
            }
            return placeholder;
        });
    };

    /** @param {any} data */
    const deepFormat = (data) => {
        if (typeof data === 'string') {
            return performReplacement(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => deepFormat(item));
        }
        if (typeof data === 'object' && data !== null) {
            const newObj = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    newObj[key] = deepFormat(data[key]);
                }
            }
            return newObj;
        }
        return data;
    };

    return deepFormat(template);
}

/**
 * @param {import('@minecraft/server').Player | null} player
 * @param {import('../types.js').ActionProfileEntry} profile
 * @param {string} flagReasonMessage
 * @param {string} checkType
 * @param {import('../types.js').Dependencies} dependencies
 * @param {import('../types.js').ViolationDetails | undefined} [violationDetails]
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

    await dependencies.playerDataManager?.addFlag(player, flagType, dependencies, violationDetails, increment);

    dependencies.playerUtils?.debugLog(`[ActionManager] Dispatched flag action for ${player.name} for ${flagType} (x${increment}). Reason: '${flagReasonMessage}'`, player.name, dependencies);
}

/**
 * @param {import('@minecraft/server').Player | null} player
 * @param {import('../types.js').ActionProfileEntry} profile
 * @param {string} flagReasonMessage
 * @param {string} checkType
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails
 * @param {import('../types.js').Dependencies} dependencies
 */
function _handleLogging(player, profile, flagReasonMessage, checkType, violationDetails, dependencies) {
    if (!profile.log) return;

    const { logManager } = dependencies;
    const playerNameForLog = player?.name ?? 'System';
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

/**
 * @param {import('@minecraft/server').Player | null} player
 * @param {import('../types.js').ActionProfileEntry} profile
 * @param {string} checkType
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails
 * @param {import('../types.js').Dependencies} dependencies
 */
function _handleAdminNotifications(player, profile, checkType, violationDetails, dependencies) {
    if (!player || !profile.notifyAdmins?.message) {
        return;
    }
    if (!player.isValid()) {
        return;
    }

    const { playerUtils, playerDataManager } = dependencies;
    const notifyMsg = formatActionMessage(profile.notifyAdmins.message, player.name, checkType, violationDetails);
    const pData = playerDataManager?.getPlayerData(player.id);

    playerUtils?.notifyAdmins(notifyMsg, dependencies, player, pData);
}

/**
 * @param {import('@minecraft/server').Player | null} player
 * @param {string} checkType
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails
 * @param {import('../types.js').Dependencies} dependencies
 */
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
        currentPData.lastViolationDetailsMap ??= {};
        const detailsToStore = {
            timestamp: Date.now(),
            details: formatViolationDetails(violationDetails),
            ...(violationDetails.itemTypeId && { itemTypeId: violationDetails.itemTypeId }),
            ...(typeof violationDetails.quantityFound === 'number' && { quantityFound: violationDetails.quantityFound }),
        };
        currentPData.lastViolationDetailsMap[checkType] = detailsToStore;
        currentPData.isDirtyForSave = true;
        playerUtils?.debugLog(`[ActionManager] Stored violation details for check '${checkType}' for ${currentPData.playerNameTag}: ${JSON.stringify(detailsToStore)}`, currentPData.playerNameTag, dependencies);
    } else {
        playerUtils?.debugLog(`[ActionManager] Could not store violation details for '${checkType}' (pData not found for player).`, null, dependencies);
    }
}

/**
 * @param {import('@minecraft/server').Player | null} player
 * @param {string} checkType
 * @param {import('../types.js').ViolationDetails | undefined} violationDetails
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function executeCheckAction(player, checkType, violationDetails, dependencies) {
    const { playerUtils, checkActionProfiles } = dependencies;
    const playerNameForLog = player?.name ?? 'System';

    /** @type {import('../types.js').ActionProfileEntry | undefined} */
    const profile = checkActionProfiles[checkType];
    if (!profile) {
        playerUtils?.debugLog(`[ActionManager] No action profile for checkType: '${checkType}'.`, null, dependencies);
        return;
    }

    const baseReasonTemplate = profile.flag?.reason || `Triggered ${checkType}`;
    const flagReasonMessage = formatActionMessage(baseReasonTemplate, playerNameForLog, checkType, violationDetails);

    await _handleFlagging(player, profile, flagReasonMessage, checkType, dependencies, violationDetails);

    // After any await, the player object might have become invalid. Check before proceeding.
    if (player && !player.isValid()) {
        playerUtils?.debugLog(`[ActionManager] Player ${playerNameForLog} became invalid after flagging. Aborting further actions for check '${checkType}'.`, null, dependencies);
        return;
    }

    _handleLogging(player, profile, flagReasonMessage, checkType, violationDetails, dependencies);
    _handleAdminNotifications(player, profile, checkType, violationDetails, dependencies);
    _handleViolationDetailsStorage(player, checkType, violationDetails, dependencies);

    // Deprecated Punishment System (2024-07-29): The punishment logic has been centralized in automodManager.
    // The old system of defining `punishment` and `minVlbeforePunishment` directly in the `config.js` `checks` object
    // is now obsolete. All automated actions should be configured in `automodConfig.js`.
    // This ensures a single, consistent, and tiered response system.
}
