/**
 * Manages TPA (teleport request) operations, including creating, tracking, and processing requests.
 */
import { world } from '@minecraft/server'; // system removed as it's not used

const activeRequests = new Map();
const lastPlayerRequestTimestamp = new Map();
const playerTpaStatuses = new Map();

function generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function addRequest(requester, target, type, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const now = Date.now();

    if (lastPlayerRequestTimestamp.has(requester.name)) {
        const elapsedTime = now - lastPlayerRequestTimestamp.get(requester.name);
        if (elapsedTime < config.tpaRequestCooldownSeconds * 1000) { // Use camelCase config key
            const remainingSeconds = Math.ceil((config.tpaRequestCooldownSeconds * 1000 - elapsedTime) / 1000); // Use camelCase config key
            playerUtils.debugLog(`[TpaManager] Cooldown active for ${requester.name}. Remaining: ${remainingSeconds}s`, requester.name, dependencies);
            return { error: 'cooldown', remaining: remainingSeconds };
        }
    }

    const requestId = generateRequestId();
    const request = {
        requestId,
        requesterName: requester.name,
        requesterLocation: requester.location,
        requesterDimensionId: requester.dimension.id,
        targetName: target.name,
        targetLocation: target.location,
        targetDimensionId: target.dimension.id,
        requestType: type,
        status: 'pending_acceptance',
        creationTimestamp: now,
        expiryTimestamp: now + (config.tpaRequestTimeoutSeconds * 1000), // Use camelCase config key
        warmupExpiryTimestamp: 0,
    };
    activeRequests.set(requestId, request);
    lastPlayerRequestTimestamp.set(requester.name, now);
    playerUtils.debugLog(`[TpaManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`, requester.name, dependencies);
    logManager.addLog({actionType: 'tpaRequestSent', targetName: target.nameTag, adminName: requester.nameTag, details: `Type: ${type}, ID: ${requestId}`}, dependencies); // Use camelCase actionType
    return request;
}

export function findRequest(playerAname, playerBname) {
    for (const request of activeRequests.values()) {
        const isRequesterA = request.requesterName === playerAname;
        const isTargetA = request.targetName === playerAname;
        const isRequesterB = playerBname ? request.requesterName === playerBname : false;
        const isTargetB = playerBname ? request.targetName === playerBname : false;

        if (playerBname) {
            if ((isRequesterA && isTargetB) || (isRequesterB && isTargetA)) return request;
        } else {
            if (isRequesterA || isTargetA) return request;
        }
    }
    return undefined;
}

export function findRequestsForPlayer(playerName) {
    const results = [];
    for (const request of activeRequests.values()) {
        if (request.requesterName === playerName || request.targetName === playerName) {
            results.push(request);
        }
    }
    return results;
}

export function removeRequest(requestId, dependencies) {
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        dependencies.playerUtils.debugLog(`[TpaManager] Removed request ${requestId}`, null, dependencies);
        return true;
    }
    return false;
}

