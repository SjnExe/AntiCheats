/**
/**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import * as mc from '@minecraft/server';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'freeze',
    syntax: '<playername> [on|off|toggle|status]',
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness and weakness.',
    aliases: ['frz'],
    permissionLevel: 1, // admin
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

    const frozenTagName = config?.frozenPlayerTag ?? 'frozen';
    const effectDuration = 2000000;
    const slownessAmplifier = config?.freezeSlownessAmplifier ?? 255;
    const weaknessAmplifier = config?.freezeWeaknessAmplifier ?? 255;
    const showParticles = config?.freezeShowParticles ?? false;

    if (args.length < 1) {
        player?.sendMessage(getString('command.freeze.usage', { prefix: prefix }));
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1]?.toLowerCase() || 'toggle';

    const targetPlayer = playerUtils?.findPlayer(targetPlayerName);

    if (!targetPlayer || !targetPlayer.isValid()) {
        player?.sendMessage(getString('common.error.playerNotFound', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player?.sendMessage(getString('command.freeze.cannotSelf'));
        return;
    }

    const currentFreezeState = targetPlayer.hasTag(frozenTagName);
    let targetFreezeState;

    switch (subCommand) {
        case 'on':
        case 'lock':
            targetFreezeState = true;
            break;
        case 'off':
        case 'unlock':
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

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            targetPlayer.addTag(frozenTagName);
            targetPlayer.addEffect(mc.MinecraftEffectTypes.slowness, effectDuration, { amplifier: slownessAmplifier, showParticles: showParticles });
            targetPlayer.addEffect(mc.MinecraftEffectTypes.weakness, effectDuration, { amplifier: weaknessAmplifier, showParticles: showParticles });

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
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            targetPlayer.removeTag(frozenTagName);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.slowness);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.weakness);

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
    } else {
        player?.sendMessage(targetFreezeState ?
            getString('command.freeze.alreadyFrozen', { playerName: targetPlayer.nameTag }) :
            getString('command.freeze.alreadyUnfrozen', { playerName: targetPlayer.nameTag })
        );
    }
}
