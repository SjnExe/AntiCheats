/**
 * @file Script for the !tpa command, allowing players to request teleportation to another player.
 * @version 1.0.2
 */

import { world, system } from '@minecraft/server';
// Removed direct import of config
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpa',
    description: getString("command.tpa.description"),
    aliases: [],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpa <playerName>',
};

/**
 * Executes the !tpa command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config: fullConfig } = dependencies; // config from dependencies is editableConfigValues, fullConfig is the module
    const prefix = fullConfig.prefix; // Use prefix from the main config module via dependencies

    if (!fullConfig.enableTPASystem) { // Check against the main config module
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.tpa.usage", { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = world.getAllPlayers().find(p => p.name === targetName);

    if (!target) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString("command.tpa.error.selfRequest"));
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(getString("command.tpa.error.targetDisabled", { targetName: target.nameTag }));
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(getString("command.tpa.error.existingRequest", { targetName: target.nameTag }));
         return;
    }

    const requestResult = tpaManager.addRequest(player, target, 'tpa');

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(getString("command.tpa.error.cooldown", { remaining: requestResult.remaining }));
        return;
    }

    if (requestResult) {
        player.sendMessage(getString("command.tpa.requestSent", { targetName: target.nameTag, timeout: fullConfig.TPARequestTimeoutSeconds, prefix: prefix }));

        system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(getString("command.tpa.requestReceived", { requesterName: player.nameTag, prefix: prefix }));
            } catch (e) {
                if (fullConfig.enableDebugLogging && playerUtils?.debugLog) {
                    playerUtils.debugLog(`[TPACommand] Failed to set action bar for target ${target.nameTag}: ${e}`, player.nameTag);
                }
            }
        });

    } else {
        player.sendMessage(getString("command.tpa.failToSend"));
    }
}
