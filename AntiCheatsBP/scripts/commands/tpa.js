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
    const { playerUtils, config, tpaManager, logManager, getString } = dependencies;
    const prefix = config.prefix;

    if (!config.enableTPASystem) {
        player.sendMessage(getString('command.tpa.systemDisabled'));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString('command.tpa.usage', { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = playerUtils.findPlayer(targetName);

    if (!target) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString('command.tpa.cannotSelf'));
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

    const requestResult = tpaManager.addRequest(player, target, 'tpa', dependencies);

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(getString('command.tpa.cooldown', { remainingTime: requestResult.remaining.toString() }));
        return;
    }

    if (requestResult) {
        player.sendMessage(getString('command.tpa.requestSent', { playerName: target.nameTag, timeoutSeconds: config.tpaRequestTimeoutSeconds.toString(), prefix: prefix }));

        dependencies.mc.system.run(() => {
            try {
                // Action bar messages are often unique and might not need full externalization if simple, but can be done.
                // For now, keeping this one as is, as it's dynamic and an action bar.
                target.onScreenDisplay.setActionBar(`§e${player.nameTag} has requested to teleport to you. Use ${prefix}tpaccept ${player.nameTag} or ${prefix}tpacancel ${player.nameTag}.`);
            } catch (e) {
                if (config.enableDebugLogging) {
                    playerUtils.debugLog(`[TpaCommand] Failed to set action bar for target ${target.nameTag}: ${e.stack || e}`, player.nameTag, dependencies);
                }
            }
        });
    } else {
        player.sendMessage(getString('command.tpa.error.genericSend'));
        const errorMessage = `TPA requestResult was falsy for ${player.nameTag} -> ${targetName}`;
        playerUtils.debugLog(`[TpaCommand] ${errorMessage}`, player.nameTag, dependencies);
        logManager.addLog({
            actionType: 'errorTpaRequestFailed',
            context: 'tpa.execute',
            details: {
                reason: "TPA requestResult was falsy after call to tpaManager.addRequest.",
                requesterName: player.nameTag,
                targetName: targetName
            }
        }, dependencies);
    }
}
