/**
 * @file Defines the !tpahere command for players to request another player to teleport to them.
 */

// Default configuration values
const DEFAULT_TPA_REQUEST_TIMEOUT_SECONDS = 60;

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'tpahere',
    syntax: '<playerName>',
    description: 'Requests another player to teleport to you.',
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !tpahere command.
 * Initiates a teleport request from the command issuer, asking a target player to teleport to the issuer's location.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command (requester).
 * @param {string[]} args - Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
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
    if (existingRequest && (existingRequest.status === 'pendingAcceptance' || existingRequest.status === 'pendingTeleportWarmup')) {
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
        const request = /** @type {import('../types.js').TpaRequest} */ (addResult);
        const timeoutSeconds = config?.tpaRequestTimeoutSeconds ?? DEFAULT_TPA_REQUEST_TIMEOUT_SECONDS;
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
