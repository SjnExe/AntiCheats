/**
 * Manages TPA (teleport request) operations, including creating, tracking, and processing requests.
 */
import * as mc from '@minecraft/server'; // Use mc alias

/**
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('../types.js').CommandDependencies} Dependencies
 * @typedef {import('../types.js').PlayerTpaStatus} PlayerTpaStatus
 */

/** @type {Map<string, TpaRequest>} */
const activeRequests = new Map();
/** @type {Map<string, number>} */
const lastPlayerRequestTimestamp = new Map();
/** @type {Map<string, PlayerTpaStatus>} */
const playerTpaStatuses = new Map();

/**
 * Generates a unique ID for a new TPA request.
 * @returns {string} A unique request ID.
 */
function generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8); // eslint-disable-line no-mixed-operators
        return v.toString(16);
    });
}

/**
 * Adds a new TPA request.
 * @param {mc.Player} requester - The player making the request.
 * @param {mc.Player} target - The player being requested to.
 * @param {('tpa'|'tpahere')} type - The type of TPA request.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {TpaRequest | {error: string, remaining?: number}} The created request or an error object.
 */
export function addRequest(requester, target, type, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const now = Date.now();

    if (lastPlayerRequestTimestamp.has(requester.name)) {
        const elapsedTime = now - lastPlayerRequestTimestamp.get(requester.name);
        if (elapsedTime < config.tpaRequestCooldownSeconds * 1000) {
            const remainingSeconds = Math.ceil((config.tpaRequestCooldownSeconds * 1000 - elapsedTime) / 1000);
            playerUtils.debugLog(`[TpaManager] Cooldown active for ${requester.name}. Remaining: ${remainingSeconds}s`, requester.name, dependencies);
            return { error: 'cooldown', remaining: remainingSeconds };
        }
    }

    const requestId = generateRequestId();
    /** @type {TpaRequest} */
    const request = {
        requestId,
        requesterName: requester.name,
        requesterLocation: { ...requester.location }, // Clone location
        requesterDimensionId: requester.dimension.id,
        targetName: target.name,
        targetLocation: { ...target.location }, // Clone location
        targetDimensionId: target.dimension.id,
        requestType: type,
        status: 'pending_acceptance',
        creationTimestamp: now,
        expiryTimestamp: now + (config.tpaRequestTimeoutSeconds * 1000),
        warmupExpiryTimestamp: 0, // Will be set on acceptance
    };

    activeRequests.set(requestId, request);
    lastPlayerRequestTimestamp.set(requester.name, now);
    playerUtils.debugLog(`[TpaManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`, requester.name, dependencies);
    logManager.addLog({ actionType: 'tpaRequestSent', targetName: target.nameTag, adminName: requester.nameTag, details: `Type: ${type}, ID: ${requestId}` }, dependencies);
    return request;
}

/**
 * Finds an active TPA request between two players, or involving one player if playerBname is omitted.
 * @param {string} playerAName - Name of the first player.
 * @param {string} [playerBName] - Optional: Name of the second player.
 * @returns {TpaRequest | undefined} The found request, or undefined.
 */
export function findRequest(playerAName, playerBName) {
    for (const request of activeRequests.values()) {
        const isRequesterA = request.requesterName === playerAName;
        const isTargetA = request.targetName === playerAName;

        if (playerBName) {
            const isRequesterB = request.requesterName === playerBName;
            const isTargetB = request.targetName === playerBName;
            if ((isRequesterA && isTargetB) || (isRequesterB && isTargetA)) {
                return request;
            }
        } else {
            // If only one player name is provided, find any request involving them
            if (isRequesterA || isTargetA) {
                return request;
            }
        }
    }
    return undefined;
}

/**
 * Finds all TPA requests involving a specific player.
 * @param {string} playerName - The name of the player.
 * @returns {TpaRequest[]} An array of requests.
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

/**
 * Removes a TPA request by its ID.
 * @param {string} requestId - The ID of the request to remove.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the request was found and removed, false otherwise.
 */
export function removeRequest(requestId, dependencies) {
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        dependencies.playerUtils.debugLog(`[TpaManager] Removed request ${requestId}`, null, dependencies);
        return true;
    }
    return false;
}

