/**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import { permissionLevels } from '../core/rankManager.js'; // Standardized import
// No direct mc import needed if types are from JSDoc and dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'freeze',
    syntax: '!freeze <playername> [on|off|toggle|status]',
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness.',
    permissionLevel: permissionLevels.admin, // Use a defined level; ensure 'admin' maps to 1 if that's intended.
                                         // Original was 1. If permissionLevels.admin is not 1, adjust or use direct number.
    enabled: true,
};

/**
 * Executes the !freeze command.
 * Applies or removes a 'frozen' tag and a strong slowness effect to the target player.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> [on|off|toggle|status].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, findPlayer, getString } = dependencies; // Removed unused permissionLevels from here
    const frozenTag = 'frozen'; // Tag to mark frozen players
    const effectDuration = 2000000; // A very long duration for the effect (effectively permanent until removed)
    const slownessAmplifier = 255; // Max slowness to prevent movement

    if (args.length < 1) {
        player.sendMessage(getString('freeze.error.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : 'toggle'; // Default to 'toggle' if no subcommand

    const foundPlayer = findPlayer(targetPlayerName); // findPlayer is from playerUtils passed in dependencies

    if (!foundPlayer) {
        player.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage(getString('freeze.error.selfFreeze'));
        return;
    }

    // Permission check: Ensure command issuer can freeze the target
    // This might involve comparing rankManager.getPlayerPermissionLevel(player) vs rankManager.getPlayerPermissionLevel(foundPlayer)
    // For simplicity, assuming this check is implicitly handled by the command's base permissionLevel for now,
    // or could be added if more granular control is needed (e.g., admin cannot freeze owner).

    let currentFreezeState = foundPlayer.hasTag(frozenTag);
    let targetFreezeState;

    switch (subCommand) {
        case 'on':
            targetFreezeState = true;
            break;
        case 'off':
            targetFreezeState = false;
            break;
        case 'toggle':
            targetFreezeState = !currentFreezeState;
            break;
        case 'status':
            const statusMessage = currentFreezeState ?
                getString('freeze.status.frozen', { playerName: foundPlayer.nameTag }) :
                getString('freeze.status.notFrozen', { playerName: foundPlayer.nameTag });
            player.sendMessage(statusMessage);
            return;
        default:
            player.sendMessage(getString('freeze.error.invalidArg', { validArgs: 'on, off, toggle, status' }));
            return;
    }

    if (targetFreezeState === true && !currentFreezeState) { // Freeze the player
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect('slowness', effectDuration, { amplifier: slownessAmplifier, showParticles: false });
            foundPlayer.sendMessage(getString('freeze.targetNotification.frozen'));
            player.sendMessage(getString('freeze.success.frozen', { playerName: foundPlayer.nameTag }));
            playerUtils.notifyAdmins(getString('freeze.adminNotification.frozen', { targetName: foundPlayer.nameTag, adminName: player.nameTag }), dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player.sendMessage(getString('freeze.error.apply', { playerName: foundPlayer.nameTag, error: e.message }));
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) { // Unfreeze the player
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect('slowness');
            foundPlayer.sendMessage(getString('freeze.targetNotification.unfrozen'));
            player.sendMessage(getString('freeze.success.unfrozen', { playerName: foundPlayer.nameTag }));
            playerUtils.notifyAdmins(getString('freeze.adminNotification.unfrozen', { targetName: foundPlayer.nameTag, adminName: player.nameTag }), dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player.sendMessage(getString('freeze.error.remove', { playerName: foundPlayer.nameTag, error: e.message }));
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else { // No change in state
        player.sendMessage(targetFreezeState ?
            getString('freeze.error.alreadyFrozen', { playerName: foundPlayer.nameTag }) :
            getString('freeze.error.alreadyUnfrozen', { playerName: foundPlayer.nameTag })
        );
    }
}
