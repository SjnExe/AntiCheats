/**
 * @file Manages TPA (teleport request) operations, including creating, tracking, and processing requests.
 * @version 1.0.0
 */

import { world } from '@minecraft/server';
import * as config from '../config.js'; // Needed for timeout, etc.
// Potentially import PlayerData from playerDataManager if TPA status is stored there
// import { getPlayerData, updatePlayerData } from './playerDataManager.js';
// Or manage TPA status (acceptsTpaRequests) internally if preferred.

/**
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('../types.js').PlayerTpaStatus} PlayerTpaStatus
 * @typedef {import('@minecraft/server').Player} Player
 * @typedef {import('@minecraft/server').Vector3} Vector3
 * @typedef {import('@minecraft/server').Dimension} Dimension
 */

/**
 * In-memory store for active TPA requests.
 * @type {Map<string, TpaRequest>}
 */
const activeRequests = new Map(); // Key: requestId

/**
 * In-memory store for player TPA statuses.
 * @type {Map<string, PlayerTpaStatus>} PlayerName -> PlayerTpaStatus
 */
const playerTpaStatuses = new Map();

/**
 * Generates a unique request ID.
 * @returns {string}
 */
function generateRequestId() {
    // Basic UUID-like generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Adds a new TPA request.
 * @param {Player} requester - The player making the request.
 * @param {Player} target - The player receiving the request.
 * @param {'tpa' | 'tpahere'} type - The type of request.
 * @returns {TpaRequest | null} The created request object or null if failed.
 */
export function addRequest(requester, target, type) {
    // TODO: Check if a request already exists between these players
    // TODO: Check target's TPA status (playerTpaStatuses)
    const now = Date.now();
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
        creationTimestamp: now,
        expiryTimestamp: now + (config.tpaRequestTimeoutSeconds * 1000),
    };
    activeRequests.set(requestId, request);
    console.log(`[TPAManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`);
    return request;
}

/**
 * Finds an active TPA request involving two players.
 * Prioritizes requests where targetName matches the first argument if type is 'tpa',
 * or requesterName matches if type is 'tpahere'.
 * If specificPlayer is provided, it looks for requests targeting or initiated by that player.
 * @param {string} playerAname - Name of the first player.
 * @param {string} [playerBname] - (Optional) Name of the second player. If not provided, finds any request for playerAname.
 * @returns {TpaRequest | undefined} The found request or undefined.
 */
export function findRequest(playerAname, playerBname) {
    for (const request of activeRequests.values()) {
        if (playerBname) {
            // Request from A to B OR from B to A
            if ((request.requesterName === playerAname && request.targetName === playerBname) ||
                (request.requesterName === playerBname && request.targetName === playerAname)) {
                return request;
            }
        } else {
            // Any request involving playerAname
            if (request.requesterName === playerAname || request.targetName === playerAname) {
                return request;
            }
        }
    }
    return undefined;
}

/**
 * Finds all TPA requests where the given player is either the requester or the target.
 * @param {string} playerName - The name of the player.
 * @returns {TpaRequest[]} An array of TPA requests.
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
 * @returns {boolean} True if a request was removed, false otherwise.
 */
export function removeRequest(requestId) {
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        console.log(`[TPAManager] Removed request ${requestId}`);
        return true;
    }
    return false;
}

/**
 * Processes the acceptance of a TPA request.
 * This function handles the teleportation of players based on the request type
 * and notifies both parties.
 * @param {string} requestId - The ID of the request to accept.
 * @returns {boolean} True if the request was successfully processed and teleportation occurred/attempted, false otherwise.
 */
