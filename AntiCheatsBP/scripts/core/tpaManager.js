/**
 * @file Manages TPA (teleport request) operations.
 * @module AntiCheatsBP/scripts/core/tpaManager
 */
import { logError } from '../utils/playerUtils.js';

// Constants for UUID generation
const uuidRandomMultiplier = 16;
const uuidVariantMask = 0x3;
const uuidVariantSet = 0x8;
const uuidToStringRadix = 16;

// Default configuration values
const defaultTpaRequestCooldownSeconds = 60;
const defaultTpaRequestTimeoutSeconds = 60;
const defaultTpaTeleportWarmupSeconds = 5;
const defaultTpaMovementTolerance = 0.5;

/**
 * @typedef {import('../types.js').TpaRequest} TpaRequest
 * @typedef {import('../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../types.js').PlayerTpaStatus} PlayerTpaStatus
 */

/** @type {Map<string, TpaRequest>} */
const activeRequests = new Map(); // Stores active TPA requests, keyed by requestId.
/** @type {Map<string, number>} */
const lastPlayerRequestTimestamp = new Map(); // Stores last request time for cooldowns, keyed by player name.
/** @type {Map<string, PlayerTpaStatus>} */
const playerTpaStatuses = new Map(); // Stores player TPA acceptance status, keyed by player name.

/**
 * @returns {string} A unique request ID.
 */
function generateRequestId() {
    // Simple UUID v4 like generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * uuidRandomMultiplier | 0;
        const v = c === 'x' ? r : ((r & uuidVariantMask) | uuidVariantSet);
        return v.toString(uuidToStringRadix);
    });
}

/**
 * @param {mc.Player} requester The player making the request.
 * @param {mc.Player} target The player being requested to.
 * @param {('tpa'|'tpahere')} type The type of TPA request.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {TpaRequest|{error: string, remaining?: number}} The created request or an error object.
 */
export function addRequest(requester, target, type, dependencies) {
    const { config, playerUtils, logManager } = dependencies; // Removed getString
    const now = Date.now();
    const requesterName = requester?.nameTag ?? 'UnknownRequester';
    const targetName = target?.nameTag ?? 'UnknownTarget';

    if (lastPlayerRequestTimestamp.has(requester.nameTag)) { // Use player.name as key for consistency with other maps
        const elapsedTime = now - (lastPlayerRequestTimestamp.get(requester.nameTag) ?? 0);
        const cooldownMs = (config?.tpaRequestCooldownSeconds ?? defaultTpaRequestCooldownSeconds) * 1000;
        if (elapsedTime < cooldownMs) {
            const remainingSeconds = Math.ceil((cooldownMs - elapsedTime) / 1000);
            playerUtils?.debugLog(`[TpaManager.addRequest] Cooldown for ${requesterName}. Remaining: ${remainingSeconds}s`, requesterName, dependencies);
            return { error: 'cooldown', remaining: remainingSeconds };
        }
    }

    const requestId = generateRequestId();
    /** @type {TpaRequest} */
    const request = {
        requestId,
        requesterName: requester.name, // Use system name for internal tracking
        requesterLocation: { ...requester.location },
        requesterDimensionId: requester.dimension.id,
        targetName: target.name, // Use system name
        targetLocation: { ...target.location },
        targetDimensionId: target.dimension.id,
        requestType: type, // 'tpa' or 'tpahere'
        status: 'pendingAcceptance', // Standardized status string
        creationTimestamp: now,
        expiryTimestamp: now + ((config?.tpaRequestTimeoutSeconds ?? defaultTpaRequestTimeoutSeconds) * 1000),
        warmupExpiryTimestamp: 0,
        teleportingPlayerInitialLocation: undefined,
    };

    activeRequests.set(requestId, request);
    lastPlayerRequestTimestamp.set(requester.name, now);
    playerUtils?.debugLog(`[TpaManager.addRequest] Added request ${requestId}: ${requesterName} -> ${targetName}, type: ${type}`, requesterName, dependencies);
    logManager?.addLog({ actionType: 'tpaRequestSent', targetName, adminName: requesterName, details: `Type: ${type}, ID: ${requestId}` }, dependencies);
    return request;
}