export function acceptRequest(requestId, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) {
        playerUtils.debugLog(`[TpaManager] Attempted to accept non-existent request ${requestId}`, null, dependencies);
        return false;
    }
    if (request.status !== 'pending_acceptance') {
        playerUtils.debugLog(`[TpaManager] Attempted to accept request ${requestId} not in 'pending_acceptance' (current: ${request.status})`, null, dependencies);
        return false;
    }
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : (!targetPlayer ? request.targetName : 'Unknown');
        const onlinePlayer = requesterPlayer || targetPlayer;
        if (onlinePlayer) onlinePlayer.sendMessage(getString('tpa.manager.error.targetOfflineOnAccept', { offlinePlayerName }));
        playerUtils.debugLog(`[TpaManager] Player ${offlinePlayerName} (or target) not found for accepted request ${requestId}. Cancelling.`, offlinePlayerName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies);
        return false;
    }
    request.status = 'pending_teleport_warmup';
    request.warmupExpiryTimestamp = Date.now() + (config.tpaTeleportWarmupSeconds * 1000); // Use camelCase config key
    activeRequests.set(requestId, request);
    const warmupMsgString = getString('tpa.manager.warmupMessage', { warmupSeconds: config.tpaTeleportWarmupSeconds }); // Use camelCase config key

    if (request.requestType === 'tpa') {
        requesterPlayer.sendMessage(getString('tpa.manager.requester.accepted', { targetPlayerName: targetPlayer.nameTag, warmupMessage: warmupMsgString }));
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedFromRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupSeconds: config.tpaTeleportWarmupSeconds })); // Use camelCase config key
    } else {
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedByRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupMessage: warmupMsgString }));
        requesterPlayer.sendMessage(getString('tpa.manager.requester.acceptedHere', { targetPlayerName: targetPlayer.nameTag, warmupSeconds: config.tpaTeleportWarmupSeconds })); // Use camelCase config key
    }
    logManager.addLog({actionType: 'tpaRequestAccepted', targetName: targetPlayer.nameTag, adminName: requesterPlayer.nameTag, details: `Type: ${request.requestType}, ID: ${requestId}`}, dependencies); // Use camelCase actionType
    playerUtils.debugLog(`[TpaManager] Request ${requestId} accepted, warm-up initiated. Expires at ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`, request.targetName, dependencies);
    return true;
}

export function executeTeleport(requestId, dependencies) {
    const { playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) return;
    if (request.status !== 'pending_teleport_warmup') {
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} not in 'pending_teleport_warmup' (current: ${request.status}). Aborting.`, request.requesterName, dependencies);
        if (request.status === 'completed' || request.status === 'cancelled') removeRequest(requestId, dependencies);
        return;
    }
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : (!targetPlayer ? request.targetName : 'Unknown');
        const onlinePlayer = requesterPlayer || targetPlayer;
        const message = getString('tpa.manager.error.teleportTargetOffline', { offlinePlayerName });
        if (onlinePlayer) onlinePlayer.sendMessage(message);
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Player ${offlinePlayerName} (or target) not found for request ${requestId}. ${message}`, offlinePlayerName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies);
        return;
    }
    try {
        let teleportSuccessful = false;
        if (request.requestType === 'tpa') {
            const targetDimension = world.getDimension(request.targetDimensionId);
            if (!targetDimension) throw new Error(`Invalid target dimension ID: ${request.targetDimensionId}`);
            requesterPlayer.teleport(request.targetLocation, { dimension: targetDimension });
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successToTarget', { targetPlayerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successTargetNotified', { requesterPlayerName: requesterPlayer.nameTag }));
            teleportSuccessful = true;
        } else if (request.requestType === 'tpahere') {
            const requesterDimension = world.getDimension(request.requesterDimensionId);
            if (!requesterDimension) throw new Error(`Invalid requester dimension ID: ${request.requesterDimensionId}`);
            targetPlayer.teleport(request.requesterLocation, { dimension: requesterDimension });
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successToRequester', { requesterPlayerName: requesterPlayer.nameTag }));
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successRequesterNotified', { targetPlayerName: targetPlayer.nameTag }));
            teleportSuccessful = true;
        } else {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Unknown request type: ${request.requestType} for request ${requestId}`, request.requesterName, dependencies);
        }
        if (teleportSuccessful) request.status = 'completed';
        else request.status = 'cancelled';
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} processed. Status: ${request.status}. Type: ${request.requestType}`, request.requesterName, dependencies);
    } catch (e) {
        request.status = 'cancelled';
        console.error(`[TpaManager] ExecuteTeleport: Error during teleport for request ${requestId}: ${e.stack || e}`);
        try {
            if (requesterPlayer?.isValid()) requesterPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToRequester'));
            if (targetPlayer?.isValid()) targetPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToTarget', { otherPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
        } catch (notifyError) {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Failed to notify players after teleport error: ${notifyError.stack || notifyError}`, request.requesterName, dependencies);
        }
    } finally {
        removeRequest(requestId, dependencies);
        logManager.addLog({actionType: 'tpaTeleportFinalized', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Status: ${request.status}, Type: ${request.requestType}, ID: ${requestId}`}, dependencies); // Use camelCase actionType
    }
}

