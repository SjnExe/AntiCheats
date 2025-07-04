/**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import * as mc from '@minecraft/server'; // For mc.MinecraftEffectTypes
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'freeze', // Already camelCase
    syntax: '!freeze <playername> [on|off|toggle|status]',
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness.',
    permissionLevel: permissionLevels.admin, // Assuming permissionLevels is correctly populated
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
    const { config, playerUtils, logManager, getString } = dependencies;
    const adminName = player?.nameTag ?? 'UnknownAdmin';
    const frozenTag = config?.frozenPlayerTag ?? 'frozen'; // Use config or default
    const effectDuration = 2000000; // Very long duration for slowness
    const slownessAmplifier = 255; // Max slowness to effectively immobilize

    if (args.length < 1) {
        player?.sendMessage(getString('command.freeze.usage', { prefix: config?.prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1]?.toLowerCase() || 'toggle'; // Default to 'toggle'

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer) {
        player?.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player?.sendMessage(getString('command.freeze.cannotSelf'));
        return;
    }

    const currentFreezeState = targetPlayer.hasTag(frozenTag);
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
            targetPlayer.addTag(frozenTag);
            targetPlayer.addEffect(mc.MinecraftEffectTypes.slowness, effectDuration, { amplifier: slownessAmplifier, showParticles: false });
            targetPlayer.sendMessage(getString('command.freeze.targetFrozen'));
            player?.sendMessage(getString('command.freeze.success.frozen', { playerName: targetPlayer.nameTag }));
            if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = `§e${adminName}§r froze §e${targetPlayer.nameTag}§r.`;
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
            logManager?.addLog({ adminName, actionType: 'playerFrozen', targetName: targetPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player?.sendMessage(getString('command.freeze.error.apply', { playerName: targetPlayer.nameTag, errorMessage: e.message }));
            playerUtils?.debugLog(`[FreezeCommand.execute] Error freezing ${targetPlayer.nameTag} by ${adminName}: ${e.message}`, adminName, dependencies);
            console.error(`[FreezeCommand.execute] Error freezing ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) { // Unfreeze action
        try {
            targetPlayer.removeTag(frozenTag);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.slowness);
            targetPlayer.sendMessage(getString('command.freeze.targetUnfrozen'));
            player?.sendMessage(getString('command.freeze.success.unfrozen', { playerName: targetPlayer.nameTag }));
            if (dependencies.config.notifications?.notifyOnAdminUtilCommandUsage !== false) {
                const baseNotifyMsg = `§e${adminName}§r unfroze §e${targetPlayer.nameTag}§r.`;
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            }
            logManager?.addLog({ adminName, actionType: 'playerUnfrozen', targetName: targetPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player?.sendMessage(getString('command.freeze.error.remove', { playerName: targetPlayer.nameTag, errorMessage: e.message }));
            playerUtils?.debugLog(`[FreezeCommand.execute] Error unfreezing ${targetPlayer.nameTag} by ${adminName}: ${e.message}`, adminName, dependencies);
            console.error(`[FreezeCommand.execute] Error unfreezing ${targetPlayer.nameTag} by ${adminName}: ${e.stack || e}`);
        }
    } else { // No change in state
        player?.sendMessage(targetFreezeState ?
            getString('command.freeze.alreadyFrozen', { playerName: targetPlayer.nameTag }) :
            getString('command.freeze.alreadyUnfrozen', { playerName: targetPlayer.nameTag })
        );
    }
}
