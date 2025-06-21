/**
 * @file Manages TPA (teleport request) operations, including creating, tracking, and processing requests.
 * @version 1.0.1
 */

// IMPORTANT NOTE ON PLAYER IDENTIFIERS:
// This module currently uses `player.name` (assumed to be the unique gamertag/username)
// as the primary identifier for players in maps and request objects (e.g., `requesterName`, `targetName`).
// In standard @minecraft/server, `player.id` is the persistent unique identifier, while `player.nameTag`
// is the display name that can change. If `player.name` is not guaranteed to be unique and persistent
// in the environment this script runs, it should be refactored to use `player.id` for all internal
// tracking and lookups, reserving `player.nameTag` for display purposes only.
// This change would affect `lastPlayerRequestTimestamp`, `playerTpaStatuses`, and parts of `activeRequests`.

import { world } from '@minecraft/server';
// configModule, getString, debugLog will be replaced by dependencies.

/**
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('../types.js').PlayerTpaStatus} PlayerTpaStatus
 * @typedef {import('@minecraft/server').Player} Player
 * @typedef {import('@minecraft/server').Vector3} Vector3
 * @typedef {import('@minecraft/server').Dimension} Dimension
 */

const activeRequests = new Map();
const lastPlayerRequestTimestamp = new Map();
const playerTpaStatuses = new Map();

/**
 * Generates a new unique ID for a TPA request.
 * @returns {string} A UUID string.
 */
function generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function addRequest(requester, target, type, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const now = Date.now();

    if (lastPlayerRequestTimestamp.has(requester.name)) {
        const elapsedTime = now - lastPlayerRequestTimestamp.get(requester.name);
        if (elapsedTime < config.TPARequestCooldownSeconds * 1000) {
            const remainingSeconds = Math.ceil((config.TPARequestCooldownSeconds * 1000 - elapsedTime) / 1000);
            playerUtils.debugLog(`[TpaManager] Cooldown active for ${requester.name}. Remaining: ${remainingSeconds}s`, dependencies, requester.name);
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
        expiryTimestamp: now + (config.TPARequestTimeoutSeconds * 1000),
        warmupExpiryTimestamp: 0,
    };
    activeRequests.set(requestId, request);
    lastPlayerRequestTimestamp.set(requester.name, now);
    playerUtils.debugLog(`[TpaManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`, dependencies, requester.name);
    if (logManager) { // logManager might not be on dependencies if called from an unrefactored context
        logManager.addLog({actionType: 'tpa_request_sent', targetName: target.nameTag, adminName: requester.nameTag, details: `Type: ${type}, ID: ${requestId}`}, dependencies);
    }
    return request;
}

/**
 * Finds an active TPA request.
 * - If `playerBname` is provided, it looks for a request specifically between `playerAname` and `playerBname` (in either direction).
 * - If `playerBname` is null or undefined, it looks for *any* request where `playerAname` is either the requester or the target.
 * @param {string} playerAname - The name of the first player. (See IMPORTANT NOTE ON PLAYER IDENTIFIERS at the top of the file)
 * @param {string} [playerBname] - Optional. The name of the second player. (See IMPORTANT NOTE ON PLAYER IDENTIFIERS at the top of the file)
 * @returns {TpaRequest | undefined} The found request, or undefined if no matching request is found.
 */
export function findRequest(playerAname, playerBname) {
    for (const request of activeRequests.values()) {
        const isRequesterA = request.requesterName === playerAname;
        const isTargetA = request.targetName === playerAname;
        const isRequesterB = playerBname ? request.requesterName === playerBname : false;
        const isTargetB = playerBname ? request.targetName === playerBname : false;

        if (playerBname) {
            // Looking for a specific pair: (A to B) or (B to A)
            if ((isRequesterA && isTargetB) || (isRequesterB && isTargetA)) {
                return request;
            }
        } else {
            // Looking for any request involving playerA
            if (isRequesterA || isTargetA) {
                return request;
            }
        }
    }
    return undefined;
}

/**
 * Finds all active TPA requests involving a specific player (either as requester or target).
 * @param {string} playerName - The name of the player. (See IMPORTANT NOTE ON PLAYER IDENTIFIERS at the top of the file)
 * @returns {TpaRequest[]} An array of matching TPA requests.
 */
export function findRequestsForPlayer(playerName) {
    const results = [];
    for (const request of activeRequests.values()) {
        if (request.requesterName === playerName || request.targetName === playerName) {
            results.push(request);
        }
    }
    return results;
}

export function removeRequest(requestId, dependencies) { // Added dependencies for potential logging
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        if (dependencies?.playerUtils) {
            dependencies.playerUtils.debugLog(`[TpaManager] Removed request ${requestId}`, dependencies, null);
        }
        return true;
    }
    return false;
}

