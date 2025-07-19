// Defines the !tp command for administrators to teleport players or themselves.
import * as mc from '@minecraft/server';

// Argument count/index constants for command parsing
const minArgsSelfTpCoords = 3;
const argsIndexSelfTpDimension = 3;
const minArgsSelfTpCoordsWithDim = 4;

const minArgsPlayerTpCoords = 4;
const argsIndexPlayerTpDimension = 4;
const minArgsPlayerTpCoordsWithDim = 5;


/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'tp',
    syntax: '<targetPlayerNameToMove> [destinationPlayerNameOrX] [y] [z] [dimensionId]',
    description: 'Teleports a player to another player or to specified coordinates.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Parses dimension ID string to a valid Minecraft Dimension object.
 * @param {string | undefined} dimensionId - The dimension ID string (e.g., "overworld", "nether", "the_end").
 * @param {import('@minecraft/server').Player} currentPlayer - The player whose dimension to use as default if string is invalid/undefined.
 * @param {import('../types.js').Dependencies} dependencies - For logging.
 * @returns {import('@minecraft/server').Dimension | undefined} The Dimension object or undefined if invalid.
 */
function parseDimension(dimensionId, currentPlayer, dependencies) {
    const { playerUtils } = dependencies;
    if (!dimensionId) {
        return currentPlayer.dimension;
    }
    const lowerDimId = dimensionId.toLowerCase().replace('minecraft:', '');
    switch (lowerDimId) {
    case 'overworld':
        return mc.world.getDimension(mc.DimensionTypes.overworld.id);
    case 'nether':
        return mc.world.getDimension(mc.DimensionTypes.nether.id);
    case 'the_end':
        return mc.world.getDimension(mc.DimensionTypes.theEnd.id);
    default:
        playerUtils?.debugLog(`[TPCommand.parseDimension] Invalid dimension string: ${dimensionId}`, currentPlayer.nameTag, dependencies);
        return undefined;
    }
}

/**
 * Executes the !tp command.
 * Handles teleporting a player to another player or to specific coordinates.
 * Syntax examples:
 * !tp PlayerToMove TargetPlayerDestination
 * !tp PlayerToMove X Y Z [Dimension]
 * !tp X Y Z [Dimension] (teleports self)
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments.
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(getString('command.tp.usage', { prefix }));
        return;
    }

    let playerToMove = null;
    let destinationPlayer = null;
    let x, y, z, targetDimension;
    let isTeleportToPlayer = false;

    if (args.length === 1 || (args.length >= minArgsSelfTpCoords && !isNaN(parseFloat(args[0])))) {
        if (args.length === 1 && isNaN(parseFloat(args[0]))) {
            playerToMove = player;
            destinationPlayer = playerUtils?.findPlayer(args[0]);
            if (!destinationPlayer || !destinationPlayer.isValid()) {
                player.sendMessage(getString('command.tp.destinationPlayerNotFound', { playerName: args[0] }));
                return;
            }
            isTeleportToPlayer = true;
        } else {
            playerToMove = player;
            x = parseFloat(args[0]);
            y = parseFloat(args[1]);
            z = parseFloat(args[2]);
            targetDimension = parseDimension(args[argsIndexSelfTpDimension], player, dependencies);
            if (args.length >= minArgsSelfTpCoordsWithDim && !targetDimension) {
                player.sendMessage(getString('command.tp.invalidDimension', { dimensionName: args[argsIndexSelfTpDimension] }));
                return;
            }
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage(getString('command.tp.invalidCoordinatesArgs'));
                return;
            }
        }
    } else if (args.length >= 2) {
        playerToMove = playerUtils?.findPlayer(args[0]);
        if (!playerToMove || !playerToMove.isValid()) {
            player.sendMessage(getString('command.tp.playerToMoveNotFound', { playerName: args[0] }));
            return;
        }

        if (args.length === 2 && isNaN(parseFloat(args[1]))) {
            destinationPlayer = playerUtils?.findPlayer(args[1]);
            if (!destinationPlayer || !destinationPlayer.isValid()) {
                player.sendMessage(getString('command.tp.destinationPlayerNotFound', { playerName: args[1] }));
                return;
            }
            isTeleportToPlayer = true;
        } else if (args.length >= minArgsPlayerTpCoords && !isNaN(parseFloat(args[1]))) {
            x = parseFloat(args[1]);
            y = parseFloat(args[2]);
            z = parseFloat(args[3]);
            targetDimension = parseDimension(args[argsIndexPlayerTpDimension], playerToMove, dependencies);
            if (args.length >= minArgsPlayerTpCoordsWithDim && !targetDimension) {
                player.sendMessage(getString('command.tp.invalidDimension', { dimensionName: args[argsIndexPlayerTpDimension] }));
                return;
            }
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage(getString('command.tp.invalidCoordinatesForTarget'));
                return;
            }
        } else {
            player.sendMessage(getString('command.tp.usage', { prefix }));
            return;
        }
    } else {
        player.sendMessage(getString('command.tp.usage', { prefix }));
        return;
    }

    if (!playerToMove) {
        player.sendMessage(getString('command.tp.failedResolveParams'));
        return;
    }

    let finalLocation;
    let finalDimension;
    let destinationDescription;

    if (isTeleportToPlayer) {
        if (!destinationPlayer || !destinationPlayer.isValid()) {
            player.sendMessage(getString('command.tp.failedResolveParams'));
            return;
        }
        if (playerToMove.id === destinationPlayer.id) {
            player.sendMessage(getString('command.tp.cannotTeleportSelfToSelf', { playerName: playerToMove.nameTag }));
            return;
        }
        finalLocation = destinationPlayer.location;
        finalDimension = destinationPlayer.dimension;
        destinationDescription = destinationPlayer.nameTag;
    } else {
        finalLocation = { x, y, z };
        finalDimension = targetDimension || playerToMove.dimension;
        destinationDescription = `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)} in ${finalDimension.id.replace('minecraft:', '')}`;
    }

    try {
        await playerToMove.teleport(finalLocation, { dimension: finalDimension });

        const successMessage = isTeleportToPlayer
            ? getString('command.tp.success.toPlayer', { playerToMoveName: playerToMove.nameTag, destinationPlayerName: destinationPlayer.nameTag })
            : getString('command.tp.success.toCoords', { playerToMoveName: playerToMove.nameTag, x: x.toFixed(1), y: y.toFixed(1), z: z.toFixed(1), dimensionInfo: (targetDimension ? ` in ${targetDimension.id.replace('minecraft:', '')}` : '') });
        player.sendMessage(successMessage);
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        if (playerToMove.id !== player.id) {
            playerToMove.sendMessage(getString('command.tp.targetNotification', { adminName, destinationDescription }));
        }

        logManager?.addLog({
            adminName,
            actionType: 'playerTeleported',
            targetName: playerToMove.nameTag,
            targetId: playerToMove.id,
            details: `Teleported ${playerToMove.nameTag} to ${destinationDescription} by ${adminName}.`,
            location: finalLocation,
            dimensionId: finalDimension.id,
        }, dependencies);

    } catch (error) {
        player.sendMessage(getString('command.tp.fail', { errorMessage: error.message }));
        console.error(`[TPCommand CRITICAL] Error teleporting ${playerToMove.nameTag} by ${adminName}: ${error.stack || error}`);
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            adminName,
            actionType: 'errorTeleportCommand',
            context: 'TPCommand.execute',
            targetName: playerToMove.nameTag,
            targetId: playerToMove.id,
            details: `Failed to teleport ${playerToMove.nameTag} to ${destinationDescription}: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
