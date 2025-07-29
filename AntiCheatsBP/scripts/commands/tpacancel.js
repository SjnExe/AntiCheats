// Defines the !tpacancel command for players to cancel their outgoing TPA requests or decline incoming TPA requests.
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'tpacancel',
    syntax: '[playerName]',
    description: 'Cancels or declines a TPA request.',
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !tpacancel command.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const issuerName = player?.nameTag ?? 'UnknownPlayer';
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpacancel?.enabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix, commandName: definition.name }));
        return;
    }

    const targetPlayerNameArg = args[0];
    let requestToCancel = null;
    let specificPlayerTargeted = false;

    if (targetPlayerNameArg) {
        requestToCancel = tpaManager?.findRequest(player.name, targetPlayerNameArg);
        specificPlayerTargeted = true;
    } else {
        const allRequests = tpaManager?.findRequestsForPlayer(player.name) ?? [];
        requestToCancel = allRequests.find(r => ['pendingAcceptance', 'pendingTeleportWarmup'].includes(r.status));
    }

    if (!requestToCancel) {
        if (specificPlayerTargeted) {
            player.sendMessage(getString('command.tpacancel.specific.notFound', { playerName: targetPlayerNameArg }));
        } else {
            player.sendMessage(getString('command.tpacancel.all.noneFound'));
        }
        return;
    }

    const isDecline = requestToCancel.targetName === player.name && requestToCancel.status === 'pendingAcceptance';

    tpaManager?.declineRequest(requestToCancel.requestId, dependencies);

    const otherPartyNameForMsg = requestToCancel.requesterName === player.name ? requestToCancel.targetName : requestToCancel.requesterName;
    const otherPlayerOnlineForNameTag = playerUtils?.findPlayer(otherPartyNameForMsg);
    const otherPlayerDisplayName = otherPlayerOnlineForNameTag?.nameTag ?? otherPartyNameForMsg;

    player.sendMessage(getString('command.tpacancel.specific.success', { playerName: otherPlayerDisplayName }));
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    logManager?.addLog({
        adminName: issuerName,
        actionType: 'commandTpaCancelExecuted',
        targetName: otherPlayerDisplayName,
        details: `User ${isDecline ? 'declined' : 'cancelled'} TPA request (ID: ${requestToCancel.requestId}) with ${otherPlayerDisplayName}.`,
        context: 'TpaCancelCommand.execute',
    }, dependencies);

}
