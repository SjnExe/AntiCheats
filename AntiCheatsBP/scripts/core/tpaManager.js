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
 * Stores the timestamp of the last TPA request made by a player.
 * Used for implementing request cooldowns.
 * @type {Map<string, number>} PlayerName -> Timestamp (Date.now())
 */
const lastPlayerRequestTimestamp = new Map();

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
 * @returns {TpaRequest | { error: 'cooldown', remaining: number } | null}
 * The created request object, an error object if on cooldown, or null if other pre-checks fail (future).
 */
export function addRequest(requester, target, type) {
    const now = Date.now(); // Define 'now' early

    // --- Cooldown Check ---
    if (lastPlayerRequestTimestamp.has(requester.name)) {
        const elapsedTime = now - lastPlayerRequestTimestamp.get(requester.name);
        if (elapsedTime < config.tpaRequestCooldownSeconds * 1000) {
            const remainingSeconds = Math.ceil((config.tpaRequestCooldownSeconds * 1000 - elapsedTime) / 1000);
            // console.warn is not available in Bedrock scripting environment, using world.sendMessage for debug or removing for production
            // For now, let's use a simple console.log which might go to content log
            console.log(`[TPAManager] Cooldown active for ${requester.name}. Remaining: ${remainingSeconds}s`);
            return { error: 'cooldown', remaining: remainingSeconds };
        }
    }
    // --- End Cooldown Check ---

    // TODO: Check if a request already exists between these players
    // TODO: Check target's TPA status (playerTpaStatuses)

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
        status: 'pending_acceptance', // Added status
        creationTimestamp: now, // Use 'now'
        expiryTimestamp: now + (config.tpaRequestTimeoutSeconds * 1000),
        warmupExpiryTimestamp: 0, // Initialize, will be set on accept
    };
    activeRequests.set(requestId, request);

    // --- Update Last Request Timestamp ---
    lastPlayerRequestTimestamp.set(requester.name, now);
    // --- End Update ---

    console.log(`[TPAManager] Added request ${requestId}: ${requester.name} -> ${target.name}, type: ${type}`);
    return request; // Return the request object on success
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
 * Initiates the warm-up phase for an accepted TPA request.
 * @param {string} requestId - The ID of the request to accept.
 * @returns {boolean} True if the warm-up was successfully initiated, false otherwise.
 */
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
            onlinePlayer.sendMessage(`§c${offlinePlayerName} is no longer online. TPA request cancelled.`);
        }
        console.log(`[TPAManager] Player ${offlinePlayerName} not found for accepted request ${requestId}. Cancelling.`);
        request.status = 'cancelled';
        removeRequest(requestId); // Clean up
        return false;
    }

    request.status = 'pending_teleport_warmup';
    request.warmupExpiryTimestamp = Date.now() + (config.tpaTeleportWarmupSeconds * 1000);
    activeRequests.set(requestId, request); // Update the request in the map

    const warmupMessage = `§eTeleporting in ${config.tpaTeleportWarmupSeconds} seconds. Do not move or take damage.`;
    let requesterMessage = `§aYour TPA request to "${targetPlayer.nameTag}" has been accepted. ${warmupMessage}`;
    let targetMessage = `§a"${requesterPlayer.nameTag}" accepted your TPA request. ${warmupMessage}`;

    if (request.requestType === 'tpa') { // Requester teleports
        requesterPlayer.sendMessage(requesterMessage);
        targetPlayer.sendMessage(`§aYou accepted the TPA request from "${requesterPlayer.nameTag}". They will teleport in ${config.tpaTeleportWarmupSeconds}s.`);
    } else { // Target teleports
        targetPlayer.sendMessage(targetMessage);
        requesterPlayer.sendMessage(`§a"${targetPlayer.nameTag}" accepted your TPA Here request. They will teleport in ${config.tpaTeleportWarmupSeconds}s.`);
    }

    console.log(`[TPAManager] Request ${requestId} accepted, warm-up initiated. Expires at ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`);
    return true;
}


/**
 * Executes the actual teleportation for a request that has completed its warm-up.
 * @param {string} requestId - The ID of the request to execute.
 */
export function executeTeleport(requestId) {
    const request = activeRequests.get(requestId);

    if (!request) {
        // console.warn(`[TPAManager] ExecuteTeleport: Request ${requestId} not found. Might have been cancelled or already processed.`);
        return;
    }

    if (request.status !== 'pending_teleport_warmup') {
        console.warn(`[TPAManager] ExecuteTeleport: Request ${requestId} is not in 'pending_teleport_warmup' state (current: ${request.status}). Aborting teleport.`);
        // If it was already completed/cancelled but somehow not removed, remove it now.
        if (request.status === 'completed' || request.status === 'cancelled') {
            removeRequest(requestId);
        }
        return;
    }

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : request.targetName;
        const onlinePlayer = !requesterPlayer ? targetPlayer : requesterPlayer;
        const message = `§cTeleport cancelled: ${offlinePlayerName} logged off.`;
        if (onlinePlayer) {
            onlinePlayer.sendMessage(message);
        }
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
            requesterPlayer.sendMessage("§aTeleported successfully to " + targetPlayer.nameTag);
            targetPlayer.sendMessage("§a" + requesterPlayer.nameTag + " has teleported to you.");
            teleportSuccessful = true;
        } else if (request.requestType === 'tpahere') {
            const requesterDimension = world.getDimension(request.requesterDimensionId);
            if (!requesterDimension) throw new Error(`Invalid requester dimension ID: ${request.requesterDimensionId}`);
            targetPlayer.teleport(request.requesterLocation, { dimension: requesterDimension });
            targetPlayer.sendMessage("§aTeleported successfully to " + requesterPlayer.nameTag);
            requesterPlayer.sendMessage("§a" + targetPlayer.nameTag + " has teleported to you.");
            teleportSuccessful = true;
        } else {
            console.error(`[TPAManager] ExecuteTeleport: Unknown request type: ${request.requestType} for request ${requestId}`);
        }

        if (teleportSuccessful) {
            request.status = 'completed';
            console.log(`[TPAManager] ExecuteTeleport: Request ${requestId} processed successfully. Type: ${request.requestType}`);
        } else {
            request.status = 'cancelled'; // Or some error status
            console.error(`[TPAManager] ExecuteTeleport: Failed due to unknown request type for ${requestId}.`);
        }
    } catch (e) {
        request.status = 'cancelled'; // Mark as cancelled on error
        console.error(`[TPAManager] ExecuteTeleport: Error during teleport for request ${requestId}: ${e.stack || e}`);
        try {
            if (requesterPlayer && requesterPlayer.isValid()) {
                 requesterPlayer.sendMessage("§cAn error occurred during teleportation. Please try again.");
            }
            if (targetPlayer && targetPlayer.isValid()) {
                 targetPlayer.sendMessage("§cAn error occurred during a TPA teleportation involving " + (requesterPlayer ? requesterPlayer.nameTag : request.requesterName) + ".");
            }
        } catch (notifyError) {
            console.warn(`[TPAManager] ExecuteTeleport: Failed to notify players after teleport error: ${notifyError.stack || notifyError}`);
        }
    } finally {
        removeRequest(requestId); // Always remove after attempting teleport (success, failure, or error)
    }
}


