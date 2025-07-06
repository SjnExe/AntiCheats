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
 * @param {import('../types.js').CommandDependencies} dependencies For debug logging context.
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
    description: 'Teleports a player to another player or to coordinates.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the tp (teleport) command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const prefix = config.prefix;
    const usageMessage = getString('command.tp.usage', { prefix: prefix });

    let playerToMove;
    let destinationLocation;
    let targetDimension;
    let destinationDescription = '';
    let dimensionInfoForMessage = '';

    // Case 1: !tp <playerToMoveName> <destinationPlayerName>
    if (args.length === 2 && isNaN(parseFloat(args[0])) && isNaN(parseFloat(args[1]))) {
        playerToMove = playerUtils.findPlayer(args[0]);
        const destinationPlayer = playerUtils.findPlayer(args[1]);

        if (!playerToMove) {
            player.sendMessage(getString('command.tp.playerToMoveNotFound', { playerName: args[0] }));
            return;
        }
        if (!destinationPlayer) {
            player.sendMessage(getString('command.tp.destinationPlayerNotFound', { playerName: args[1] }));
            return;
        }
        if (playerToMove.id === destinationPlayer.id) {
            player.sendMessage(getString('command.tp.cannotTeleportSelfToSelf', { playerName: playerToMove.nameTag }));
            return;
        }
        destinationLocation = destinationPlayer.location;
        targetDimension = destinationPlayer.dimension;
        destinationDescription = `player ${destinationPlayer.nameTag}`; // This part might remain hardcoded if too dynamic for simple getString
        dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
    }
    // Case 2: !tp <x> <y> <z> [dimension] (teleport self to coordinates)
    else if (args.length === 3 || args.length === 4) {
        if (isNaN(parseFloat(args[0])) || isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2]))) {
            player.sendMessage(usageMessage); // Usage message implies invalid coords here
            playerUtils.debugLog(`[TPCommand] Invalid coordinate arguments for self-teleport by ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
            return;
        }
        playerToMove = player;
        destinationLocation = { x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2]) };
        destinationDescription = `coordinates ${args[0]}, ${args[1]}, ${args[2]}`; // Similar to above, might remain
        targetDimension = playerToMove.dimension;

        if (args.length === 4) {
            const parsedDim = parseDimensionLocal(args[3], playerUtils, dependencies);
            if (parsedDim) {
                targetDimension = parsedDim;
                dimensionInfoForMessage = ` in dimension ${args[3].toLowerCase()}`;
            } else {
                player.sendMessage(getString('command.tp.invalidDimension', { dimensionName: args[3] }));
                return;
            }
        } else {
            dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
        destinationDescription += dimensionInfoForMessage;
    }
    // Case 3: !tp <playerToMoveName> <x> <y> <z> [dimension] (teleport other player to coordinates)
    else if (args.length === 4 || args.length === 5) {
        if (isNaN(parseFloat(args[0]))) {
             playerToMove = playerUtils.findPlayer(args[0]);
             if (!playerToMove) {
                player.sendMessage(getString('command.tp.playerToMoveNotFound', { playerName: args[0] }));
                return;
            }
            if (isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2])) || isNaN(parseFloat(args[3]))) {
                player.sendMessage(getString('command.tp.invalidCoordinatesForTarget'));
                return;
            }
            destinationLocation = { x: parseFloat(args[1]), y: parseFloat(args[2]), z: parseFloat(args[3]) };
            destinationDescription = `coordinates ${args[1]}, ${args[2]}, ${args[3]}`;
            targetDimension = playerToMove.dimension;

            if (args.length === 5) {
                const parsedDim = parseDimensionLocal(args[4], playerUtils, dependencies);
                if (parsedDim) {
                    targetDimension = parsedDim;
                    dimensionInfoForMessage = ` in dimension ${args[4].toLowerCase()}`;
                } else {
                    player.sendMessage(getString('command.tp.invalidDimension', { dimensionName: args[4] }));
                    return;
                }
            } else {
                 dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
            }
            destinationDescription += dimensionInfoForMessage;
        } else {
             player.sendMessage(usageMessage);
             return;
        }
    }
    else {
        player.sendMessage(usageMessage);
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`[TPCommand] Invalid argument structure for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
        }
        return;
    }

    if (!playerToMove || !destinationLocation || !targetDimension) {
        player.sendMessage(getString('command.tp.failedResolveParams'));
        playerUtils.debugLog(`[TPCommand] Failed to resolve teleport parameters for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
        return;
    }

    try {
        const oldLoc = { x: playerToMove.location.x, y: playerToMove.location.y, z: playerToMove.location.z };
        const oldDimId = playerToMove.dimension.id;
        const oldDimName = oldDimId.split(':')[1] || oldDimId;

        await playerToMove.teleport(destinationLocation, { dimension: targetDimension });

        let successMsg;
        if (destinationDescription.startsWith('player')) { // Destination desc like "player PlayerName"
            successMsg = getString('command.tp.success.toPlayer', { playerToMoveName: playerToMove.nameTag, destinationPlayerName: destinationDescription.substring(7) }); // Extract player name
        } else { // Destination desc like "coordinates X, Y, Z in dimension_name"
            const x = destinationLocation.x.toFixed(1);
            const y = destinationLocation.y.toFixed(1);
            const z = destinationLocation.z.toFixed(1);
            successMsg = getString('command.tp.success.toCoords', { playerToMoveName: playerToMove.nameTag, x, y, z, dimensionInfo: dimensionInfoForMessage });
        }
        player.sendMessage(successMsg);

        if (player.id !== playerToMove.id) {
            // The destinationDescription is already quite descriptive
            playerToMove.sendMessage(getString('command.tp.targetNotification', { adminName: player.nameTag, destinationDescription: destinationDescription }));
        }

        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'teleport',
            targetName: playerToMove.nameTag,
            details: `To: ${destinationDescription}. From: ${oldLoc.x.toFixed(1)},${oldLoc.y.toFixed(1)},${oldLoc.z.toFixed(1)} in ${oldDimName}`,
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.tp.fail', { errorMessage: error.message || String(error) }));
        console.error(`[TPCommand] Teleport error for ${playerToMove.nameTag} (by ${player.nameTag}) to ${destinationDescription}: ${error.stack || error}`);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'errorTpCommand', // More specific
            context: 'TPCommand.execute', // Consistent casing
            targetName: playerToMove.nameTag,
            details: `Teleport to ${destinationDescription} failed: ${error.stack || error}`,
        }, dependencies);
    }
}
