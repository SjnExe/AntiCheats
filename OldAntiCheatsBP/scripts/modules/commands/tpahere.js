// Default configuration values
const defaultTpaRequestTimeoutSeconds = 60;

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'tpahere',
    syntax: '<playerName>',
    description: 'Requests another player to teleport to you.',
    permissionLevel: 1024, // member
};

/**
 * Executes the tpahere command.
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
    if (!dependencies.commandSettings?.tpahere?.enabled) {
        player.sendMessage(getString('command.error.unknownCommand', { prefix, commandName: definition.name }));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString('command.tpahere.usage', { prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage(getString('command.tpahere.cannotSelf'));
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

    const addResult = tpaManager?.addRequest(player, targetPlayer, 'tpahere', dependencies);

    if (addResult && typeof addResult === 'object' && 'error' in addResult) {
        if (addResult.error === 'cooldown' && typeof addResult.remaining === 'number') {
            player.sendMessage(getString('command.tpa.cooldown', { remainingTime: addResult.remaining.toString() }));
        } else {
            player.sendMessage(getString('command.tpahere.error.genericSend'));
            playerUtils?.debugLog(`[TpaHereCommand] Failed to add TPAHere request from ${requesterName} to ${targetPlayer.nameTag}. Result: ${JSON.stringify(addResult)}`, requesterName, dependencies);
        }
    } else if (addResult && typeof addResult === 'object' && 'requestId' in addResult) {
        const request = /** @type {import('../../types.js').TpaRequest} */ (addResult);
        const timeoutSeconds = config?.tpaRequestTimeoutSeconds ?? defaultTpaRequestTimeoutSeconds;
        player.sendMessage(getString('command.tpahere.requestSent', { playerName: targetPlayer.nameTag, timeoutSeconds: timeoutSeconds.toString(), prefix }));

        const actionBarMessage = getString('tpa.notify.actionBar.requestYouToThem', { requestingPlayerName: requesterName, prefix });
        try {
            targetPlayer.onScreenDisplay.setActionBar(actionBarMessage);
        } catch (e) {
            playerUtils?.sendMessage(targetPlayer, actionBarMessage);
            playerUtils?.debugLog(`[TpaHereCommand INFO] Failed to set action bar for TPAHere target ${targetPlayer.nameTag}, sent chat message instead. Error: ${e.message}`, requesterName, dependencies);
        }
        playerUtils?.playSoundForEvent(targetPlayer, 'tpaRequestReceived', dependencies);

        logManager?.addLog({
            actionType: 'tpaHereRequestSent',
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            adminName: requesterName,
            requesterId: player.id,
            details: `TPAHere request sent. ID: ${request.requestId}, Type: ${request.requestType}`,
            context: 'TpaHereCommand.execute',
        }, dependencies);
    } else {
        player.sendMessage(getString('command.tpahere.error.genericSend'));
        playerUtils?.debugLog(`[TpaHereCommand CRITICAL] Unknown error adding TPAHere request from ${requesterName} to ${targetPlayer.nameTag}. AddResult: ${JSON.stringify(addResult)}`, requesterName, dependencies);
    }
}
