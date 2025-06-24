/**
 * @file Defines the !tp (teleport) command for administrators, allowing teleportation of players
 * to other players or to specific coordinates, potentially across dimensions.
 */

import * as mc from '@minecraft/server';
import { permissionLevels } from '../core/rankManager.js';

/**
 * Parses a dimension string and returns the corresponding Dimension object.
 * @param {string | undefined} dimStr The dimension string (e.g., "overworld", "nether", "end").
 * @param {import('../types.js').PlayerUtils} playerUtils For debug logging.
 * @param {import('../types.js').Dependencies} dependencies For debug logging context.
 * @returns {mc.Dimension | null} The Dimension object or null if invalid.
 */
function parseDimensionLocal(dimStr, playerUtils, dependencies) {
    if (!dimStr || typeof dimStr !== 'string') {
        return null;
    }
    const lowerDimStr = dimStr.toLowerCase();
    switch (lowerDimStr) {
        case 'overworld':
        case 'minecraft:overworld':
            return mc.world.overworld;
        case 'nether':
        case 'minecraft:the_nether':
            return mc.world.nether;
        case 'end':
        case 'minecraft:the_end':
            return mc.world.theEnd;
        default:
            playerUtils.debugLog(`[TPCommand] Invalid dimension string: "${dimStr}".`, null, dependencies);
            return null;
    }
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tp',
    syntax: '!tp <targetPlayerOrX> [destinationPlayerOrY] [z] [dimension]', // More descriptive syntax
    description: 'Teleports a player to another player or to coordinates.', // Hardcoded string
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the tp (teleport) command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, findPlayer: depFindPlayer } = dependencies;
    const findPlayerFunc = depFindPlayer || playerUtils.findPlayer; // Use findPlayer from dependencies if available
    const prefix = config.prefix;
    const usageMessage = `§cUsage: ${prefix}tp <targetPlayerOrX> [destinationPlayerOrY] [z] [dimension]`;

    let playerToMove;
    let destinationLocation;
    let targetDimension;
    let destinationDescription = ''; // Initialize to empty string
    let dimensionInfoForMessage = ''; // Initialize to empty string

    // Case 1: !tp <playerToMoveName> <destinationPlayerName>
    if (args.length === 2 && isNaN(parseFloat(args[0])) && isNaN(parseFloat(args[1]))) {
        playerToMove = findPlayerFunc(args[0]);
        const destinationPlayer = findPlayerFunc(args[1]);

        if (!playerToMove) {
            player.sendMessage(`§cPlayer to move "${args[0]}" not found.`);
            return;
        }
        if (!destinationPlayer) {
            player.sendMessage(`§cDestination player "${args[1]}" not found.`);
            return;
        }
        if (playerToMove.id === destinationPlayer.id) {
            player.sendMessage(`§cCannot teleport ${playerToMove.nameTag} to themselves.`);
            return;
        }
        destinationLocation = destinationPlayer.location;
        targetDimension = destinationPlayer.dimension;
        destinationDescription = `player ${destinationPlayer.nameTag}`;
        dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`; // e.g., "in overworld"
    }
    // Case 2: !tp <x> <y> <z> [dimension] (teleport self to coordinates)
    else if (args.length === 3 || args.length === 4) {
        if (isNaN(parseFloat(args[0])) || isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2]))) {
            player.sendMessage(usageMessage);
            playerUtils.debugLog(`[TPCommand] Invalid coordinate arguments for self-teleport by ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
            return;
        }
        playerToMove = player;
        destinationLocation = { x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2]) };
        destinationDescription = `coordinates ${args[0]}, ${args[1]}, ${args[2]}`;
        targetDimension = playerToMove.dimension; // Default to current dimension

        if (args.length === 4) {
            const parsedDim = parseDimensionLocal(args[3], playerUtils, dependencies);
            if (parsedDim) {
                targetDimension = parsedDim;
                dimensionInfoForMessage = ` in dimension ${args[3].toLowerCase()}`;
            } else {
                player.sendMessage(`§cInvalid dimension specified: ${args[3]}. Valid: overworld, nether, end.`);
                return;
            }
        } else {
            dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
        destinationDescription += dimensionInfoForMessage;
    }
    // Case 3: !tp <playerToMoveName> <x> <y> <z> [dimension] (teleport other player to coordinates)
    else if (args.length === 4 || args.length === 5) {
        if (isNaN(parseFloat(args[0]))) { // First arg is player name
             playerToMove = findPlayerFunc(args[0]);
             if (!playerToMove) {
                player.sendMessage(`§cPlayer to move "${args[0]}" not found.`);
                return;
            }
            if (isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2])) || isNaN(parseFloat(args[3]))) {
                player.sendMessage('§cInvalid coordinates provided for target player.');
                return;
            }
            destinationLocation = { x: parseFloat(args[1]), y: parseFloat(args[2]), z: parseFloat(args[3]) };
            destinationDescription = `coordinates ${args[1]}, ${args[2]}, ${args[3]}`;
            targetDimension = playerToMove.dimension; // Default to target player's current dimension

            if (args.length === 5) {
                const parsedDim = parseDimensionLocal(args[4], playerUtils, dependencies);
                if (parsedDim) {
                    targetDimension = parsedDim;
                    dimensionInfoForMessage = ` in dimension ${args[4].toLowerCase()}`;
                } else {
                    player.sendMessage(`§cInvalid dimension specified: ${args[4]}. Valid: overworld, nether, end.`);
                    return;
                }
            } else {
                 dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
            }
            destinationDescription += dimensionInfoForMessage;
        } else {
             player.sendMessage(usageMessage); // If first arg is a number but not matching Case 2
             return;
        }
    }
    // Invalid arguments
    else {
        player.sendMessage(usageMessage);
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`[TPCommand] Invalid argument structure for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
        }
        return;
    }

    // Final check if all necessary variables are set
    if (!playerToMove || !destinationLocation || !targetDimension) {
        player.sendMessage(usageMessage); // Should be caught by earlier checks, but as a safeguard
        playerUtils.debugLog(`[TPCommand] Failed to resolve teleport parameters for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
        return;
    }

    try {
        const oldLoc = { x: playerToMove.location.x, y: playerToMove.location.y, z: playerToMove.location.z };
        const oldDimId = playerToMove.dimension.id;
        const oldDimName = oldDimId.split(':')[1] || oldDimId;

        await playerToMove.teleport(destinationLocation, { dimension: targetDimension });

        let successMsg;
        if (destinationDescription.startsWith('player')) {
            successMsg = `§aTeleported ${playerToMove.nameTag} to ${destinationDescription}.`; // Already includes "player"
        } else {
            // Ensure coordinates are formatted consistently
            const x = destinationLocation.x.toFixed(1);
            const y = destinationLocation.y.toFixed(1);
            const z = destinationLocation.z.toFixed(1);
            successMsg = `§aTeleported ${playerToMove.nameTag} to ${x}, ${y}, ${z}${dimensionInfoForMessage}.`;
        }
        player.sendMessage(successMsg);

        if (player.id !== playerToMove.id) {
            playerToMove.sendMessage(`§eYou have been teleported by ${player.nameTag} to ${destinationDescription}.`);
        }

        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'teleport',
            targetName: playerToMove.nameTag,
            details: `To: ${destinationDescription}. From: ${oldLoc.x.toFixed(1)},${oldLoc.y.toFixed(1)},${oldLoc.z.toFixed(1)} in ${oldDimName}`,
        }, dependencies);

    } catch (error) { // Changed 'e' to 'error'
        player.sendMessage(`§cTeleport failed: ${error.message || error}`);
        console.error(`[TPCommand] Teleport error for ${playerToMove.nameTag} (by ${player.nameTag}) to ${destinationDescription}: ${error.stack || error}`);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'error',
            context: 'TPCommandExecute',
            targetName: playerToMove.nameTag,
            details: `Teleport to ${destinationDescription} failed: ${error.stack || error}`,
        }, dependencies);
    }
}
