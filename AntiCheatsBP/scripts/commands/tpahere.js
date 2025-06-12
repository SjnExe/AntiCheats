/**
 * @file Script for the !tpahere command, allowing players to request another player to teleport to them.
 * @version 1.0.1
 */

import { world, system } from '@minecraft/server';
import * as config from '../config.js'; // Assuming config still exports prefix and TPARequestTimeoutSeconds directly
import * as tpaManager from '../core/tpaManager.js';
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'tpahere',
    description: getString("command.tpahere.description"),
    aliases: ['tpask', 'tph'],
    permissionLevel: permissionLevels.normal,
    syntax: '!tpahere <playerName>',
};

/**
 * Executes the !tpahere command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, config: fullConfig } = dependencies;
    const prefix = fullConfig.prefix;

    if (!fullConfig.enableTPASystem) {
        player.sendMessage(getString("command.tpa.systemDisabled"));
        return;
    }

    if (args.length < 1) {
        player.sendMessage(getString("command.tpahere.usage", { prefix: prefix }));
        return;
    }

    const targetName = args[0];
    const target = world.getAllPlayers().find(p => p.name === targetName);

    if (!target) {
        player.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: targetName }));
        return;
    }

    if (target.name === player.name) {
        player.sendMessage(getString("command.tpahere.error.selfRequest"));
        return;
    }

    const targetTpaStatus = tpaManager.getPlayerTpaStatus(target.name);
    if (!targetTpaStatus.acceptsTpaRequests) {
        player.sendMessage(getString("command.tpa.error.targetDisabled", { targetName: target.nameTag })); // Reusing tpa key
        return;
    }

    const existingRequest = tpaManager.findRequest(player.name, target.name);
    if (existingRequest) {
         player.sendMessage(getString("command.tpa.error.existingRequest", { targetName: target.nameTag })); // Reusing tpa key
         return;
    }

    const requestResult = tpaManager.addRequest(player, target, 'tpahere');

    if (requestResult && requestResult.error === 'cooldown') {
        player.sendMessage(getString("command.tpa.error.cooldown", { remaining: requestResult.remaining })); // Reusing tpa key
        return;
    }

    if (requestResult) {
        player.sendMessage(getString("command.tpahere.requestSent", { targetName: target.nameTag, timeout: fullConfig.TPARequestTimeoutSeconds, prefix: prefix }));

        system.run(() => {
            try {
                target.onScreenDisplay.setActionBar(getString("command.tpahere.requestReceived", { requesterName: player.nameTag, prefix: prefix }));
            } catch (e) {
                playerUtils?.debugLog?.(`[TPAHereCommand] Failed to set action bar for target ${target.nameTag}: ${e}`, player.nameTag);
            }
        });
    } else {
        player.sendMessage(getString("command.tpahere.failToSend"));
    }
}