/**
 * Accepts a TPA request.
 * @param {string} requestId - The ID of the request to accept.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {boolean} True if the request was successfully accepted, false otherwise.
 */
export function acceptRequest(requestId, dependencies) {
    const { config, playerUtils, getString, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const request = activeRequests.get(requestId);

    if (!request) {
        playerUtils.debugLog(`[TpaManager] Attempted to accept non-existent request ${requestId}`, null, dependencies);
        return false;
    }
    if (request.status !== 'pending_acceptance') {
        playerUtils.debugLog(`[TpaManager] Attempted to accept request ${requestId} not in 'pending_acceptance' (current: ${request.status})`, null, dependencies);
        return false;
    }

    const requesterPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : (!targetPlayer ? request.targetName : getString('common.value.unknown'));
        const onlinePlayer = requesterPlayer || targetPlayer; // The one who is still online to receive the message
        if (onlinePlayer && onlinePlayer.isValid()) {
            onlinePlayer.sendMessage(getString('tpa.manager.error.targetOfflineOnAccept', { offlinePlayerName }));
        }
        playerUtils.debugLog(`[TpaManager] Player ${offlinePlayerName} (or target) not found for accepted request ${requestId}. Cancelling.`, offlinePlayerName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies); // Clean up cancelled request
        return false;
    }

    request.status = 'pending_teleport_warmup';
    request.warmupExpiryTimestamp = Date.now() + (config.tpaTeleportWarmupSeconds * 1000);
    activeRequests.set(requestId, request); // Update the request in the map

    const warmupMsgString = getString('tpa.manager.warmupMessage', { warmupSeconds: config.tpaTeleportWarmupSeconds });

    if (request.requestType === 'tpa') {
        requesterPlayer.sendMessage(getString('tpa.manager.requester.accepted', { targetPlayerName: targetPlayer.nameTag, warmupMessage: warmupMsgString }));
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedFromRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupSeconds: config.tpaTeleportWarmupSeconds }));
    } else { // 'tpahere'
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedByRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupMessage: warmupMsgString }));
        requesterPlayer.sendMessage(getString('tpa.manager.requester.acceptedHere', { targetPlayerName: targetPlayer.nameTag, warmupSeconds: config.tpaTeleportWarmupSeconds }));
    }

    logManager.addLog({ actionType: 'tpaRequestAccepted', targetName: targetPlayer.nameTag, adminName: requesterPlayer.nameTag, details: `Type: ${request.requestType}, ID: ${requestId}` }, dependencies);
    playerUtils.debugLog(`[TpaManager] Request ${requestId} accepted, warm-up initiated. Expires at ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`, request.targetName, dependencies);
    return true;
}

/**
 * Executes the teleportation for a TPA request after warmup.
 * @param {string} requestId - The ID of the request to execute.
 * @param {Dependencies} dependencies - Standard dependencies object.
 */