/**
 * @param {string} playerAName Name of one player involved.
 * @param {string} [playerBName] Optional name of the other player.
 * @returns {TpaRequest|undefined} The found request, or undefined.
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
        } else { // Only one player name provided, find any request involving them
            if (isRequesterA || isTargetA) {
                return request;
            }
        }
    }
    return undefined;
}

/**
 * @param {string} playerName The system name of the player.
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
 * @param {string} requestId The ID of the request to remove.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if removed, false otherwise.
 */
export function removeRequest(requestId, dependencies) {
    if (activeRequests.has(requestId)) {
        activeRequests.delete(requestId);
        dependencies?.playerUtils?.debugLog(`[TpaManager.removeRequest] Removed request ${requestId}`, null, dependencies);
        return true;
    }
    return false;
}

/**
 * @param {string} requestId The ID of the request to accept.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 * @returns {boolean} True if accepted, false otherwise.
 */
export function acceptRequest(requestId, dependencies) {
    const { config, playerUtils, getString, logManager, mc: minecraftSystem } = dependencies;
    const request = activeRequests.get(requestId);

    if (!request) {
        playerUtils?.debugLog(`[TpaManager.acceptRequest] Non-existent request ID: ${requestId}`, null, dependencies);
        return false;
    }
    if (request.status !== 'pendingAcceptance') {
        playerUtils?.debugLog(`[TpaManager.acceptRequest] Request ${requestId} not pending acceptance (Status: ${request.status})`, null, dependencies);
        return false;
    }

    const requesterPlayer = minecraftSystem?.world?.getPlayer(request.requesterName);
    const targetPlayer = minecraftSystem?.world?.getPlayer(request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlinePlayerName = !requesterPlayer ? request.requesterName : request.targetName;
        const onlinePlayer = requesterPlayer ?? targetPlayer;
        if (onlinePlayer) {
            onlinePlayer.sendMessage(getString('tpa.manager.error.targetOfflineOnAccept', { offlinePlayerName }));
        }
        playerUtils?.debugLog(`[TpaManager.acceptRequest] Player ${offlinePlayerName} offline for request ${requestId}. Cancelling.`, offlinePlayerName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies);
        return false;
    }

    const requestToUpdate = request;
    requestToUpdate.status = 'pendingTeleportWarmup'; // Standardized status string
    requestToUpdate.warmupExpiryTimestamp = Date.now() + ((config?.tpaTeleportWarmupSeconds ?? defaultTpaTeleportWarmupSeconds) * 1000);

    const warmupSeconds = config?.tpaTeleportWarmupSeconds ?? defaultTpaTeleportWarmupSeconds;
    const warmupMsgString = getString('tpa.manager.warmupMessage', { warmupSeconds: warmupSeconds.toString() });

    if (request.requestType === 'tpa') {
        request.teleportingPlayerInitialLocation = { ...requesterPlayer.location };
        requesterPlayer.sendMessage(getString('tpa.manager.requester.accepted', { targetPlayerName: targetPlayer.nameTag, warmupMessage: warmupMsgString }));
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedFromRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupSeconds: warmupSeconds.toString() }));
    } else { // 'tpahere'
        request.teleportingPlayerInitialLocation = { ...targetPlayer.location };
        targetPlayer.sendMessage(getString('tpa.manager.target.acceptedByRequester', { requesterPlayerName: requesterPlayer.nameTag, warmupMessage: warmupMsgString }));
        requesterPlayer.sendMessage(getString('tpa.manager.requester.acceptedHere', { targetPlayerName: targetPlayer.nameTag, warmupSeconds: warmupSeconds.toString() }));
    }
    // No need to activeRequests.set(requestId, request) as request is a reference from the map.
    logManager?.addLog({ actionType: 'tpaRequestAccepted', targetName: targetPlayer.nameTag, adminName: requesterPlayer.nameTag, details: `Type: ${request.requestType}, ID: ${requestId}` }, dependencies);
    playerUtils?.debugLog(`[TpaManager.acceptRequest] Request ${requestId} accepted. Warmup until ${new Date(request.warmupExpiryTimestamp).toLocaleTimeString()}`, targetPlayer.nameTag, dependencies);
    return true;
}