export function acceptRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) {
        console.warn(`[TPAManager] Attempted to accept non-existent request ${requestId}`);
        return false;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer) {
        if (targetPlayer) {
            targetPlayer.sendMessage(`§c${request.requesterName} is no longer online. TPA request cancelled.`);
        }
        console.log(`[TPAManager] Requester ${request.requesterName} not found for request ${requestId}.`);
        removeRequest(requestId);
        return false;
    }
    if (!targetPlayer) {
        requesterPlayer.sendMessage(`§c${request.targetName} is no longer online. TPA request cancelled.`);
        console.log(`[TPAManager] Target ${request.targetName} not found for request ${requestId}.`);
        removeRequest(requestId);
        return false;
    }

    try {
        if (request.requestType === 'tpa') {
            requesterPlayer.teleport(request.targetLocation, { dimension: world.getDimension(request.targetDimensionId) });
            requesterPlayer.sendMessage("§aTeleported successfully to " + targetPlayer.nameTag); // Use nameTag for display
            targetPlayer.sendMessage("§a" + requesterPlayer.nameTag + " has teleported to you.");
        } else if (request.requestType === 'tpahere') {
            targetPlayer.teleport(request.requesterLocation, { dimension: world.getDimension(request.requesterDimensionId) });
            targetPlayer.sendMessage("§aTeleported successfully to " + requesterPlayer.nameTag);
            requesterPlayer.sendMessage("§a" + targetPlayer.nameTag + " has teleported to you.");
        } else {
            console.error(`[TPAManager] Unknown request type: ${request.requestType} for request ${requestId}`);
            removeRequest(requestId); // Clean up invalid request type
            return false;
        }
        console.log(`[TPAManager] Request ${requestId} processed successfully. Type: ${request.requestType}`);
        removeRequest(requestId); // Remove after successful processing
        return true;
    } catch (e) {
        console.error(`[TPAManager] Error during teleport for request ${requestId}: ${e.stack || e}`);
        // Attempt to notify players if possible, as they are confirmed to be online at this point.
        try {
            requesterPlayer.sendMessage("§cAn error occurred during teleportation. Please try again.");
            if (targetPlayer && targetPlayer.isValid()) { // Check if targetPlayer is still valid before sending message
                 targetPlayer.sendMessage("§cAn error occurred during a TPA teleportation involving " + requesterPlayer.nameTag + ".");
            }
        } catch (notifyError) {
            console.warn(`[TPAManager] Failed to notify players after teleport error: ${notifyError.stack || notifyError}`);
        }
        removeRequest(requestId); // Still remove request on error to prevent reprocessing
        return false;
    }
}

/**
 * Processes the declining of a TPA request. (Placeholder)
 * @param {string} requestId - The ID of the request to decline.
 */
export function declineRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) {
        // Might not be an issue if already expired and auto-removed
        // console.warn(`[TPAManager] Attempted to decline non-existent request ${requestId}`);
        return;
    }
    console.log(`[TPAManager] Request ${requestId} declined.`);
    removeRequest(requestId);
}

/**
 * Clears all expired TPA requests. (Placeholder for tick integration)
 */
export function clearExpiredRequests() {
    const now = Date.now();
    let clearedCount = 0;
    for (const request of activeRequests.values()) {
        if (now >= request.expiryTimestamp) {
            // TODO: Notify players if desired
            console.log(`[TPAManager] Request ${request.requestId} expired.`);
            removeRequest(request.requestId);
            clearedCount++;
        }
    }
    if (clearedCount > 0) {
        console.log(`[TPAManager] Cleared ${clearedCount} expired TPA requests.`);
    }
}

/**
 * Gets a player's TPA acceptance status.
 * @param {string} playerName - The name of the player.
 * @returns {PlayerTpaStatus} The player's TPA status object.
 */
export function getPlayerTpaStatus(playerName) {
    if (!playerTpaStatuses.has(playerName)) {
        // Default status if not set
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 };
    }
    return playerTpaStatuses.get(playerName);
}

/**
 * Sets a player's TPA acceptance status.
 * @param {string} playerName - The name of the player.
 * @param {boolean} accepts - Whether the player accepts TPA requests.
 */
export function setPlayerTpaStatus(playerName, accepts) {
    const status = {
        playerName,
        acceptsTpaRequests: accepts,
        lastTpaToggleTimestamp: Date.now()
    };
    playerTpaStatuses.set(playerName, status);
    console.log(`[TPAManager] Player ${playerName} TPA status set to: ${accepts}`);
}

// TODO: Consider adding a function to be called from main.js on world load to initialize anything if needed.
// TODO: Consider persistence for playerTpaStatuses if desired across server restarts (current is in-memory).