/**
 * Cancels an active TPA request, typically during warm-up if a condition is violated.
 * @param {string} requestId - The ID of the TPA request to cancel.
 * @param {string} reasonMessagePlayer - The message to send to players explaining the cancellation.
 * @param {string} reasonMessageLog - The message to log for the console.
 */
export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog) {
    const request = activeRequests.get(requestId);
    if (!request || request.status === 'cancelled' || request.status === 'completed') {
        return; // Already handled or non-existent
    }

    request.status = 'cancelled';

    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (requesterPlayer) {
        requesterPlayer.sendMessage(reasonMessagePlayer);
    }
    if (targetPlayer) {
        targetPlayer.sendMessage(reasonMessagePlayer);
    }

    console.log(`[TPAManager] Teleport for request ${requestId} cancelled: ${reasonMessageLog}`);
    removeRequest(requestId); // Clean up
}


/**
 * Processes the declining of a TPA request.
 * @param {string} requestId - The ID of the request to decline.
 */
export function declineRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (!request) {
        return;
    }

    // Notify players
    const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
    const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

    if (request.status === 'pending_acceptance') {
        if (requesterPlayer) {
            requesterPlayer.sendMessage(`§c"${targetPlayer ? targetPlayer.nameTag : request.targetName}" declined your TPA request.`);
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(`§cYou declined the TPA request from "${requesterPlayer ? requesterPlayer.nameTag : request.requesterName}".`);
        }
        console.log(`[TPAManager] Request ${requestId} declined by target.`);
    } else {
        // If it's past pending_acceptance (e.g. during warmup, though typically cancelTeleport would be used)
        if (requesterPlayer) {
            requesterPlayer.sendMessage(`§cTPA request involving "${targetPlayer ? targetPlayer.nameTag : request.targetName}" was cancelled.`);
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(`§cTPA request involving "${requesterPlayer ? requesterPlayer.nameTag : request.requesterName}" was cancelled.`);
        }
         console.log(`[TPAManager] Request ${requestId} cancelled (was in state: ${request.status}).`);
    }

    request.status = 'cancelled';
    removeRequest(requestId);
}

/**
 * Clears all expired TPA requests from the activeRequests map.
 * This primarily targets requests in 'pending_acceptance'. Warmup expiry is handled by the main tick loop.
 * Notifies relevant players if they are online when a request expires.
 * This function is intended to be called periodically (e.g., every second) from the main tick loop.
 */
export function clearExpiredRequests() {
    const now = Date.now();
    let clearedCount = 0;
    // Iterate over a copy of keys or manage iteration carefully if modifying map during iteration
    const requestIdsToExpire = [];
    for (const request of activeRequests.values()) {
        // Only expire requests that are still pending acceptance and whose initial expiry time has passed.
        // Warmup expiry is handled separately by the tick loop in main.js checking request.warmupExpiryTimestamp.
        if (request.status === 'pending_acceptance' && now >= request.expiryTimestamp) {
            requestIdsToExpire.push(request.requestId);
        }
    }

    for (const requestId of requestIdsToExpire) {
        const request = activeRequests.get(requestId);
        if (!request || request.status !== 'pending_acceptance') continue; // Check status again, might have changed

        request.status = 'cancelled'; // Mark as cancelled due to expiry
        console.log(`[TPAManager] Request ${request.requestId} between ${request.requesterName} and ${request.targetName} expired while pending acceptance.`);

        const requesterPlayer = world.getAllPlayers().find(p => p.name === request.requesterName);
        const targetPlayer = world.getAllPlayers().find(p => p.name === request.targetName);

        if (requesterPlayer) {
            requesterPlayer.sendMessage(`§cYour TPA request to "${request.targetName}" has expired.`);
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(`§cThe TPA request from "${request.requesterName}" has expired.`);
        }

        removeRequest(request.requestId);
        clearedCount++;
    }

    // No need for summary log if individual removals are logged sufficiently.
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


/**
 * Retrieves all requests currently in the 'pending_teleport_warmup' state.
 * Used by the main tick loop to check for warmup completion or cancellation.
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

// TODO: Consider adding a function to be called from main.js on world load to initialize anything if needed.
// TODO: Consider persistence for playerTpaStatuses if desired across server restarts (current is in-memory).