/**
 * @param {string} requestId The ID of the request to execute.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export async function executeTeleport(requestId, dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies;
    const request = activeRequests.get(requestId);

    if (!request) {
        return;
    } // Already processed or cancelled

    if (request.status !== 'pendingTeleportWarmup') {
        playerUtils?.debugLog(`[TpaManager.executeTeleport] Request ${requestId} not in warmup (Status: ${request.status}). Aborting.`, request.requesterName, dependencies);
        if (request.status === 'completed' || request.status === 'cancelled') {
            removeRequest(requestId, dependencies);
        }
        return;
    }

    const requesterPlayer = minecraftSystem?.world?.getPlayer(request.requesterName);
    const targetPlayer = minecraftSystem?.world?.getPlayer(request.targetName);

    if (!requesterPlayer || !targetPlayer) {
        const offlineName = !requesterPlayer ? request.requesterName : request.targetName;
        const onlinePlayer = requesterPlayer ?? targetPlayer;
        const message = getString('tpa.manager.error.teleportTargetOffline', { offlinePlayerName: offlineName });
        if (onlinePlayer) {
            onlinePlayer.sendMessage(message);
        }
        playerUtils?.debugLog(`[TpaManager.executeTeleport] Player ${offlineName} invalid for request ${requestId}. ${message}`, offlineName, dependencies);
        request.status = 'cancelled';
        removeRequest(requestId, dependencies);
        return;
    }

    try {
        if (request.requestType === 'tpa') {
            const targetDimension = minecraftSystem?.world?.getDimension(request.targetDimensionId);
            if (!targetDimension) throw new Error(`Invalid target dimension: ${request.targetDimensionId}`);

            await requesterPlayer.teleport(request.targetLocation, { dimension: targetDimension });
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successToTarget', { targetPlayerName: targetPlayer.nameTag }));
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successTargetNotified', { requesterPlayerName: requesterPlayer.nameTag }));

        } else if (request.requestType === 'tpahere') {
            const requesterDimension = minecraftSystem?.world?.getDimension(request.requesterDimensionId);
            if (!requesterDimension) throw new Error(`Invalid requester dimension: ${request.requesterDimensionId}`);

            await targetPlayer.teleport(request.requesterLocation, { dimension: requesterDimension });
            targetPlayer.sendMessage(getString('tpa.manager.teleport.successToRequester', { requesterPlayerName: requesterPlayer.nameTag }));
            requesterPlayer.sendMessage(getString('tpa.manager.teleport.successRequesterNotified', { targetPlayerName: targetPlayer.nameTag }));
        } else {
            playerUtils?.debugLog(`[TpaManager.executeTeleport] Unknown type: ${request.requestType} for request ${requestId}`, request.requesterName, dependencies);
        }

        request.status = 'completed';
        playerUtils?.debugLog(`[TpaManager.executeTeleport] Request ${requestId} completed successfully.`, request.requesterName, dependencies);

    } catch (e) {
        request.status = 'cancelled';
        logError(`[TpaManager.executeTeleport] Error for request ${requestId}: ${e.stack || e}`, e);
        if (requesterPlayer?.isValid()) {
            requesterPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToRequester'));
        }
        if (targetPlayer?.isValid()) {
            targetPlayer.sendMessage(getString('tpa.manager.error.teleportGenericErrorToTarget', { otherPlayerName: requesterPlayer?.nameTag ?? request.requesterName }));
        }
    } finally {
        logManager?.addLog({
            actionType: 'tpaTeleportFinalized',
            targetName: targetPlayer?.nameTag || request.targetName,
            adminName: requesterPlayer?.nameTag || request.requesterName,
            details: `Status: ${request.status}, Type: ${request.requestType}, ID: ${requestId}`,
        }, dependencies);

        // Now it's safe to remove the request, regardless of outcome.
        removeRequest(requestId, dependencies);
    }
}

/**
 * @param {string} requestId The ID of the request to cancel.
 * @param {string} reasonMessagePlayer The message key to send to players.
 * @param {string} reasonMessageLog The reason to log.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function cancelTeleport(requestId, reasonMessagePlayer, reasonMessageLog, dependencies) {
    const { playerUtils, logManager, getString, mc: minecraftSystem } = dependencies; // getString was already in dependencies, no need to re-destructure
    const request = activeRequests.get(requestId);

    if (!request || request.status === 'cancelled' || request.status === 'completed') {
        return;
    }

    request.status = 'cancelled';
    const requesterPlayer = minecraftSystem?.world?.getPlayer(request.requesterName);
    const targetPlayer = minecraftSystem?.world?.getPlayer(request.targetName);

    const messageToSend = getString(reasonMessagePlayer, { playerName: request.requestType === 'tpa' ? request.requesterName : request.targetName });

    if (requesterPlayer) {
        requesterPlayer.sendMessage(messageToSend);
    }
    if (targetPlayer) {
        targetPlayer.sendMessage(messageToSend);
    }

    playerUtils?.debugLog(`[TpaManager.cancelTeleport] Teleport ${requestId} cancelled: ${reasonMessageLog}`, request.requesterName, dependencies);
    logManager?.addLog({ actionType: 'tpaTeleportCancelled', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `Reason: ${reasonMessageLog}, ID: ${requestId}` }, dependencies);
    removeRequest(requestId, dependencies);
}

/**
 * @param {string} requestId The ID of the request.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function declineRequest(requestId, dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies;
    const request = activeRequests.get(requestId);
    if (!request) {
        return;
    }

    const requesterPlayer = minecraftSystem?.world?.getPlayer(request.requesterName);
    const targetPlayer = minecraftSystem?.world?.getPlayer(request.targetName);
    const targetDisplayName = targetPlayer?.nameTag ?? request.targetName;
    const requesterDisplayName = requesterPlayer?.nameTag ?? request.requesterName;

    if (request.status === 'pendingAcceptance') {
        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString('tpa.manager.decline.requesterNotified', { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString('tpa.manager.decline.targetNotified', { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils?.debugLog(`[TpaManager.declineRequest] Request ${requestId} (${request.requesterName} -> ${request.targetName}) declined.`, targetPlayer?.nameTag || request.targetName, dependencies);
    } else { // Already accepted or other state, treat as general cancel
        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledRequester', { targetPlayerName: targetDisplayName }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString('tpa.manager.decline.otherCancelledTarget', { requesterPlayerName: requesterDisplayName }));
        }
        playerUtils?.debugLog(`[TpaManager.declineRequest] Request ${requestId} (${request.requesterName} -> ${request.targetName}) cancelled (Status: ${request.status}).`, requesterPlayer?.nameTag || request.requesterName, dependencies);
    }

    request.status = 'cancelled';
    logManager?.addLog({ actionType: 'tpaRequestDeclined', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}, Status: ${request.status}` }, dependencies);
    removeRequest(requestId, dependencies);
}

/**
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function clearExpiredRequests(dependencies) {
    const { playerUtils, getString, logManager, mc: minecraftSystem } = dependencies;
    const now = Date.now();
    const requestIdsToExpire = [];

    for (const request of activeRequests.values()) {
        if (request.status === 'pendingAcceptance' && now >= request.expiryTimestamp) {
            requestIdsToExpire.push(request.requestId);
        }
    }

    for (const requestId of requestIdsToExpire) {
        const request = activeRequests.get(requestId);
        if (!request || request.status !== 'pendingAcceptance') {
            continue;
        }

        request.status = 'cancelled'; // Mark as expired
        playerUtils?.debugLog(`[TpaManager.clearExpiredRequests] Request ${request.requestId} (${request.requesterName} -> ${request.targetName}) expired.`, request.requesterName, dependencies);

        const requesterPlayer = minecraftSystem?.world?.getPlayer(request.requesterName);
        const targetPlayer = minecraftSystem?.world?.getPlayer(request.targetName);
        const targetDisplayName = targetPlayer?.nameTag ?? request.targetName;
        const requesterDisplayName = requesterPlayer?.nameTag ?? request.requesterName;

        if (requesterPlayer) {
            requesterPlayer.sendMessage(getString('tpa.manager.expired.requesterNotified', { targetName: targetDisplayName }));
        }
        if (targetPlayer) {
            targetPlayer.sendMessage(getString('tpa.manager.expired.targetNotified', { requesterName: requesterDisplayName }));
        }

        logManager?.addLog({ actionType: 'tpaRequestExpired', targetName: targetPlayer?.nameTag || request.targetName, adminName: requesterPlayer?.nameTag || request.requesterName, details: `ID: ${requestId}` }, dependencies);
        removeRequest(request.requestId, dependencies);
    }
}

/**
 * @param {string} playerName The system name of the player.
 * @returns {PlayerTpaStatus} The player's TPA status.
 */