export function acceptRequest(requestId, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) {
        playerUtils.debugLog(`[TpaManager] Attempted to accept non-existent request ${requestId}`, dependencies, null);
        return false;
    }

    if (request.status !== 'pending_acceptance') {
        playerUtils.debugLog(`[TpaManager] Attempted to accept request ${requestId} which is not in 'pending_acceptance' state (current: ${request.status})`, dependencies, null);
        return false;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : (!targetPlayer ? request.targetName : "Unknown");
        const onlinePlayer = requesterPlayer || targetPlayer;
        if (onlinePlayer) {
            onlinePlayer.sendMessage(getString("tpa.manager.error.targetOfflineOnAccept", { offlinePlayerName: offlinePlayerName }));
        }
        playerUtils.debugLog(`[TpaManager] Player ${offlinePlayerName} (or target) not found for accepted request ${requestId}. Cancelling.`, dependencies, offlinePlayerName);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies); // Pass dependencies
        return false;
    }

    request.status = 'pending_teleport_warmup';
    request.warmupExpiryTimestamp = Date.now() + (config.TPATeleportWarmupSeconds * 1000);
    activeRequests.set(requestId, request);

    const warmupMsgString = getString("tpa.manager.warmupMessage", { warmupSeconds: config.TPATeleportWarmupSeconds });

    if (request.requestType === 'tpa') {
        requesterPlayer.sendMessage(getString("tpa.manager.requester.accepted", { targetPlayerName: targetPlayer.nameTag, warmupMessage: warmupMsgString }));
        targetPlayer.sendMessage(getString("tpa.manager.target.acceptedFromRequester", { requesterPlayerName: requesterPlayer.nameTag, warmupSeconds: config.TPATeleportWarmupSeconds }));
    } else {
        targetPlayer.sendMessage(getString("tpa.manager.target.acceptedByRequester", { requesterPlayerName: requesterPlayer.nameTag, warmupMessage: warmupMsgString }));
        requesterPlayer.sendMessage(getString("tpa.manager.requester.acceptedHere", { targetPlayerName: targetPlayer.nameTag, warmupSeconds: config.TPATeleportWarmupSeconds }));
    }
    if(logManager) { // logManager might not be on dependencies if called from an unrefactored context
        logManager.addLog({actionType: 'tpa_request_accepted', targetName: targetPlayer.nameTag, adminName: requesterPlayer.nameTag, details: `Type: ${request.requestType}, ID: ${requestId}`}, dependencies);
    }
    playerUtils.debugLog(`[TpaManager] Request ${requestId} accepted, warm-up initiated. Expires at ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`, dependencies, request.targetName);
    return true;
}

export function executeTeleport(requestId, dependencies) { // Added dependencies
    const { playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) { return; }
    if (request.status !== 'pending_teleport_warmup') {
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} is not in 'pending_teleport_warmup' state (current: ${request.status}). Aborting teleport.`, dependencies, request.requesterName);
        if (request.status === 'completed' || request.status === 'cancelled') { removeRequest(requestId, dependencies); } // Pass dependencies
        return;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : (!targetPlayer ? request.targetName : "Unknown");
        const onlinePlayer = requesterPlayer || targetPlayer;
        const message = getString("tpa.manager.error.teleportTargetOffline", { offlinePlayerName: offlinePlayerName });
        if (onlinePlayer) { onlinePlayer.sendMessage(message); }
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Player ${offlinePlayerName} (or target) not found for request ${requestId}. ${message}`, dependencies, offlinePlayerName);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies); // Pass dependencies
        return;
    }

    try {
        let teleportSuccessful = false;
        if (request.requestType === 'tpa') {
            const targetDimension = world.getDimension(request.targetDimensionId);
            if (!targetDimension) throw new Error(`Invalid target dimension ID: ${request.targetDimensionId}`);
            requesterPlayer.teleport(request.targetLocation, { dimension: targetDimension });
            requesterPlayer.sendMessage(getString("tpa.manager.teleport.successToTarget", { targetPlayerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString("tpa.manager.teleport.successTargetNotified", { requesterPlayerName: requesterPlayer.nameTag }));
            teleportSuccessful = true;
        } else if (request.requestType === 'tpahere') {
            const requesterDimension = world.getDimension(request.requesterDimensionId);
            if (!requesterDimension) throw new Error(`Invalid requester dimension ID: ${request.requesterDimensionId}`);
            targetPlayer.teleport(request.requesterLocation, { dimension: requesterDimension });
            targetPlayer.sendMessage(getString("tpa.manager.teleport.successToRequester", { requesterPlayerName: requesterPlayer.nameTag }));
            requesterPlayer.sendMessage(getString("tpa.manager.teleport.successRequesterNotified", { targetPlayerName: targetPlayer.nameTag }));
            teleportSuccessful = true;
        } else {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Unknown request type: ${request.requestType} for request ${requestId}`, dependencies, request.requesterName);
        }

        if (teleportSuccessful) {
            request.status = 'completed';
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} processed successfully. Type: ${request.requestType}`, dependencies, request.requesterName);
        } else {
            request.status = 'cancelled';
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Failed due to unknown request type for ${requestId}.`, dependencies, request.requesterName);
        }
    } catch (e) {
        request.status = 'cancelled';
        console.error(`[TpaManager] ExecuteTeleport: Error during teleport for request ${requestId}: ${e.stack || e}`);
        try {
            if (requesterPlayer && requesterPlayer.isValid()) {
                 requesterPlayer.sendMessage(getString("tpa.manager.error.teleportGenericErrorToRequester"));
            }
            if (targetPlayer && targetPlayer.isValid()) {
                 targetPlayer.sendMessage(getString("tpa.manager.error.teleportGenericErrorToTarget", { otherPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
            }
        } catch (notifyError) {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Failed to notify players after teleport error: ${notifyError.stack || notifyError}`, dependencies, request.requesterName);
        }
    } finally {
        removeRequest(requestId, dependencies); // Pass dependencies
        if (logManager) {
            logManager.addLog({actionType: 'tpa_teleport_finalized', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Status: ${request.status}, Type: ${request.requestType}, ID: ${requestId}`}, dependencies);
        }
    }
}

export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog, dependencies) { // Added dependencies
    const { playerUtils, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request || request.status === 'cancelled' || request.status === 'completed') {
        return;
    }
    request.status = 'cancelled';
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
    if (requesterPlayer && requesterPlayer.isValid()) { requesterPlayer.sendMessage(reasonMessagePlayer); }
    if (targetPlayer && targetPlayer.isValid()) { targetPlayer.sendMessage(reasonMessagePlayer); }
    playerUtils.debugLog(`[TpaManager] Teleport for request ${requestId} cancelled: ${reasonMessageLog}`, dependencies, request.requesterName);
    if (logManager) {
        logManager.addLog({actionType: 'tpa_teleport_cancelled', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Reason: ${reasonMessageLog}, ID: ${requestId}`}, dependencies);
    }
    removeRequest(requestId, dependencies); // Pass dependencies
}

