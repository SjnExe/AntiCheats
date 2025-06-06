// AntiCheatsBP/scripts/commands/tp.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server'; // For dimension objects

/**
 * Parses a dimension string to its corresponding Dimension object.
 * @param {string} dimStr The dimension string (e.g., "overworld", "nether", "end").
 * @param {object} playerUtils Optional player utilities for debug logging.
 * @returns {mc.Dimension | null} The Dimension object or null if invalid.
 */
// Ensure parseDimension is available, moved from commandManager or playerUtils
function parseDimensionLocal(dimStr, playerUtils) {
    if (!dimStr || typeof dimStr !== 'string') return null;
    switch (dimStr.toLowerCase()) {
        case "overworld": return mc.world.overworld;
        case "nether": return mc.world.nether;
        case "end": return mc.world.theEnd;
        default:
            if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`parseDimensionLocal: Invalid dimension string "${dimStr}".`);
            return null;
    }
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "tp",
    syntax: "!tp <target_player | x> [destination_player | y] [z] [dimension]",
    description: "Teleports players or self to coordinates/players.",
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
    // Use findPlayer from dependencies (which itself might be a local fallback in commandManager or from playerUtils)
    const findPlayerFunc = depFindPlayer || (playerUtils && playerUtils.findPlayer);

    if (!findPlayerFunc) {
        player.sendMessage("§cTeleport command error: Player lookup utility not available.");
        console.error("[tpCmd] findPlayer utility is not available in dependencies.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}tp <target_player | x> [destination_player | y] [z] [dimension]. Try ${config.prefix}help tp.`);
        return;
    }

    let playerToMove;
    let destinationLocation;
    let targetDimension;
    let destinationDescription;

    // Syntax 1: !tp <playerToMoveName> <destinationPlayerName>
    if (args.length === 2 && isNaN(parseFloat(args[0])) && isNaN(parseFloat(args[1]))) {
        playerToMove = findPlayerFunc(args[0], playerUtils);
        const destinationPlayer = findPlayerFunc(args[1], playerUtils);
        if (!playerToMove) { player.sendMessage(`§cPlayer to move "${args[0]}" not found.`); return; }
        if (!destinationPlayer) { player.sendMessage(`§cDestination player "${args[1]}" not found.`); return; }
        if (playerToMove.id === destinationPlayer.id) { player.sendMessage(`§7Cannot teleport ${playerToMove.nameTag} to themselves this way.`); return; }
        destinationLocation = destinationPlayer.location;
        targetDimension = destinationPlayer.dimension;
        destinationDescription = `player ${destinationPlayer.nameTag}`;
    }
    // Syntax 2: !tp <x> <y> <z> [dimension] (teleports sender)
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
            if (parsedDim) { targetDimension = parsedDim; destinationDescription += ` in ${args[3].toLowerCase()}`; }
            else { player.sendMessage(`§cInvalid dimension "${args[3]}". Using current.`); }
        }
    }
    // Syntax 3: !tp <playerToMoveName> <x> <y> <z> [dimension]
    else if ((args.length === 4 || args.length === 5) && isNaN(parseFloat(args[0]))) {
        playerToMove = findPlayerFunc(args[0], playerUtils);
        if (!playerToMove) { player.sendMessage(`§cPlayer to move "${args[0]}" not found.`); return; }
        if (isNaN(parseFloat(args[1])) || isNaN(parseFloat(args[2])) || isNaN(parseFloat(args[3]))) { player.sendMessage(`§cInvalid coordinates for player teleport.`); return; }
        destinationLocation = { x: parseFloat(args[1]), y: parseFloat(args[2]), z: parseFloat(args[3]) };
        destinationDescription = `coordinates ${args[1]}, ${args[2]}, ${args[3]}`;
        targetDimension = playerToMove.dimension;
        if (args.length === 5) {
            const parsedDim = parseDimensionLocal(args[4], playerUtils);
            if (parsedDim) { targetDimension = parsedDim; destinationDescription += ` in ${args[4].toLowerCase()}`; }
            else { player.sendMessage(`§cInvalid dimension "${args[4]}". Using ${playerToMove.nameTag}'s current.`);}
        }
    }

    if (!playerToMove || !destinationLocation || !targetDimension) {
        player.sendMessage(`§cInvalid command syntax or arguments. Use ${config.prefix}help tp.`);
        if (playerUtils.debugLog) playerUtils.debugLog(`TP command failed processing for ${player.nameTag}. Args: ${args.join(' ')}`, player.nameTag);
        return;
    }

    try {
        const oldLoc = { x: playerToMove.location.x, y: playerToMove.location.y, z: playerToMove.location.z };
        const oldDim = playerToMove.dimension.id;

        playerToMove.teleport(destinationLocation, { dimension: targetDimension });

        player.sendMessage(`§aSuccessfully teleported ${playerToMove.nameTag} to ${destinationDescription}.`);
        if (player.id !== playerToMove.id) {
            playerToMove.sendMessage(`§7You were teleported by ${player.nameTag} to ${destinationDescription}.`);
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
        player.sendMessage(`§cTeleportation failed: ${e.message || e}`);
        if (playerUtils.debugLog) playerUtils.debugLog(`Teleport error for ${playerToMove.nameTag} (by ${player.nameTag}) to ${destinationDescription}: ${e}`, player.nameTag);
    }
}
