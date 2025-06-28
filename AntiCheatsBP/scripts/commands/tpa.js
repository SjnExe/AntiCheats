/**
 * Script for the !tpa command, allowing players to request teleportation to another player.
 */
import { permissionLevels as importedPermissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpa',
    description: "command.tpa.description",
    aliases: [],
    permissionLevel: importedPermissionLevels.normal,
    syntax: '!tpa <playerName>',
    enabled: true,
};
/**
 * Executes the !tpa command.
 */
export async function execute(player, args, dependencies) {
    // Use permissionLevels from dependencies for runtime checks if necessary
    const { playerUtils, config, tpaManager, logManager } = dependencies;

    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage("§cThe TPA system is currently disabled.");
        return;
    }

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}tpa <playerName>`);
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName);

    if (!target) {
        player.sendMessage(`§cPlayer '${targetName}' not found or is not online.`);
        return;
    }

    if (target.name === player.name) {
        player.sendMessage("§cYou cannot send a TPA request to yourself.");
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

    const requestResult = tpaManager.addRequest(player, target, 'tpa', dependencies);

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(`§cYou must wait ${requestResult.remaining} more seconds before sending another TPA request.`);
        return;
    }

    if (requestResult) {
        player.sendMessage(`§aTPA request sent to "${target.nameTag}". They have ${config.tpaRequestTimeoutSeconds} seconds to accept. Type ${prefix}tpacancel to cancel.`);

        dependencies.mc.system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested to teleport to you. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
            } catch (e) {
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[TpaCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
        });
    } else {
        player.sendMessage("§cCould not send TPA request. There might be an existing request or other issue.");
        playerUtils.debugLog(`[TpaCommand] Failed to send TPA request from ${player.nameTag} to ${targetName} (requestResult was falsy).`, player.nameTag, dependencies);
        logManager.addLog({actionType: 'error', details: `[TpaCommand] TPA requestResult was falsy for ${player.nameTag} -> ${targetName}`}, dependencies);
    }
}
