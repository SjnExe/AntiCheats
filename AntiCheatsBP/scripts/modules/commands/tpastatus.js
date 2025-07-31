/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'tpastatus',
    syntax: '[on|off|status]',
    description: 'Manages your TPA request availability (on/off/status).',
    permissionLevel: 1024, // member
};

/**
 * Executes the tpastatus command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    const playerSystemName = player.name;
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpastatus?.enabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix, commandName: definition.name }));
        return;
    }

    const subCommand = args[0]?.toLowerCase() || 'status';

    const currentStatus = tpaManager?.getPlayerTpaStatus(playerSystemName, dependencies);
    let newAcceptsTpa;

    switch (subCommand) {
        case 'on':
        case 'enable':
            newAcceptsTpa = true;
            break;
        case 'off':
        case 'disable':
            newAcceptsTpa = false;
            break;
        case 'status': {
            const statusMsgKey = currentStatus?.acceptsTpaRequests ? 'command.tpastatus.status.accepting' : 'command.tpastatus.status.notAccepting';
            player.sendMessage(getString(statusMsgKey));
            return;
        }
        default:
            player.sendMessage(getString('command.tpastatus.invalidOption', { prefix }));
            return;
    }

    if (newAcceptsTpa === currentStatus?.acceptsTpaRequests) {
        const alreadyMsgKey = newAcceptsTpa ? 'command.tpastatus.status.accepting' : 'command.tpastatus.status.notAccepting';
        player.sendMessage(`${getString(alreadyMsgKey) } (No change made)`);
        return;
    }

    tpaManager?.setPlayerTpaStatus(playerSystemName, newAcceptsTpa, dependencies);
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

    if (newAcceptsTpa) {
        player.sendMessage(getString('command.tpastatus.on'));
    } else {
        player.sendMessage(getString('command.tpastatus.off'));
        const incomingRequests = (tpaManager?.findRequestsForPlayer(playerSystemName) ?? [])
            .filter(r => r.targetName === playerSystemName && r.status === 'pendingAcceptance');
        if (incomingRequests.length > 0) {
            incomingRequests.forEach(req => tpaManager?.declineRequest(req.requestId, dependencies));
            player.sendMessage(getString('command.tpastatus.off.declinedNotification', { count: incomingRequests.length.toString() }));
        }
    }

    logManager?.addLog({
        actionType: 'tpaStatusChanged',
        targetName: playerName,
        targetId: player.id,
        details: `Player set TPA acceptance to: ${newAcceptsTpa}.`,
        context: 'TpaStatusCommand.execute',
    }, dependencies);
}
