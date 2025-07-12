/**
 * @file playerDataManager.js
 * @description Manages player data and state restrictions.
 */

/**
 * Adds a state restriction (ban or mute) to a player's data.
 * @param {import('@minecraft/server').Player} player The player object.
 * @param {object} pData The player's data object.
 * @param {string} stateType The type of restriction ('ban' or 'mute').
 * @param {number} durationMs The duration of the restriction in milliseconds.
 * @param {string} reason The reason for the restriction.
 * @param {string} restrictedBy The entity that applied the restriction.
 * @param {boolean} isAutoMod Whether the restriction was applied by automod.
 * @param {string} triggeringCheckType The check that triggered the restriction.
 * @param {object} dependencies The dependencies object.
 * @returns {boolean} Whether the restriction was successfully added.
 */
function _addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog, getString } = playerUtils;
    const playerName = pData.playerNameTag;

    const expiryTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const actualReason = reason || getString(`playerData.${stateType}.defaultReason`);

    const restrictionInfo = {
        reason: actualReason,
        [stateType === 'ban' ? 'bannedBy' : 'mutedBy']: restrictedBy,
        isAutoMod,
        triggeringCheckType,
        [stateType === 'ban' ? 'unbanTime' : 'unmuteTime']: expiryTime,
    };

    if (stateType === 'ban') {
        restrictionInfo.xuid = player.id;
        restrictionInfo.playerName = playerName;
        restrictionInfo.banTime = Date.now();
    }

    pData[stateType === 'ban' ? 'banInfo' : 'muteInfo'] = restrictionInfo;
    pData.isDirtyForSave = true;

    const logMsg = `[PlayerDataManager._addPlayerStateRestriction] Player ${playerName} ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'. Duration: ${durationMs === Infinity ? 'Permanent' : new Date(expiryTime).toISOString()}`;
    debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}