export function getPlayerTpaStatus(playerName) {
    if (!playerTpaStatuses.has(playerName)) {
        return { playerName, acceptsTpaRequests: true, lastTpaToggleTimestamp: 0 }; // Default to accepting
    }
    return playerTpaStatuses.get(playerName);
}

/**
 * @param {string} playerName The system name of the player.
 * @param {boolean} accepts Whether the player accepts TPA requests.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function setPlayerTpaStatus(playerName, accepts, dependencies) {
    const { playerUtils, logManager } = dependencies;
    /** @type {PlayerTpaStatus} */
    const status = { playerName, acceptsTpaRequests: accepts, lastTpaToggleTimestamp: Date.now() };
    playerTpaStatuses.set(playerName, status);
    playerUtils?.debugLog(`[TpaManager.setPlayerTpaStatus] ${playerName} TPA status set to: ${accepts}`, playerName, dependencies);
    logManager?.addLog({ actionType: 'tpaStatusSet', targetName: playerName, details: `Accepts TPA: ${accepts}` }, dependencies);
}

/**
 * @returns {TpaRequest[]} An array of TPA requests.
 */
export function getRequestsInWarmup() {
    const warmupRequests = [];
    for (const request of activeRequests.values()) {
        if (request.status === 'pendingTeleportWarmup') { // Matched standardized status
            warmupRequests.push(request);
        }
    }
    return warmupRequests;
}

