/**
 * @file Defines the !tpa command for players to request teleporting to another player.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpa',
    syntax: '<playerName>', // Prefix handled by commandManager
    description: 'Requests to teleport to another player. They must accept with !tpaccept.',
    permissionLevel: permissionLevels.member, // Default TPA accessible by members
    enabled: true, // Master toggle for this command, TPA system itself has a global toggle in config.js
};

/**
 * Executes the !tpa command.
 * Initiates a teleport request from the command issuer to a target player.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command (requester).
 * @param {string[]} args - Command arguments: [playerName].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, tpaManager, getString, logManager } = dependencies;
    const requesterName = player?.nameTag ?? 'UnknownPlayer';
    const prefix = config?.prefix ?? '!';

    if (!config?.enableTpaSystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }
    if (!dependencies.commandSettings?.tpa?.enabled) { // Check specific command toggle
        player.sendMessage(getString('command.error.unknownCommand', { prefix: prefix, commandName: definition.name }));
        return;
    }


    if (args.length < 1) {
        player.sendMessage(getString('command.tpa.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) { // Added isValid
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage(getString('command.tpa.cannotSelf'));
        return;
    }

    const targetTpaStatus = tpaManager?.getPlayerTpaStatus(targetPlayer.name, dependencies); // Use system name for status map
    if (!targetTpaStatus?.acceptsTpaRequests) {
        player.sendMessage(getString('command.tpa.targetNotAccepting', { playerName: targetPlayer.nameTag }));
        return;
    }

    // Check if there's already an active request between these two players
    const existingRequest = tpaManager?.findRequest(player.name, targetPlayer.name);
    if (existingRequest && (existingRequest.status === 'pendingAcceptance' || existingRequest.status === 'pendingTeleportWarmup')) {
        player.sendMessage(getString('command.tpa.alreadyActive', { playerName: targetPlayer.nameTag }));
        return;
    }

    const addResult = tpaManager?.addRequest(player, targetPlayer, 'tpa', dependencies);

    if (addResult && typeof addResult === 'object' && 'error' in addResult) {
        if (addResult.error === 'cooldown' && typeof addResult.remaining === 'number') {
            player.sendMessage(getString('command.tpa.cooldown', { remainingTime: addResult.remaining.toString() }));
        } else {
            player.sendMessage(getString('command.tpa.error.genericSend')); // Generic error if specific one not handled
            playerUtils?.debugLog(`[TpaCommand] Failed to add TPA request from ${requesterName} to ${targetPlayer.nameTag}. Result: ${JSON.stringify(addResult)}`, requesterName, dependencies);
        }
    } else if (addResult && typeof addResult === 'object' && 'requestId' in addResult) {
        const request = /** @type {import('../types.js').TpaRequest} */ (addResult);
        const timeoutSeconds = config?.tpaRequestTimeoutSeconds ?? 60;
        player.sendMessage(getString('command.tpa.requestSent', { playerName: targetPlayer.nameTag, timeoutSeconds: timeoutSeconds.toString(), prefix: prefix }));

        // Notify target player via ActionBar
        const actionBarMessage = getString('tpa.notify.actionBar.requestToYou', { requestingPlayerName: requesterName, prefix: prefix });
        try {
            targetPlayer.onScreenDisplay.setActionBar(actionBarMessage);
        } catch (e) {
            // Fallback to chat message if action bar fails (e.g. player in UI)
            playerUtils?.sendMessage(targetPlayer, actionBarMessage);
            playerUtils?.debugLog(`[TpaCommand INFO] Failed to set action bar for TPA target ${targetPlayer.nameTag}, sent chat message instead. Error: ${e.message}`, requesterName, dependencies);
        }
        playerUtils?.playSoundForEvent(targetPlayer, "tpaRequestReceived", dependencies); // Sound for target

        logManager?.addLog({
            actionType: 'tpaRequestSent', // Already camelCase in original
            targetName: targetPlayer.nameTag,
            targetId: targetPlayer.id,
            adminName: requesterName, // Use adminName for requester
            requesterId: player.id,
            details: `TPA request sent. ID: ${request.requestId}, Type: ${request.requestType}`,
            context: 'TpaCommand.execute',
        }, dependencies);
    } else {
        player.sendMessage(getString('command.tpa.error.genericSend'));
        playerUtils?.debugLog(`[TpaCommand CRITICAL] Unknown error adding TPA request from ${requesterName} to ${targetPlayer.nameTag}. AddResult: ${JSON.stringify(addResult)}`, requesterName, dependencies);
    }
}
