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
    const { playerUtils, config, tpaManager, permissionLevels, logManager } = dependencies; // getString removed

    // definition.description is static (or resolved by help command if it was a key)
    if (definition.permissionLevel === null) {
        definition.permissionLevel = permissionLevels.normal;
    }

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        // "command.tpa.systemDisabled" -> "§cThe TPA system is currently disabled."
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        // "command.tpahere.usage" -> "§cUsage: {prefix}tpahere <playerName>"
        player.sendMessage(`§cUsage: ${prefix}tpahere <playerName>`);
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
        // "command.tpahere.error.selfRequest" -> "§cYou cannot send a TPA Here request to yourself."
        player.sendMessage("§cYou cannot send a TPA Here request to yourself.");
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies);
    if (!targetTpaStatus.acceptsTpaRequests) {
        // "command.tpa.error.targetDisabled" (reused) -> "§cPlayer \"{targetName}\" is not currently accepting TPA requests."
        player.sendMessage(`§cPlayer "${target.nameTag}" is not currently accepting TPA requests.`);
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
        // "command.tpa.error.existingRequest" (reused) -> "§cYou already have an active TPA request with \"{targetName}\"."
         player.sendMessage(`§cYou already have an active TPA request with "${target.nameTag}".`);
         return;
    }
    try {
        const requestResult = tpaManager.addRequest(player, target, 'tpahere', dependencies);

        if (requestResult && requestResult.error === 'cooldown') {
            // "command.tpa.error.cooldown" (reused) -> "§cYou must wait {remaining} more seconds before sending another TPA request."
            player.sendMessage(`§cYou must wait ${requestResult.remaining} more seconds before sending another TPA request.`);
            return;
        }

        if (requestResult) {
            // "command.tpahere.requestSent" -> "§aTPA Here request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel."
            player.sendMessage(`§aTPA Here request sent to "${target.nameTag}". They have ${config.TPARequestTimeoutSeconds} seconds to accept. Type ${prefix}tpacancel to cancel.`);

            system.run(() => {
                try {
                    // "command.tpahere.requestReceived" -> "§e{requesterName} has requested you to teleport to them. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}."
                    target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested you to teleport to them. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
                } catch (e) {
                    if (config.enableDebugLogging && playerUtils?.debugLog) {
                        playerUtils.debugLog(`[TpaHereCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                    }
                }
            });
        } else {
            // "command.tpahere.failToSend" -> "§cCould not send TPA Here request. There might be an existing request or other issue."
            player.sendMessage("§cCould not send TPA Here request. There might be an existing request or other issue.");
            playerUtils.debugLog(`[TpaHereCommand] Failed to send TPAHere request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
            if(logManager) {
                logManager.addLog({actionType: 'error', details: `[TPAHereCommand] TPAHere requestResult was falsy for ${player.nameTag} -> ${targetName}`});
            }
        }
    } catch (error) {
        console.error(`[TpaHereCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        // "common.error.generic" -> "§cAn unexpected error occurred."
        player.sendMessage("§cAn unexpected error occurred.");
        if(logManager) {
            logManager.addLog({actionType: 'error', details: `[TpaHereCommand] ${player.nameTag} error: ${error.stack || error}`});
        }
    }
}