/**
 * @param {TpaRequest} request The TPA request to check.
 * @param {CommandDependencies} dependencies Standard dependencies object.
 */
export function checkPlayerMovementDuringWarmup(request, dependencies) {
    const { config, playerUtils, getString, mc: minecraftSystem } = dependencies;

    if (request.status !== 'pendingTeleportWarmup' || !request.teleportingPlayerInitialLocation) {
        return;
    }

    const teleportingPlayerName = request.requestType === 'tpa' ? request.requesterName : request.targetName;
    const teleportingPlayer = minecraftSystem?.world?.getPlayer(teleportingPlayerName);

    if (!teleportingPlayer) {
        const reasonMsg = getString('tpa.manager.error.teleportWarmupTargetInvalid', { otherPlayerName: teleportingPlayerName });
        const reasonLog = `Teleporting player ${teleportingPlayerName} invalid during warmup for request ${request.requestId}.`;
        cancelTeleport(request.requestId, reasonMsg, reasonLog, dependencies);
        return;
    }

    const movementTolerance = config?.tpaMovementTolerance ?? defaultTpaMovementTolerance;
    const initialLoc = request.teleportingPlayerInitialLocation;
    const currentLoc = teleportingPlayer.location;

    const dx = initialLoc.x - currentLoc.x;
    const dz = initialLoc.z - currentLoc.z;
    // Ignoring Y for now, can add dy * dy if vertical movement should also cancel.
    const distanceSquared = dx * dx + dz * dz;

    if (distanceSquared > movementTolerance * movementTolerance) {
        const teleportingPlayerNameTag = teleportingPlayer.nameTag;
        // Pass teleportingPlayerNameTag to getString for the player-facing message
        const reasonMsgPlayerKey = 'tpa.manager.warmupCancelledMovement.player'; // Assuming this key exists
        const reasonLog = `Player ${teleportingPlayerNameTag} moved ${Math.sqrt(distanceSquared).toFixed(2)} blocks during TPA warmup for request ${request.requestId}.`;

        playerUtils?.debugLog(`[TpaManager.checkPlayerMovementDuringWarmup] Movement for ${teleportingPlayerNameTag}. Cancelling ${request.requestId}.`, teleportingPlayerNameTag, dependencies);
        cancelTeleport(request.requestId, reasonMsgPlayerKey, reasonLog, dependencies); // Pass key to cancelTeleport
    }
}
