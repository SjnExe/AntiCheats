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
 * Processes the acceptance of a TPA request. (Placeholder)
 * @param {string} requestId - The ID of the request to accept.
 */
export function acceptRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) {
        console.warn(`[TPAManager] Attempted to accept non-existent request ${requestId}`);
        return;
    }
    // TODO: Implement teleportation logic based on request.requestType
    // TODO: Ensure players are still online/valid before teleporting.
    console.log(`[TPAManager] Request ${requestId} accepted (teleport logic placeholder).`);
    removeRequest(requestId); // Remove after processing
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