export function executeTeleport(requestId, dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const request = activeRequests.get(requestId);

    if (!request) {
        return; // Request might have been cancelled or already processed
    }

    if (request.status !== 'pending_teleport_warmup') {
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} not in 'pending_teleport_warmup' (current: ${request.status}). Aborting.`, request.requesterName, dependencies);
        if (request.status === 'completed' || request.status === 'cancelled') {
            removeRequest(requestId, dependencies); // Clean up if somehow still here
        }
        return;
    }

    const requesterPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer || !requesterPlayer.isValid() || !targetPlayer.isValid()) {
        const offlinePlayerName = !requesterPlayer || !requesterPlayer.isValid() ? request.requesterName : (!targetPlayer || !targetPlayer.isValid() ? request.targetName : getString('common.value.unknown'));
        const onlinePlayer = (requesterPlayer && requesterPlayer.isValid()) ? requesterPlayer : ((targetPlayer && targetPlayer.isValid()) ? targetPlayer : null);
        const message = getString('tpa.manager.error.teleportTargetOffline', { offlinePlayerName });
        if (onlinePlayer) {
            onlinePlayer.sendMessage(message);
        }
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Player ${offlinePlayerName} (or target) not found/invalid for request ${requestId}. ${message}`, offlinePlayerName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies);
        return;
    }

    try {
        let teleportSuccessful = false;
        if (request.requestType === 'tpa') { // Requester teleports to target
            const targetDimension = minecraftSystem.world.getDimension(request.targetDimensionId);
            if (!targetDimension) {
                throw new Error(`Invalid target dimension ID: ${request.targetDimensionId}`);
            }
            requesterPlayer.teleport(request.targetLocation, { dimension: targetDimension });
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successToTarget', { targetPlayerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successTargetNotified', { requesterPlayerName: requesterPlayer.nameTag }));
            teleportSuccessful = true;
        } else if (request.requestType === 'tpahere') { // Target teleports to requester
            const requesterDimension = minecraftSystem.world.getDimension(request.requesterDimensionId);
            if (!requesterDimension) {
                throw new Error(`Invalid requester dimension ID: ${request.requesterDimensionId}`);
            }
            targetPlayer.teleport(request.requesterLocation, { dimension: requesterDimension });
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successToRequester', { requesterPlayerName: requesterPlayer.nameTag }));
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successRequesterNotified', { targetPlayerName: targetPlayer.nameTag }));
            teleportSuccessful = true;
        } else {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Unknown request type: ${request.requestType} for request ${requestId}`, request.requesterName, dependencies);
        }

        request.status = teleportSuccessful ? 'completed' : 'cancelled';
        playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Request ${requestId} processed. Status: ${request.status}. Type: ${request.requestType}`, request.requesterName, dependencies);
    } catch (e) {
        request.status = 'cancelled';
        console.error(`[TpaManager] ExecuteTeleport: Error during teleport for request ${requestId}: ${e.stack || e}`);
        try {
            if (requesterPlayer?.isValid()) {
                requesterPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToRequester'));
            }
            if (targetPlayer?.isValid()) {
                targetPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToTarget', { otherPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
            }
        } catch (notifyError) {
            playerUtils.debugLog(`[TpaManager] ExecuteTeleport: Failed to notify players after teleport error: ${notifyError.stack || notifyError}`, request.requesterName, dependencies);
        }
    } finally {
        removeRequest(requestId, dependencies); // Always remove after processing
        logManager.addLog({ actionType: 'tpaTeleportFinalized', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Status: ${request.status}, Type: ${request.requestType}, ID: ${requestId}` }, dependencies);
    }
}

/**
 * Cancels an ongoing TPA teleport (e.g., due to movement or damage during warmup).
 * @param {string} requestId - The ID of the request to cancel.
 * @param {string} reasonMessagePlayer - The message to send to the involved players.
 * @param {string} reasonMessageLog - The reason to log for this cancellation.
 * @param {Dependencies} dependencies - Standard dependencies object.
 */
export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog, dependencies) {
    const { playerUtils, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const request = activeRequests.get(requestId);

    if (!request || request.status === 'cancelled' || request.status === 'completed') {
        return; // Already processed or doesn't exist
    }
    request.status = 'cancelled';

    const requesterPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.targetName);

    if (requesterPlayer?.isValid()) {
        requesterPlayer.sendMessage(reasonMessagePlayer);
    }
    if (targetPlayer?.isValid()) {
        targetPlayer.sendMessage(reasonMessagePlayer);
    }

    playerUtils.debugLog(`[TpaManager] Teleport for request ${requestId} cancelled: ${reasonMessageLog}`, request.requesterName, dependencies);
    logManager.addLog({ actionType: 'tpaTeleportCancelled', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Reason: ${reasonMessageLog}, ID: ${requestId}` }, dependencies);
    removeRequest(requestId, dependencies);
}

/**
 * Declines a pending TPA request or cancels an accepted one if not yet teleported.
 * @param {string} requestId - The ID of the request to decline/cancel.
 * @param {Dependencies} dependencies - Standard dependencies object.
 */
