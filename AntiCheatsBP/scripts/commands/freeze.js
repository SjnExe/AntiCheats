/**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import * as mc from '@minecraft/server'; // For mc.MinecraftEffectTypes
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'freeze',
    syntax: '<playername> [on|off|toggle|status]', // Prefix handled by commandManager
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness and weakness.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the !freeze command.
 * Applies or removes a 'frozen' tag and strong slowness/weakness effects to the target player.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: <playername> [on|off|toggle|status].
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const prefix = config?.prefix ?? '!';

    // Configurable values for freeze effects
    const frozenTagName = config?.frozenPlayerTag ?? 'frozen'; // Tag to apply
    const effectDuration = 2000000; // Effectively infinite duration for game purposes
    const slownessAmplifier = config?.freezeSlownessAmplifier ?? 255; // Max slowness
    const weaknessAmplifier = config?.freezeWeaknessAmplifier ?? 255; // Max weakness (prevents breaking blocks effectively)
    const showParticles = config?.freezeShowParticles ?? false; // Whether effects show particles

    if (args.length < 1) {
        player?.sendMessage(getString('command.freeze.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1]?.toLowerCase() || 'toggle'; // Default to 'toggle'

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) { // Added isValid check
        player?.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player?.sendMessage(getString('command.freeze.cannotSelf'));
        return;
    }

    const currentFreezeState = targetPlayer.hasTag(frozenTagName);
    let targetFreezeState; // true to freeze, false to unfreeze

    switch (subCommand) {
        case 'on':
        case 'lock': // Alias for 'on'
            targetFreezeState = true;
            break;
        case 'off':
        case 'unlock': // Alias for 'off'
            targetFreezeState = false;
            break;
        case 'toggle':
            targetFreezeState = !currentFreezeState;
            break;
        case 'status':
            const statusMessage = currentFreezeState ?
                getString('command.freeze.status.isFrozen', { playerName: targetPlayer.nameTag }) :
                getString('command.freeze.status.notFrozen', { playerName: targetPlayer.nameTag });
            player?.sendMessage(statusMessage);
            return;
        default:
            player?.sendMessage(getString('command.freeze.invalidArg'));
            return;
    }

    if (targetFreezeState === true && !currentFreezeState) { // Freeze action
        try {
            targetPlayer.addTag(frozenTagName);
            targetPlayer.addEffect(mc.MinecraftEffectTypes.slowness, effectDuration, { amplifier: slownessAmplifier, showParticles: showParticles });
            targetPlayer.addEffect(mc.MinecraftEffectTypes.weakness, effectDuration, { amplifier: weaknessAmplifier, showParticles: showParticles });
            // Optional: Could add Jump Boost with negative amplifier if API supports it for more immobility.

            targetPlayer.sendMessage(getString('command.freeze.targetFrozen'));
            player?.sendMessage(getString('command.freeze.success.frozen', { playerName: targetPlayer.nameTag }));
            playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

            if (config?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = getString('command.freeze.notify.froze', { adminName: adminName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
            logManager?.addLog({ adminName, actionType: 'playerFrozen', targetName: targetPlayer.nameTag, targetId: targetPlayer.id, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player?.sendMessage(getString('command.freeze.error.apply', { playerName: targetPlayer.nameTag, errorMessage: e.message }));
            playerUtils?.debugLog(`[FreezeCommand CRITICAL] Error freezing ${targetPlayer.nameTag} by ${adminName}: ${e.message}`, adminName, dependencies);
            console.error(`[FreezeCommand CRITICAL] Error freezing ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
            playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        }
    } else if (targetFreezeState === false && currentFreezeState) { // Unfreeze action
        try {
            targetPlayer.removeTag(frozenTagName);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.slowness);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.weakness);
            // Remove other effects if added by freeze

            targetPlayer.sendMessage(getString('command.freeze.targetUnfrozen'));
            player?.sendMessage(getString('command.freeze.success.unfrozen', { playerName: targetPlayer.nameTag }));
            playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

            if (config?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = getString('command.freeze.notify.unfroze', { adminName: adminName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
            logManager?.addLog({ adminName, actionType: 'playerUnfrozen', targetName: targetPlayer.nameTag, targetId: targetPlayer.id, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player?.sendMessage(getString('command.freeze.error.remove', { playerName: targetPlayer.nameTag, errorMessage: e.message }));
            playerUtils?.debugLog(`[FreezeCommand CRITICAL] Error unfreezing ${targetPlayer.nameTag} by ${adminName}: ${e.message}`, adminName, dependencies);
            console.error(`[FreezeCommand CRITICAL] Error unfreezing ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
            playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        }
    } else { // No change in state
        player?.sendMessage(targetFreezeState ?
            getString('command.freeze.alreadyFrozen', { playerName: targetPlayer.nameTag }) :
            getString('command.freeze.alreadyUnfrozen', { playerName: targetPlayer.nameTag })
        );
    }
}