export function declineRequest(requestId, dependencies) { // Added dependencies
    const { playerUtils, getString, logManager } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) { return; }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    // It's possible players logged off, use nameTag if player object exists, otherwise fallback to stored name.
    const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
    const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;

    if (request.status === 'pending_acceptance') {
        if (requesterPlayer && requesterPlayer.isValid()) {
            requesterPlayer.sendMessage(getString("tpa.manager.decline.requesterNotified", { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer && targetPlayer.isValid()) {
            targetPlayer.sendMessage(getString("tpa.manager.decline.targetNotified", { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} declined.`, dependencies, request.targetName);
    } else {
        if (requesterPlayer && requesterPlayer.isValid()) {
            requesterPlayer.sendMessage(getString("tpa.manager.decline.otherCancelledRequester", { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer && targetPlayer.isValid()) {
            targetPlayer.sendMessage(getString("tpa.manager.decline.otherCancelledTarget", { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} cancelled (was in state: ${request.status}).`, dependencies, request.requesterName);
    }
    request.status = 'cancelled';
    if(logManager) {
        logManager.addLog({actionType: 'tpa_request_declined', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}, Status: ${request.status}`}, dependencies);
    }
    removeRequest(requestId, dependencies); // Pass dependencies
}

export function clearExpiredRequests(dependencies) { // Added dependencies
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
        playerUtils.debugLog(`[TpaManager] Request ${request.requestId} between ${request.requesterName} and ${request.targetName} expired while pending acceptance.`, dependencies, request.requesterName);

        const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
        const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
        const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
        const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;

        if (requesterPlayer && requesterPlayer.isValid()) {
            requesterPlayer.sendMessage(getString("tpa.manager.expired.requesterNotified", { targetName: targetDisplayName }));
        }
        if (targetPlayer && targetPlayer.isValid()) {
            targetPlayer.sendMessage(getString("tpa.manager.expired.targetNotified", { requesterName: requesterDisplayName }));
        }
        if (logManager) {
            logManager.addLog({actionType: 'tpa_request_expired', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}`}, dependencies);
        }
        removeRequest(request.requestId, dependencies); // Pass dependencies
    }
}

export function getPlayerTpaStatus(playerName, dependencies) { // Added dependencies for potential future use (logging)
    const { playerUtils } = dependencies; // playerUtils might be used for logging if needed
    if (!playerTpaStatuses.has(playerName)) {
        // playerUtils.debugLog(`[TpaManager] No TPA status for ${playerName}, returning default.`, dependencies, playerName); // Optional: too verbose?
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 };
    }
    return playerTpaStatuses.get(playerName);
}

export function setPlayerTpaStatus(playerName, accepts, dependencies) { // Added dependencies
    const { playerUtils, logManager } = dependencies;
    const status = {
        playerName,
        acceptsTpaRequests: accepts,
        lastTpaToggleTimestamp: Date.now()
    };
    playerTpaStatuses.set(playerName, status);
    playerUtils.debugLog(`[TpaManager] Player ${playerName} TPA status set to: ${accepts}`, dependencies, playerName);
    if (logManager) {
        logManager.addLog({actionType: 'tpa_status_set', targetName: playerName, details: `Accepts TPA: ${accepts}`}, dependencies);
    }
}

export function getRequestsInWarmup() { // No dependencies needed as it operates on local state
    const warmupRequests = [];
    for (const request of activeRequests.values()) {
        if (request.status === 'pending_teleport_warmup') {
            warmupRequests.push(request);
        }
    }
    return warmupRequests;
}