export function declineRequest(requestId, dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const request = activeRequests.get(requestId);
    if (!request) {
        return;
    }

    const requesterPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.targetName);
    const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
    const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;

    if (request.status === 'pending_acceptance') {
        if (requesterPlayer?.isValid()) {
            requesterPlayer.sendMessage(getString('tpa.manager.decline.requesterNotified', { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer?.isValid()) {
            targetPlayer.sendMessage(getString('tpa.manager.decline.targetNotified', { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} declined.`, request.targetName, dependencies);
    } else { // If already accepted (e.g., in warmup) or other states, treat as a general cancel
        if (requesterPlayer?.isValid()) {
            requesterPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledRequester', { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer?.isValid()) {
            targetPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledTarget', { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils.debugLog(`[TpaManager] Request ${requestId} between ${request.requesterName} and ${request.targetName} cancelled (was in state: ${request.status}).`, request.requesterName, dependencies);
    }

    request.status = 'cancelled';
    logManager.addLog({ actionType: 'tpaRequestDeclined', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}, Status: ${request.status}` }, dependencies);
    removeRequest(requestId, dependencies);
}

/**
 * Clears expired TPA requests from the system.
 * @param {Dependencies} dependencies - Standard dependencies object.
 */
export function clearExpiredRequests(dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies; // Use mc from dependencies
    const now = Date.now();
    const requestIdsToExpire = [];

    for (const request of activeRequests.values()) {
        if (request.status === 'pending_acceptance' && now >= request.expiryTimestamp) {
            requestIdsToExpire.push(request.requestId);
        }
    }

    for (const requestId of requestIdsToExpire) {
        const request = activeRequests.get(requestId);
        if (!request || request.status !== 'pending_acceptance') { // Double check status
            continue;
        }
        request.status = 'cancelled'; // Mark as cancelled due to expiry
        playerUtils.debugLog(`[TpaManager] Request ${request.requestId} between ${request.requesterName} and ${request.targetName} expired while pending acceptance.`, request.requesterName, dependencies);

        const requesterPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.requesterName);
        const targetPlayer = minecraftSystem.world.getAllPlayers().find(p => p.name === request.targetName);
        const targetDisplayName = targetPlayer ? targetPlayer.nameTag : request.targetName;
        const requesterDisplayName = requesterPlayer ? requesterPlayer.nameTag : request.requesterName;

        if (requesterPlayer?.isValid()) {
            requesterPlayer.sendMessage(getString('tpa.manager.expired.requesterNotified', { targetName: targetDisplayName }));
        }
        if (targetPlayer?.isValid()) {
            targetPlayer.sendMessage(getString('tpa.manager.expired.targetNotified', { requesterName: requesterDisplayName }));
        }
        logManager.addLog({ actionType: 'tpaRequestExpired', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}` }, dependencies);
        removeRequest(request.requestId, dependencies);
    }
}

/**
 * Gets a player's TPA status (whether they accept TPA requests).
 * @param {string} playerName - The name of the player.
 * @param {Dependencies} dependencies - Standard dependencies object.
 * @returns {PlayerTpaStatus} The player's TPA status.
 */
export function getPlayerTpaStatus(playerName, dependencies) {
    if (!playerTpaStatuses.has(playerName)) {
        // Default to accepting TPA if no status is set
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 };
    }
    return playerTpaStatuses.get(playerName);
}

/**
 * Sets a player's TPA status.
 * @param {string} playerName - The name of the player.
 * @param {boolean} accepts - Whether the player accepts TPA requests.
 * @param {Dependencies} dependencies - Standard dependencies object.
 */
export function setPlayerTpaStatus(playerName, accepts, dependencies) {
    const { playerUtils, logManager } = dependencies;
    /** @type {PlayerTpaStatus} */
    const status = { playerName, acceptsTpaRequests: accepts, lastTpaToggleTimestamp: Date.now() };
    playerTpaStatuses.set(playerName, status);
    playerUtils.debugLog(`[TpaManager] Player ${playerName} TPA status set to: ${accepts}`, playerName, dependencies);
    logManager.addLog({ actionType: 'tpaStatusSet', targetName: playerName, details: `Accepts TPA: ${accepts}` }, dependencies);
}

/**
 * Gets all TPA requests currently in the warmup phase.
 * @returns {TpaRequest[]} An array of requests in warmup.
 */
export function getRequestsInWarmup() {
    const warmupRequests = [];
    for (const request of activeRequests.values()) {
        if (request.status === 'pending_teleport_warmup') {
            warmupRequests.push(request);
        }
    }
    return warmupRequests;
}
