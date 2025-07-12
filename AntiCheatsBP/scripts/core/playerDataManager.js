<<<<<<< SEARCH
function _addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils, getString } = dependencies;
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

    let logMsg = `[PlayerDataManager._addPlayerStateRestriction] Player ${playerName} ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'. Duration: ${durationMs === Infinity ? 'Permanent' : new Date(expiryTime).toISOString()}`;
    playerUtils?.debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}
=======
function _addPlayerStateRestriction(player, pData, stateType, durationMs, reason, restrictedBy, isAutoMod, triggeringCheckType, dependencies) {
    const { playerUtils } = dependencies;
    const { debugLog, getString } = playerUtils;
    const playerName = pData.playerNameTag;

    const expiryTime = (durationMs === Infinity) ? Infinity : Date.now() + durationMs;
    const actualReason = reason || getString(`playerData.${stateType}.defaultReason`);

    const restrictionInfo = {
        reason: actualReason,
        [stateType === 'ban' ? 'bannedBy' : 'mutedBy']: restrictedBy,
        isAutoMod: isAutoMod,
        triggeringCheckType: triggeringCheckType,
        [stateType === 'ban' ? 'unbanTime' : 'unmuteTime']: expiryTime,
    };

    if (stateType === 'ban') {
        restrictionInfo.xuid = player.id;
        restrictionInfo.playerName = playerName;
        restrictionInfo.banTime = Date.now();
    }

    pData[stateType === 'ban' ? 'banInfo' : 'muteInfo'] = restrictionInfo;
    pData.isDirtyForSave = true;

    let logMsg = `[PlayerDataManager._addPlayerStateRestriction] Player ${playerName} ${stateType}d by ${restrictedBy}. Reason: '${actualReason}'. Duration: ${durationMs === Infinity ? 'Permanent' : new Date(expiryTime).toISOString()}`;
    debugLog(logMsg, pData.isWatched ? playerName : null, dependencies);
    return true;
}
>>>>>>> REPLACE
