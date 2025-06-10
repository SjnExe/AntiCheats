/**
 * @file AntiCheatsBP/scripts/commands/tp.js
 * Defines the !tp (teleport) command for administrators, allowing teleportation of players
 * to other players or to specific coordinates, potentially across dimensions.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';
import { getString } from '../../core/localizationManager.js'; // Import getString

function parseDimensionLocal(dimStr, playerUtils) {
    if (!dimStr || typeof dimStr !== 'string') return null;
    switch (dimStr.toLowerCase()) {
        case "overworld": return mc.world.overworld;
        case "nether": return mc.world.nether;
        case "end": return mc.world.theEnd;
        case "minecraft:overworld": return mc.world.overworld;
        case "minecraft:the_nether": return mc.world.nether;
        case "minecraft:the_end": return mc.world.theEnd;
        default:
            playerUtils?.debugLog?.(`parseDimensionLocal: Invalid dimension string "${dimStr}".`);
            return null;
    }
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "tp",
    syntax: "!tp <target_player | x> [destination_player | y] [z] [dimension]",
    description: getString("command.tp.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the tp (teleport) command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer: depFindPlayer } = dependencies;
    const findPlayerFunc = depFindPlayer || (playerUtils && playerUtils.findPlayer);
    const prefix = config.prefix; // Assuming prefix is available in config passed through dependencies

    if (!findPlayerFunc) {
        player.sendMessage(getString("command.tp.error.lookupUtilityNotAvailable"));
        console.error("[tpCmd] findPlayer utility is not available in dependencies.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.tp.usage", { prefix: prefix }));
        return;
    }

    let playerToMove;
    let destinationLocation;
    let targetDimension;
    let destinationDescription;
    let dimensionInfoForMessage = "";

    if (args.length === 2 && isNaN(parseFloat(args[0])) && isNaN(parseFloat(args[1]))) {
        playerToMove = findPlayerFunc(args[0], playerUtils);
        const destinationPlayer = findPlayerFunc(args[1], playerUtils);
        if (!playerToMove) { player.sendMessage(getString("command.tp.error.playerToMoveNotFound", { playerName: args[0] })); return; }
        if (!destinationPlayer) { player.sendMessage(getString("command.tp.error.destinationPlayerNotFound", { playerName: args[1] })); return; }
        if (playerToMove.id === destinationPlayer.id) { player.sendMessage(getString("command.tp.error.cannotTeleportToSelf", { playerName: playerToMove.nameTag })); return; }
        destinationLocation = destinationPlayer.location;
        targetDimension = destinationPlayer.dimension;
        destinationDescription = `player ${destinationPlayer.nameTag}`;
        dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
    }
    else if ((args.length === 3 || args.length === 4) &&
             !isNaN(parseFloat(args[0])) && !isNaN(parseFloat(args[1])) && !isNaN(parseFloat(args[2])) &&
             (args.length === 3 || (args.length === 4 && (parseDimensionLocal(args[3], playerUtils) !== null || findPlayerFunc(args[3], playerUtils) === null)))
            ) {
        playerToMove = player;
        destinationLocation = { x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2]) };
        destinationDescription = `coordinates ${args[0]}, ${args[1]}, ${args[2]}`;
        targetDimension = playerToMove.dimension;
        if (args.length === 4) {
            const parsedDim = parseDimensionLocal(args[3], playerUtils);
            if (parsedDim) { targetDimension = parsedDim; dimensionInfoForMessage = getString("command.tp.dimensionIn", { dimensionName: args[3].toLowerCase()}); }
            else { player.sendMessage(getString("command.tp.error.invalidDimension", { dimensionName: args[3] })); }
        } else {
             dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
        destinationDescription += dimensionInfoForMessage;
    }
    else if ((args.length === 4 || args.length === 5) && isNaN(parseFloat(args[0]))) {
        playerToMove = findPlayerFunc(args[0], playerUtils);
        if (!playerToMove) { player.sendMessage(getString("command.tp.error.playerToMoveNotFound", { playerName: args[0] })); return; }
        if (isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2])) || isNaN(parseFloat(args[3]))) { player.sendMessage(getString("command.tp.error.invalidCoordinates")); return; }
        destinationLocation = { x: parseFloat(args[1]), y: parseFloat(args[2]), z: parseFloat(args[3]) };
        destinationDescription = `coordinates ${args[1]}, ${args[2]}, ${args[3]}`;
        targetDimension = playerToMove.dimension;
        if (args.length === 5) {
            const parsedDim = parseDimensionLocal(args[4], playerUtils);
            if (parsedDim) { targetDimension = parsedDim; dimensionInfoForMessage = getString("command.tp.dimensionIn", { dimensionName: args[4].toLowerCase()}); }
            else { player.sendMessage(getString("command.tp.error.invalidDimension", { dimensionName: args[4] })); }
        } else {
            dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
         destinationDescription += dimensionInfoForMessage;
    }

    if (!playerToMove || !destinationLocation || !targetDimension) {
        player.sendMessage(getString("command.tp.usage", { prefix: prefix }));
        playerUtils.debugLog?.(`TP command failed processing for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag);
        return;
    }

    try {
        const oldLoc = { x: playerToMove.location.x, y: playerToMove.location.y, z: playerToMove.location.z };
        const oldDim = playerToMove.dimension.id;

        playerToMove.teleport(destinationLocation, { dimension: targetDimension });

        let successMsg;
        if (destinationDescription.startsWith("player")) { // Player to player
             successMsg = getString("command.tp.success.playerToPlayer", { playerToMoveName: playerToMove.nameTag, destinationPlayerName: destinationDescription.substring(7) }); // Extract name
        } else { // Player to coords
            successMsg = getString("command.tp.success.playerToCoords", { playerToMoveName: playerToMove.nameTag, x: destinationLocation.x.toFixed(1), y: destinationLocation.y.toFixed(1), z: destinationLocation.z.toFixed(1), dimensionId: dimensionInfoForMessage });
        }
        player.sendMessage(successMsg);

        if (player.id !== playerToMove.id) {
            playerToMove.sendMessage(getString("command.tp.notifyTarget.byAdmin", { adminName: player.nameTag, destinationDescription: destinationDescription }));
        }
        if (addLog) {
            addLog({
                timestamp: Date.now(),
                adminName: player.nameTag,
                actionType: 'teleport',
                targetName: playerToMove.nameTag,
                details: `To: ${destinationDescription}. From: ${oldLoc.x.toFixed(1)},${oldLoc.y.toFixed(1)},${oldLoc.z.toFixed(1)} in ${oldDim.split(':')[1]}`
            });
        }
    } catch (e) {
        player.sendMessage(getString("command.tp.error.failed", { errorMessage: (e.message || e) }));
        playerUtils.debugLog?.(`Teleport error for ${playerToMove.nameTag} (by ${player.nameTag}) to ${destinationDescription}: ${e}`, player.nameTag);
    }
}
