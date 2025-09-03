import { system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { getPlayerFromCache } from './playerCache.js';
import { startTeleportWarmup } from './utils.js';

/**
 * @typedef {'tpa' | 'tpahere'} TpaRequestType
 */

/**
 * @typedef {object} TpaRequest
 * @property {string} sourcePlayerId
 * @property {string} sourcePlayerName
 * @property {string} targetPlayerId
 * @property {string} targetPlayerName
 * @property {TpaRequestType} type
 * @property {number} expiryTimestamp
 * @property {number} timeoutId
 */

/** @type {Map<string, TpaRequest>} */
const outgoingRequests = new Map();
/** @type {Map<string, TpaRequest>} */
const incomingRequests = new Map();

/**
 * Clears a TPA request from the system.
 * @param {TpaRequest} request The request to clear.
 */
function clearRequest(request) {
    if (!request) {return;}
    system.clearRun(request.timeoutId);
    outgoingRequests.delete(request.sourcePlayerId);
    incomingRequests.delete(request.targetPlayerId);
}

/**
 * Creates a new TPA request.
 * @param {import('@minecraft/server').Player} sourcePlayer
 * @param {import('@minecraft/server').Player} targetPlayer
 * @param {TpaRequestType} type
 * @returns {{success: boolean, message: string}}
 */
export function createRequest(sourcePlayer, targetPlayer, type) {
    if (outgoingRequests.has(sourcePlayer.id)) {
        return { success: false, message: 'You already have an outgoing TPA request. Use !tpacancel to cancel it.' };
    }
    if (incomingRequests.has(targetPlayer.id)) {
        return { success: false, message: `${targetPlayer.name} already has a pending TPA request.` };
    }

    const config = getConfig();
    const timeoutSeconds = config.tpa.requestTimeoutSeconds;
    const expiryTimestamp = Date.now() + timeoutSeconds * 1000;

    const timeoutId = system.runTimeout(() => {
        const existingRequest = outgoingRequests.get(sourcePlayer.id);
        if (existingRequest && existingRequest.expiryTimestamp <= Date.now()) {
            sourcePlayer.sendMessage('§cYour TPA request has expired.');
            targetPlayer.sendMessage(`§cThe TPA request from ${sourcePlayer.name} has expired.`);
            clearRequest(existingRequest);
        }
    }, timeoutSeconds * 20); // Convert seconds to ticks

    /** @type {TpaRequest} */
    const request = {
        sourcePlayerId: sourcePlayer.id,
        sourcePlayerName: sourcePlayer.name,
        targetPlayerId: targetPlayer.id,
        targetPlayerName: targetPlayer.name,
        type,
        expiryTimestamp,
        timeoutId
    };

    outgoingRequests.set(sourcePlayer.id, request);
    incomingRequests.set(targetPlayer.id, request);

    return { success: true, message: 'TPA request sent.' };
}

/**
 * Gets a player's incoming TPA request.
 * @param {import('@minecraft/server').Player} player
 * @returns {TpaRequest | undefined}
 */
export function getIncomingRequest(player) {
    return incomingRequests.get(player.id);
}

/**
 * Gets a player's outgoing TPA request.
 * @param {import('@minecraft/server').Player} player
 * @returns {TpaRequest | undefined}
 */
export function getOutgoingRequest(player) {
    return outgoingRequests.get(player.id);
}

/**
 * Accepts an incoming TPA request for a player and teleports the relevant party.
 * @param {import('@minecraft/server').Player} player The player accepting the request.
 */
export function acceptRequest(player) {
    const request = getIncomingRequest(player);
    if (!request) {
        player.sendMessage('§cYou have no incoming TPA requests.');
        return;
    }

    const sourcePlayer = getPlayerFromCache(request.sourcePlayerId);
    const targetPlayer = getPlayerFromCache(request.targetPlayerId);

    if (!sourcePlayer || !targetPlayer) {
        player.sendMessage('§cThe other player could not be found. They may have logged off.');
        clearRequest(request);
        return;
    }

    const config = getConfig();
    const warmupSeconds = config.tpa.teleportWarmupSeconds;

    const teleportLogic = () => {
        // Re-fetch players in case they logged off during warmup
        const freshSource = getPlayerFromCache(request.sourcePlayerId);
        const freshTarget = getPlayerFromCache(request.targetPlayerId);

        if (!freshSource || !freshTarget) {
            // One of the players logged off, no need to message them.
            // The utility will have already handled cleanup for the online player.
            return;
        }

        if (request.type === 'tpa') {
            // Source teleports to Target
            freshSource.teleport(freshTarget.location, { dimension: freshTarget.dimension });
            freshSource.sendMessage(`§aTeleported to ${freshTarget.name}.`);
            freshTarget.sendMessage(`§a${freshSource.name} has teleported to you.`);
        } else { // 'tpahere'
            // Target teleports to Source
            freshTarget.teleport(freshSource.location, { dimension: freshSource.dimension });
            freshTarget.sendMessage(`§aTeleported to ${freshSource.name}.`);
            freshSource.sendMessage(`§a${freshTarget.name} has been teleported to you.`);
        }
        clearRequest(request);
    };

    // The new utility handles the warmup, countdown, and movement checks for both players.
    // We need to decide which player "owns" the warmup. For TPA, it's the person moving.
    if (request.type === 'tpa') {
        startTeleportWarmup(sourcePlayer, warmupSeconds, teleportLogic, `TPA to ${targetPlayer.name}`);
        // The utility only messages the player being teleported, so we add a message for the other player.
        targetPlayer.sendMessage(`§a${sourcePlayer.name} is teleporting to you in ${warmupSeconds} seconds.`);
    } else { // 'tpahere'
        startTeleportWarmup(targetPlayer, warmupSeconds, teleportLogic, `TPA from ${sourcePlayer.name}`);
        sourcePlayer.sendMessage(`§a${targetPlayer.name} is teleporting to you in ${warmupSeconds} seconds.`);
    }
}

/**
 * Denies an incoming TPA request for a player.
 * @param {import('@minecraft/server').Player} player The player denying the request.
 */
export function denyRequest(player) {
    const request = getIncomingRequest(player);
    if (!request) {
        player.sendMessage('§cYou have no incoming TPA requests.');
        return;
    }
    const sourcePlayer = getPlayerFromCache(request.sourcePlayerId);
    if (sourcePlayer) {
        sourcePlayer.sendMessage(`§c${player.name} has denied your TPA request.`);
    }
    player.sendMessage('§aYou have denied the TPA request.');
    clearRequest(request);
}

/**
 * Cancels an outgoing TPA request for a player.
 * @param {import('@minecraft/server').Player} player The player canceling the request.
 */
export function cancelRequest(player) {
    const request = getOutgoingRequest(player);
    if (!request) {
        player.sendMessage('§cYou have no outgoing TPA requests.');
        return;
    }
    const targetPlayer = getPlayerFromCache(request.targetPlayerId);
    if (targetPlayer) {
        targetPlayer.sendMessage(`§c${player.name} has canceled their TPA request.`);
    }
    player.sendMessage('§aYou have canceled your TPA request.');
    clearRequest(request);
}
