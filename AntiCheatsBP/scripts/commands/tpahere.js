/**
 * Script for the !tpahere command, allowing players to request another player to teleport to them.
 */
import * as mc from '@minecraft/server'; // Import mc for system
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpahere',
    description: "command.tpahere.description",
    aliases: ['tpask', 'tph'],
    permissionLevel: importedPermissionLevels.normal,
    syntax: '!tpahere <playerName>',
    enabled: true,
};
/**
 * Executes the !tpahere command.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString('command.tpahere.usage', { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName);

    if (!target) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString('command.tpahere.cannotSelf'));
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(getString('command.tpa.targetNotAccepting', { playerName: target.nameTag }));
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(getString('command.tpa.alreadyActive', { playerName: target.nameTag }));
         return;
    }
    try {
        const requestResult = tpaManager.addRequest(player, target, 'tpahere', dependencies);

        if (requestResult && requestResult.error === 'cooldown') {
            player.sendMessage(getString('command.tpa.cooldown', { remainingTime: requestResult.remaining.toString() }));
            return;
        }

        if (requestResult) {
            player.sendMessage(getString('command.tpahere.requestSent', { playerName: target.nameTag, timeoutSeconds: config.tpaRequestTimeoutSeconds.toString(), prefix: prefix }));

            mc.system.run(() => {
                try {
                    target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested you to teleport to them. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
                } catch (e) {
                    if (config.enableDebugLogging) {
                        playerUtils.debugLog(`[TpaHereCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                    }
                }
            });
        } else {
            player.sendMessage(getString('command.tpahere.error.genericSend'));
            playerUtils.debugLog(`[TpaHereCommand] Failed to send TPAHere request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
            logManager.addLog({actionType: 'error', details: `[TPAHereCommand] TPAHere requestResult was falsy for ${player.nameTag} -> ${targetName}`}, dependencies);
        }
    } catch (error) {
        console.error(`[TpaHereCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString('command.tpacancel.error.generic')); // Reusing a generic error message
        logManager.addLog({actionType: 'error', details: `[TpaHereCommand] ${player.nameTag} error: ${error.stack || error}`}, dependencies);
    }
}