export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request || request.status === 'cancelled' || request.status === 'completed') return;
    request.status = 'cancelled';
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
    if (requesterPlayer?.isValid()) requesterPlayer.sendMessage(reasonMessagePlayer);
    if (targetPlayer?.isValid()) targetPlayer.sendMessage(reasonMessagePlayer);
    playerUtils.debugLog(`[TpaManager] Teleport for request ${requestId} cancelled: ${reasonMessageLog}`, request.requesterName, dependencies);
    logManager.addLog({actionType: 'tpaTeleportCancelled', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Reason: ${reasonMessageLog}, ID: ${requestId}`}, dependencies); // Use camelCase actionType
    removeRequest(requestId, dependencies);
}

export function declineRequest(requestId, dependencies) {
    const { playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) return;
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
    const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
    const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;

    if (request.status === 'pending_acceptance') {
        if (requesterPlayer?.isValid()) requesterPlayer.sendMessage(getString('tpa.manager.decline.requesterNotified', { targetPlayerName: targetDisplayName }));
        if (targetPlayer?.isValid()) targetPlayer.sendMessage(getString('tpa.manager.decline.targetNotified', { requesterPlayerName: requesterDisplayName }));
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} declined.`, request.targetName, dependencies);
    } else {
        if (requesterPlayer?.isValid()) requesterPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledRequester', { targetPlayerName: targetDisplayName }));
        if (targetPlayer?.isValid()) targetPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledTarget', { requesterPlayerName: requesterDisplayName }));
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} cancelled (was in state: ${request.status}).`, request.requesterName, dependencies);
    }
    request.status = 'cancelled';
    logManager.addLog({actionType: 'tpaRequestDeclined', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}, Status: ${request.status}`}, dependencies); // Use camelCase actionType
    removeRequest(requestId, dependencies);
}

export function clearExpiredRequests(dependencies) {
    const { playerUtils, getString, logManager } = dependencies;
    const now = Date.now();
    const requestIdsToExpire = [];
    for (const request of activeRequests.values()) {
        if (request.status === 'pending_acceptance' && now >= request.expiryTimestamp) {
            requestIdsToExpire.push(request.requestId);
        }
    }
    for (const requestId of requestIdsToExpire) {
        const request = activeRequests.get(requestId);
        if (!request || request.status !== 'pending_acceptance') continue;
        request.status = 'cancelled';
        playerUtils.debugLog(`[TpaManager] Request ${request.requestId} between ${request.requesterName} and ${request.targetName} expired while pending acceptance.`, request.requesterName, dependencies);
        const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
        const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
        const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
        const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;
        if (requesterPlayer?.isValid()) requesterPlayer.sendMessage(getString('tpa.manager.expired.requesterNotified', { targetName: targetDisplayName }));
        if (targetPlayer?.isValid()) targetPlayer.sendMessage(getString('tpa.manager.expired.targetNotified', { requesterName: requesterDisplayName }));
        logManager.addLog({actionType: 'tpaRequestExpired', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}`}, dependencies); // Use camelCase actionType
        removeRequest(request.requestId, dependencies);
    }
}

export function getPlayerTpaStatus(playerName, dependencies) {
    const { playerUtils } = dependencies; // playerUtils is not used here, but kept for signature consistency if it were
    if (!playerTpaStatuses.has(playerName)) {
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 };
    }
    return playerTpaStatuses.get(playerName);
}

export function setPlayerTpaStatus(playerName, accepts, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const status = { playerName, acceptsTpaRequests: accepts, lastTpaToggleTimestamp: Date.now() };
    playerTpaStatuses.set(playerName, status);
    playerUtils.debugLog(`[TpaManager] Player ${playerName} TPA status set to: ${accepts}`, playerName, dependencies);
    logManager.addLog({actionType: 'tpaStatusSet', targetName: playerName, details: `Accepts TPA: ${accepts}`}, dependencies); // Use camelCase actionType
}

export function getRequestsInWarmup() {
    const warmupRequests = [];
    for (const request of activeRequests.values()) {
        if (request.status === 'pending_teleport_warmup') {
            warmupRequests.push(request);
        }
    }
    return warmupRequests;
}
