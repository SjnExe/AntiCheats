/**
 * Script for the !tpahere command, allowing players to request another player to teleport to them.
 */
import * as mc from '@minecraft/server'; // Import mc for system
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js'; // Import permissionLevels
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpahere',
    description: "command.tpahere.description",
    aliases: ['tpask', 'tph'],
    permissionLevel: importedPermissionLevels.normal, // Set directly
    syntax: '!tpahere <playerName>',
    enabled: true,
};
/**
 * Executes the !tpahere command.
 */
export async function execute(player, args, dependencies) {
    // Use permissionLevels from dependencies for runtime checks if necessary
    const { playerUtils, config, tpaManager, permissionLevels: execPermissionLevels, logManager } = dependencies;

    // definition.permissionLevel is now set at module load time.
    // The check `if (definition.permissionLevel === null)` is no longer needed.

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}tpahere <playerName>`);
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName);

    if (!target) {
        player.sendMessage(`§cPlayer '${targetName}' not found or is not online.`);
        return;
    }

    if (target.name === player.name) {
        player.sendMessage("§cYou cannot send a TPA Here request to yourself.");
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name, dependencies);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(`§cPlayer "${target.nameTag}" is not currently accepting TPA requests.`);
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(`§cYou already have an active TPA request with "${target.nameTag}".`);
         return;
    }
    try {
        const requestResult = tpaManager.addRequest(player, target, 'tpahere', dependencies);

        if (requestResult && requestResult.error === 'cooldown') {
            player.sendMessage(`§cYou must wait ${requestResult.remaining} more seconds before sending another TPA request.`);
            return;
        }

        if (requestResult) {
            player.sendMessage(`§aTPA Here request sent to "${target.nameTag}". They have ${config.tpaRequestTimeoutSeconds} seconds to accept. Type ${prefix}tpacancel to cancel.`);

            mc.system.run(() => { // Use mc.system consistently
                try {
                    target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested you to teleport to them. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
                } catch (e) {
                    if (config.enableDebugLogging) {
                        playerUtils.debugLog(`[TpaHereCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                    }
                }
            });
        } else {
            player.sendMessage("§cCould not send TPA Here request. There might be an existing request or other issue.");
            playerUtils.debugLog(`[TpaHereCommand] Failed to send TPAHere request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
            logManager.addLog({actionType: 'error', details: `[TPAHereCommand] TPAHere requestResult was falsy for ${player.nameTag} -> ${targetName}`}, dependencies);
        }
    } catch (error) {
        console.error(`[TpaHereCommand] Error for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred.");
        logManager.addLog({actionType: 'error', details: `[TpaHereCommand] ${player.nameTag} error: ${error.stack || error}`}, dependencies);
    }
}
