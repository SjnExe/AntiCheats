/**
 * @file Manages TPA (teleport request) operations, including creating, tracking, and processing requests.
 * @version 1.0.1
 */

import { world, system } from '@minecraft/server';
import * as configModule from '../config.js';
import { getString } from './i18n.js';

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

function generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function addRequest(requester, target, type) {
    const now = Date.now();
    const currentConfig = configModule.editableConfigValues;

    if (lastPlayerRequestTimestamp.has(requester.name)) {
        const elapsedTime = now - lastPlayerRequestTimestamp.get(requester.name);
        if (elapsedTime < currentConfig.TPARequestCooldownSeconds * 1000) {
            const remainingSeconds = Math.ceil((currentConfig.TPARequestCooldownSeconds * 1000 - elapsedTime) / 1000);
            console.log(`[TPAManager] Cooldown active for ${requester.name}. Remaining: ${remainingSeconds}s`);
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
        expiryTimestamp: now + (currentConfig.TPARequestTimeoutSeconds * 1000),
        warmupExpiryTimestamp: 0,
    };
    activeRequests.set(requestId, request);
    lastPlayerRequestTimestamp.set(requester.name, now);
    console.log(`[TPAManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`);
    return request;
}

export function findRequest(playerAname, playerBname) {
    for (const request of activeRequests.values()) {
        if (playerBname) {
            if ((request.requesterName === playerAname && request.targetName === playerBname) ||
                (request.requesterName === playerBname && request.targetName === playerAname)) {
                return request;
            }
        } else {
            if (request.requesterName === playerAname || request.targetName === playerAname) {
                return request;
            }
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

export function removeRequest(requestId) {
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        console.log(`[TPAManager] Removed request ${requestId}`);
        return true;
    }
    return false;
}

export function acceptRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) {
        console.warn(`[TPAManager] Attempted to accept non-existent request ${requestId}`);
        return false;
    }

    if (request.status !== 'pending_acceptance') {
        console.warn(`[TPAManager] Attempted to accept request ${requestId} which is not in 'pending_acceptance' state (current: ${request.status})`);
        return false;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : request.targetName;
        const onlinePlayer = !requesterPlayer ? targetPlayer : requesterPlayer;
        if (onlinePlayer) {
            onlinePlayer.sendMessage(getString("tpa.manager.error.targetOfflineOnAccept", { offlinePlayerName: offlinePlayerName }));
        }
        console.log(`[TPAManager] Player ${offlinePlayerName} not found for accepted request ${requestId}. Cancelling.`);
        request.status = 'cancelled';
        removeRequest(requestId);
        return false;
    }
    const currentConfig = configModule.editableConfigValues;

    request.status = 'pending_teleport_warmup';
    request.warmupExpiryTimestamp = Date.now() + (currentConfig.TPATeleportWarmupSeconds * 1000);
    activeRequests.set(requestId, request);

    const warmupMsgString = getString("tpa.manager.warmupMessage", { warmupSeconds: currentConfig.TPATeleportWarmupSeconds });

    if (request.requestType === 'tpa') {
        requesterPlayer.sendMessage(getString("tpa.manager.requester.accepted", { targetPlayerName: targetPlayer.nameTag, warmupMessage: warmupMsgString }));
        targetPlayer.sendMessage(getString("tpa.manager.target.acceptedFromRequester", { requesterPlayerName: requesterPlayer.nameTag, warmupSeconds: currentConfig.TPATeleportWarmupSeconds }));
    } else {
        targetPlayer.sendMessage(getString("tpa.manager.target.acceptedByRequester", { requesterPlayerName: requesterPlayer.nameTag, warmupMessage: warmupMsgString }));
        requesterPlayer.sendMessage(getString("tpa.manager.requester.acceptedHere", { targetPlayerName: targetPlayer.nameTag, warmupSeconds: currentConfig.TPATeleportWarmupSeconds }));
    }

    console.log(`[TPAManager] Request ${requestId} accepted, warm-up initiated. Expires at ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`);
    return true;
}

export function executeTeleport(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) { return; }
    if (request.status !== 'pending_teleport_warmup') {
        console.warn(`[TPAManager] ExecuteTeleport: Request ${requestId} is not in 'pending_teleport_warmup' state (current: ${request.status}). Aborting teleport.`);
        if (request.status === 'completed' || request.status === 'cancelled') { removeRequest(requestId); }
        return;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : request.targetName;
        const onlinePlayer = !requesterPlayer ? targetPlayer : requesterPlayer;
        const message = getString("tpa.manager.error.teleportTargetOffline", { offlinePlayerName: offlinePlayerName });
        if (onlinePlayer) { onlinePlayer.sendMessage(message); }
        console.log(`[TPAManager] ExecuteTeleport: Player ${offlinePlayerName} not found for request ${requestId}. ${message}`);
        request.status = 'cancelled';
        removeRequest(requestId);
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
            console.error(`[TPAManager] ExecuteTeleport: Unknown request type: ${request.requestType} for request ${requestId}`);
        }

        if (teleportSuccessful) {
            request.status = 'completed';
            console.log(`[TPAManager] ExecuteTeleport: Request ${requestId} processed successfully. Type: ${request.requestType}`);
        } else {
            request.status = 'cancelled';
            console.error(`[TPAManager] ExecuteTeleport: Failed due to unknown request type for ${requestId}.`);
        }
    } catch (e) {
        request.status = 'cancelled';
        console.error(`[TPAManager] ExecuteTeleport: Error during teleport for request ${requestId}: ${e.stack || e}`);
        try {
            if (requesterPlayer && requesterPlayer.isValid()) {
                 requesterPlayer.sendMessage(getString("tpa.manager.error.teleportGenericErrorToRequester"));
            }
            if (targetPlayer && targetPlayer.isValid()) {
                 targetPlayer.sendMessage(getString("tpa.manager.error.teleportGenericErrorToTarget", { otherPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
            }
        } catch (notifyError) {
            console.warn(`[TPAManager] ExecuteTeleport: Failed to notify players after teleport error: ${notifyError.stack || notifyError}`);
        }
    } finally {
        removeRequest(requestId);
    }
}

export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog) {
    const request = activeRequests.get(requestId);
    if (!request || request.status === 'cancelled' || request.status === 'completed') {
        return;
    }
    request.status = 'cancelled';
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
    if (requesterPlayer) { requesterPlayer.sendMessage(reasonMessagePlayer); }
    if (targetPlayer) { targetPlayer.sendMessage(reasonMessagePlayer); }
    console.log(`[TPAManager] Teleport for request ${requestId} cancelled: ${reasonMessageLog}`);
    removeRequest(requestId);
}

export function declineRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) { return; }
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (request.status === 'pending_acceptance') {
        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString("tpa.manager.decline.requesterNotified", { targetPlayerName: (targetPlayer ? targetPlayer.nameTag : request.targetName) }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString("tpa.manager.decline.targetNotified", { requesterPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
        }
        console.log(`[TPAManager] Request ${requestId} declined by target.`);
    } else {
        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString("tpa.manager.decline.otherCancelledRequester", { targetPlayerName: (targetPlayer ? targetPlayer.nameTag : request.targetName) }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString("tpa.manager.decline.otherCancelledTarget", { requesterPlayerName: (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) }));
        }
         console.log(`[TPAManager] Request ${requestId} cancelled (was in state: ${request.status}).`);
    }
    request.status = 'cancelled';
    removeRequest(requestId);
}

export function clearExpiredRequests() {
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
        console.log(`[TPAManager] Request ${request.requestId} between ${request.requesterName} and ${request.targetName} expired while pending acceptance.`);
        const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
        const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);
        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString("tpa.manager.expired.requesterNotified", { targetName: request.targetName }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString("tpa.manager.expired.targetNotified", { requesterName: request.requesterName }));
        }
        removeRequest(request.requestId);
    }
}

export function getPlayerTpaStatus(playerName) {
    if (!playerTpaStatuses.has(playerName)) {
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 };
    }
    return playerTpaStatuses.get(playerName);
}

export function setPlayerTpaStatus(playerName, accepts) {
    const status = {
        playerName,
        acceptsTpaRequests: accepts,
        lastTpaToggleTimestamp: Date.now()
    };
    playerTpaStatuses.set(playerName, status);
    console.log(`[TPAManager] Player ${playerName} TPA status set to: ${accepts}`);
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
