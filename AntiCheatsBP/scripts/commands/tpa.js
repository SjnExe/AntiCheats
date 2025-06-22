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
    const { playerUtils, config, tpaManager, permissionLevels, logManager } = dependencies; // getString removed

    // definition.description is static (or resolved by help command if it was a key)
    if (definition.permissionLevel === null) { // Ensure permission level is set if not done by command loader
        definition.permissionLevel = permissionLevels.normal;
    }

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        // "command.tpa.systemDisabled" -> "§cThe TPA system is currently disabled."
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        // "command.tpa.usage" -> "§cUsage: {prefix}tpa <playerName>"
        player.sendMessage(`§cUsage: ${prefix}tpa <playerName>`);
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName);

    if (!target) {
        // "common.error.playerNotFoundOnline" -> "§cPlayer '{playerName}' not found or is not online."
        player.sendMessage(`§cPlayer '${targetName}' not found or is not online.`);
        return;
    }

    if (target.name === player.name) {
        // "command.tpa.error.selfRequest" -> "§cYou cannot send a TPA request to yourself."
        player.sendMessage("§cYou cannot send a TPA request to yourself.");
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies);
    if (!targetTpaStatus.acceptsTpaRequests) {
        // "command.tpa.error.targetDisabled" -> "§cPlayer \"{targetName}\" is not currently accepting TPA requests."
        player.sendMessage(`§cPlayer "${target.nameTag}" is not currently accepting TPA requests.`);
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
        // "command.tpa.error.existingRequest" -> "§cYou already have an active TPA request with \"{targetName}\"."
         player.sendMessage(`§cYou already have an active TPA request with "${target.nameTag}".`);
         return;
    }

    const requestResult = tpaManager.addRequest(player, target, 'tpa', dependencies);

    if (requestResult && requestResult.error === 'cooldown') {
        // "command.tpa.error.cooldown" -> "§cYou must wait {remaining} more seconds before sending another TPA request."
        player.sendMessage(`§cYou must wait ${requestResult.remaining} more seconds before sending another TPA request.`);
        return;
    }

    if (requestResult) {
        // "command.tpa.requestSent" -> "§aTPA request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel."
        player.sendMessage(`§aTPA request sent to "${target.nameTag}". They have ${config.TPARequestTimeoutSeconds} seconds to accept. Type ${prefix}tpacancel to cancel.`);

        system.run(() => {
            try {
                // "command.tpa.requestReceived" -> "§e{requesterName} has requested to teleport to you. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}."
                target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested to teleport to you. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
            } catch (e) {
                if (config.enableDebugLogging && playerUtils?.debugLog) {
                    playerUtils.debugLog(`[TpaCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
        });

    } else {
        // "command.tpa.failToSend" -> "§cCould not send TPA request. There might be an existing request or other issue."
        player.sendMessage("§cCould not send TPA request. There might be an existing request or other issue.");
        playerUtils.debugLog(`[TpaCommand] Failed to send TPA request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaCommand] TPA requestResult was falsy for ${player.nameTag} -> ${targetName}`});
        }
    }
}
