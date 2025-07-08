/**
 * @file Defines the !tpaccept command for players to accept incoming TPA requests.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'tpaccept',
    syntax: '[playerName]',
    description: 'Accepts an incoming TPA request. If multiple, specify which player\'s request to accept.',
    aliases: ['tpaa', 'tpaaccept'],
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !tpaccept command.
 * Allows a player to accept a pending TPA request made to them.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command (the one accepting).
 * @param {string[]} args - Command arguments: [playerName] (optional, name of player whose request to accept).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const acceptorName = player?.nameTag ?? 'UnknownPlayer';
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpaccept?.enabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix, commandName: definition.name }));
        return;
    }

    const targetRequesterNameArg = args[0];
    let requestToAccept = null;

    const incomingRequests = (tpaManager?.findRequestsForPlayer(player.name) ?? [])
        .filter(r => r.targetName === player.name && r.status === 'pendingAcceptance');

    if (incomingRequests.length === 0) {
        player.sendMessage(getString('command.tpaccept.noPending'));
        return;
    }

    if (targetRequesterNameArg) {
        const lowerTargetRequesterName = targetRequesterNameArg.toLowerCase();
        requestToAccept = incomingRequests.find(r => {
            const requesterOnline = playerUtils?.findPlayer(r.requesterName);
            return (requesterOnline?.nameTag?.toLowerCase() === lowerTargetRequesterName) || (r.requesterName.toLowerCase() === lowerTargetRequesterName);
        });
        if (!requestToAccept) {
            player.sendMessage(getString('command.tpaccept.noRequestFromPlayer', { playerName: targetRequesterNameArg }));
            return;
        }
    } else if (incomingRequests.length === 1) {
        requestToAccept = incomingRequests[0];
    } else {
        const requesterNames = incomingRequests.map(r => {
            const reqOnline = playerUtils?.findPlayer(r.requesterName);
            return reqOnline?.nameTag ?? r.requesterName;
        }).join(', ');
        player.sendMessage(getString('command.tpaccept.pendingFrom', { playerNames: requesterNames }));
        player.sendMessage(getString('command.tpaccept.usage', { prefix }));
        return;
    }

    if (!requestToAccept) {
        player.sendMessage(getString('command.tpaccept.couldNotFind'));
        return;
    }

    const success = await tpaManager?.acceptRequest(requestToAccept.requestId, dependencies);

    if (success) {
        playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

        logManager?.addLog({
            adminName: acceptorName,
            actionType: 'commandTpaAcceptExecuted',
            targetName: requestToAccept.requesterName,
            details: `User accepted TPA request (ID: ${requestToAccept.requestId}) from ${requestToAccept.requesterName}.`,
            context: 'TpaAcceptCommand.execute',
        }, dependencies);
    } else {
        player.sendMessage(getString('command.tpaccept.failure', { playerName: requestToAccept.requesterName }));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
    }
}
