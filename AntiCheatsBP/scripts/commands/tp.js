/**
 * Defines the !tp (teleport) command for administrators, allowing teleportation of players
 * to other players or to specific coordinates, potentially across dimensions.
 */
import * as mc from '@minecraft/server';
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels

function parseDimensionLocal(dimStr, playerUtils, dependencies) {
    if (!dimStr || typeof dimStr !== 'string') return null;
    switch (dimStr.toLowerCase()) {
        case "overworld": return mc.world.overworld;
        case "nether": return mc.world.nether;
        case "end": return mc.world.theEnd;
        case "minecraft:overworld": return mc.world.overworld;
        case "minecraft:the_nether": return mc.world.nether;
        case "minecraft:the_end": return mc.world.theEnd;
        default:
            playerUtils.debugLog(`parseDimensionLocal: Invalid dimension string "${dimStr}".`, null, dependencies); // Removed player context for system log
            return null;
    }
}
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "tp",
    syntax: "!tp <target_player | x> [destination_player | y] [z] [dimension]",
    description: "command.tp.description",
    permissionLevel: importedPermissionLevels.admin, // Set directly
    enabled: true,
};
/**
 * Executes the tp (teleport) command.
 */
export async function execute(player, args, dependencies) {
    // Use permissionLevels from dependencies for runtime checks if necessary, definition is set at load.
    const { config, playerUtils, logManager, findPlayer: depFindPlayer, permissionLevels: execPermissionLevels } = dependencies;
    const findPlayerFunc = depFindPlayer || playerUtils.findPlayer;
    const prefix = config.prefix;

    // definition.permissionLevel is now set at module load time.
    // The check `if (definition.permissionLevel === null && permissionLevels)` is no longer needed.

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}tp <target_player | x> [destination_player | y] [z] [dimension]`);
        return;
    }

    let playerToMove;
    let destinationLocation;
    let targetDimension;
    let destinationDescription;
    let dimensionInfoForMessage = "";

    if (args.length === 2 && isNaN(parseFloat(args[0])) && isNaN(parseFloat(args[1]))) {
        playerToMove = findPlayerFunc(args[0]);
        const destinationPlayer = findPlayerFunc(args[1]);
        if (!playerToMove) { player.sendMessage(`§cPlayer to move "${args[0]}" not found.`); return; }
        if (!destinationPlayer) { player.sendMessage(`§cDestination player "${args[1]}" not found.`); return; }
        if (playerToMove.id === destinationPlayer.id) { player.sendMessage(`§cCannot teleport ${playerToMove.nameTag} to themselves.`); return; }
        destinationLocation = destinationPlayer.location;
        targetDimension = destinationPlayer.dimension;
        destinationDescription = `player ${destinationPlayer.nameTag}`;
        dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
    }
    else if ((args.length === 3 || args.length === 4) &&
             !isNaN(parseFloat(args[0])) && !isNaN(parseFloat(args[1])) && !isNaN(parseFloat(args[2])) &&
             (args.length === 3 || (args.length === 4 && (parseDimensionLocal(args[3], playerUtils, dependencies) !== null || findPlayerFunc(args[3]) === null)))
            ) {
        playerToMove = player;
        destinationLocation = { x: parseFloat(args[0]), y: parseFloat(args[1]), z: parseFloat(args[2]) };
        destinationDescription = `coordinates ${args[0]}, ${args[1]}, ${args[2]}`;
        targetDimension = playerToMove.dimension;
        if (args.length === 4) {
            const parsedDim = parseDimensionLocal(args[3], playerUtils, dependencies);
            if (parsedDim) { targetDimension = parsedDim; dimensionInfoForMessage = ` in dimension ${args[3].toLowerCase()}`; }
            else { player.sendMessage(`§cInvalid dimension specified: ${args[3]}.`); return; }
        } else {
             dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
        destinationDescription += dimensionInfoForMessage;
    }
    else if ((args.length === 4 || args.length === 5) && isNaN(parseFloat(args[0]))) {
        playerToMove = findPlayerFunc(args[0]);
        if (!playerToMove) { player.sendMessage(`§cPlayer to move "${args[0]}" not found.`); return; }
        if (isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2])) || isNaN(parseFloat(args[3]))) { player.sendMessage("§cInvalid coordinates provided."); return; }
        destinationLocation = { x: parseFloat(args[1]), y: parseFloat(args[2]), z: parseFloat(args[3]) };
        destinationDescription = `coordinates ${args[1]}, ${args[2]}, ${args[3]}`;
        targetDimension = playerToMove.dimension;
        if (args.length === 5) {
            const parsedDim = parseDimensionLocal(args[4], playerUtils, dependencies);
            if (parsedDim) { targetDimension = parsedDim; dimensionInfoForMessage = ` in dimension ${args[4].toLowerCase()}`; }
            else { player.sendMessage(`§cInvalid dimension specified: ${args[4]}.`); return; }
        } else {
            dimensionInfoForMessage = ` in ${targetDimension.id.split(':')[1]}`;
        }
         destinationDescription += dimensionInfoForMessage;
    }

    if (!playerToMove || !destinationLocation || !targetDimension) {
        player.sendMessage(`§cUsage: ${prefix}tp <target_player | x> [destination_player | y] [z] [dimension]`);
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`TP command failed processing for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag, dependencies);
        }
        return;
    }

    try {
        const oldLoc = { x: playerToMove.location.x, y: playerToMove.location.y, z: playerToMove.location.z };
        const oldDim = playerToMove.dimension.id;

        playerToMove.teleport(destinationLocation, { dimension: targetDimension });

        let successMsg;
        if (destinationDescription.startsWith("player")) {
             successMsg = `§aTeleported ${playerToMove.nameTag} to ${destinationDescription.substring(7)}.`;
        } else {
            successMsg = `§aTeleported ${playerToMove.nameTag} to ${destinationLocation.x.toFixed(1)}, ${destinationLocation.y.toFixed(1)}, ${destinationLocation.z.toFixed(1)}${dimensionInfoForMessage}.`;
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
            details: `To: ${destinationDescription}. From: ${oldLoc.x.toFixed(1)},${oldLoc.y.toFixed(1)},${oldLoc.z.toFixed(1)} in ${oldDim.split(':')[1]}`
        }, dependencies);
    } catch (e) {
        player.sendMessage(`§cTeleport failed: ${(e.message || e)}`);
        if (config.enableDebugLogging) {
            playerUtils.debugLog(`Teleport error for ${playerToMove.nameTag} (by ${player.nameTag}) to ${destinationDescription}: ${e}`, player.nameTag, dependencies);
        }
    }
}
