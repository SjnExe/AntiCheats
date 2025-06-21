/**
 * @file Script for the !tpahere command, allowing players to request another player to teleport to them.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server'; // system is used
// tpaManager, permissionLevels, getString will be from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpahere',
    description: "command.tpahere.description", // Key
    aliases: ['tpask', 'tph'],
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal
    syntax: '!tpahere <playerName>',
    enabled: true, // Will be checked against dependencies.config.enableTPASystem
};

/**
 * Executes the !tpahere command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, permissionLevels, getString, logManager } = dependencies;

    definition.description = getString(definition.description);
    definition.permissionLevel = permissionLevels.normal;

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.tpahere.usage", { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName); // Use playerUtils.findPlayer

    if (!target) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString("command.tpahere.error.selfRequest"));
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies); // Pass dependencies
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(getString("command.tpa.error.targetDisabled", { targetName: target.nameTag }));
        return;
    }

    // findRequest does not require dependencies
    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(getString("command.tpa.error.existingRequest", { targetName: target.nameTag }));
         return;
    }
    try {
        const requestResult = tpaManager.addRequest(player, target, 'tpahere', dependencies); // Pass dependencies

        if (requestResult && requestResult.error === 'cooldown') {
            player.sendMessage(getString("command.tpa.error.cooldown", { remaining: requestResult.remaining }));
            return;
        }

        if (requestResult) {
            player.sendMessage(getString("command.tpahere.requestSent", { targetName: target.nameTag, timeout: config.TPARequestTimeoutSeconds, prefix: prefix }));

            system.run(() => {
                try {
                    target.onScreenDisplay.setActionBar(getString("command.tpahere.requestReceived", { requesterName: player.nameTag, prefix: prefix }));
                } catch (e) {
                    if (config.enableDebugLogging && playerUtils?.debugLog) {
                        playerUtils.debugLog(`[TpaHereCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                    }
                }
            });
        } else {
            player.sendMessage(getString("command.tpahere.failToSend"));
            playerUtils.debugLog(`[TpaHereCommand] Failed to send TPAHere request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
            if(logManager) {
                logManager.addLog({actionType: 'error', details: `[TPAHereCommand] TPAHere requestResult was falsy for ${player.nameTag} -> ${targetName}`});
            }
        }
    } catch (error) {
        console.error(`[TpaHereCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaHereCommand] ${player.nameTag} error: ${error.stack || error}`});
        }
    }
}
