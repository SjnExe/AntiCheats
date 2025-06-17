/**
 * @file Script for the !tpa command, allowing players to request teleportation to another player.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server';
// tpaManager, permissionLevels, getString will be from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpa',
    description: "command.tpa.description", // Key
    aliases: [],
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal
    syntax: '!tpa <playerName>',
    enabled: true, // Will be checked against dependencies.config.enableTPASystem
};

/**
 * Executes the !tpa command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config, tpaManager, permissionLevels, getString, logManager } = dependencies;

    definition.description = getString(definition.description);
    definition.permissionLevel = permissionLevels.normal; // Set actual permission level

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.tpa.usage", { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName); // Use playerUtils.findPlayer

    if (!target) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString("command.tpa.error.selfRequest"));
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies); // Pass dependencies
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(getString("command.tpa.error.targetDisabled", { targetName: target.nameTag }));
        return;
    }

    // findRequest does not need dependencies as it's a local lookup
    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(getString("command.tpa.error.existingRequest", { targetName: target.nameTag }));
         return;
    }

    const requestResult = tpaManager.addRequest(player, target, 'tpa', dependencies); // Pass dependencies

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(getString("command.tpa.error.cooldown", { remaining: requestResult.remaining }));
        return;
    }

    if (requestResult) {
        player.sendMessage(getString("command.tpa.requestSent", { targetName: target.nameTag, timeout: config.TPARequestTimeoutSeconds, prefix: prefix }));

        system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(getString("command.tpa.requestReceived", { requesterName: player.nameTag, prefix: prefix }));
            } catch (e) {
                if (config.enableDebugLogging && playerUtils?.debugLog) {
                    playerUtils.debugLog(`[TpaCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag);
                }
            }
        });

    } else {
        player.sendMessage(getString("command.tpa.failToSend"));
        // Log this failure for admins/debug
        playerUtils.debugLog(`[TpaCommand] Failed to send TPA request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag);
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaCommand] TPA requestResult was falsy for ${player.nameTag} -> ${targetName}`});
        }
    }
}
