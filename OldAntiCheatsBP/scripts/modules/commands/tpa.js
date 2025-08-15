const defaultTpaRequestTimeoutSeconds = 60;

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'tpa',
    syntax: '<playerName>',
    description: 'Requests to teleport to another player.',
    permissionLevel: 1024, // member
};

/**
 * Executes the tpa command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const requesterName = player?.nameTag ?? 'UnknownPlayer';
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpa?.enabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix, commandName: definition.name }));
        return;
    }


    if (args.length < 1) {
        player.sendMessage(getString('command.tpa.usage', { prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage(getString('command.tpa.cannotSelf'));
        return;
    }

    const targetTpaStatus = tpaManager?.getPlayerTpaStatus(targetPlayer.name, dependencies);
    if (!targetTpaStatus?.acceptsTpaRequests) {
        player.sendMessage(getString('command.tpa.targetNotAccepting', { playerName: targetPlayer.nameTag }));
        return;
    }

    const existingRequest = tpaManager?.findRequest(player.name, targetPlayer.name);
    if (existingRequest && ['pendingAcceptance', 'pendingTeleportWarmup'].includes(existingRequest.status)) {
        player.sendMessage(getString('command.tpa.alreadyActive', { playerName: targetPlayer.nameTag }));
        return;
    }

    const addResult = tpaManager?.addRequest(player, targetPlayer, 'tpa', dependencies);

    if (addResult && typeof addResult === 'object' && 'error' in addResult) {
        if (addResult.error === 'cooldown' && typeof addResult.remaining === 'number') {
            player.sendMessage(getString('command.tpa.cooldown', { remainingTime: addResult.remaining.toString() }));
        } else {
            player.sendMessage(getString('command.tpa.error.genericSend'));
            playerUtils?.debugLog(`[TpaCommand] Failed to add TPA request from ${requesterName} to ${targetPlayer.nameTag}. Result: ${JSON.stringify(addResult)}`, requesterName, dependencies);
        }
    } else if (addResult && typeof addResult === 'object' && 'requestId' in addResult) {
        const request = /** @type {import('../../types.js').TpaRequest} */ (addResult);
        const timeoutSeconds = config?.tpaRequestTimeoutSeconds ?? defaultTpaRequestTimeoutSeconds;
        player.sendMessage(getString('command.tpa.requestSent', { playerName: targetPlayer.nameTag, timeoutSeconds: timeoutSeconds.toString(), prefix }));

        const actionBarMessage = getString('tpa.notify.actionBar.requestToYou', { requestingPlayerName: requesterName, prefix });
        try {
            targetPlayer.onScreenDisplay.setActionBar(actionBarMessage);
        } catch (e) {
            playerUtils?.sendMessage(targetPlayer, actionBarMessage);
            playerUtils?.debugLog(`[TpaCommand INFO] Failed to set action bar for TPA target ${targetPlayer.nameTag}, sent chat message instead. Error: ${e.message}`, requesterName, dependencies);
        }
        playerUtils?.playSoundForEvent(targetPlayer, 'tpaRequestReceived', dependencies);

        logManager?.addLog({
            actionType: 'tpaRequestSent',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            adminName: requesterName,
            requesterId: player.id,
            details: `TPA request sent. ID: ${request.requestId}, Type: ${request.requestType}`,
            context: 'TpaCommand.execute',
        }, dependencies);
    } else {
        player.sendMessage(getString('command.tpa.error.genericSend'));
        playerUtils?.debugLog(`[TpaCommand CRITICAL] Unknown error adding TPA request from ${requesterName} to ${targetPlayer.nameTag}. AddResult: ${JSON.stringify(addResult)}`, requesterName, dependencies);
    }
}
