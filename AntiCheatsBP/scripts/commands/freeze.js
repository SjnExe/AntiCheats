/**
 * /**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import * as mc from '@minecraft/server';

// Default configuration values
const DEFAULT_FREEZE_EFFECT_DURATION = 2000000; // Very long duration for effects
const DEFAULT_FREEZE_SLOWNESS_AMPLIFIER = 255;
const DEFAULT_FREEZE_WEAKNESS_AMPLIFIER = 255;

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'freeze',
    syntax: '<playername> [on|off|toggle|status]',
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness and weakness.',
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
 * @param {string} [invokedBy] - Source of the command invocation (e.g., 'PlayerCommand', 'AutoMod', 'System').
 * @param {boolean} [isAutoModAction] - Whether this execution is part of an AutoMod action.
 * @param {string | null} [autoModCheckType] - The specific check type if invoked by AutoMod.
 * @returns {void}
 */
export function execute(
    player,
    args,
    dependencies,
    invokedBy = 'PlayerCommand',
    isAutoModAction = false,
    autoModCheckType = null,
    // No programmaticReason needed for freeze as it's a state change
) {
    const { config, playerUtils, logManager, getString } = dependencies;
    const issuerName = player?.nameTag ?? (invokedBy === 'AutoMod' ? 'AutoMod' : 'System');
    const prefix = config?.prefix ?? '!';

    const frozenTagName = config?.frozenPlayerTag ?? 'frozen';
    const effectDuration = DEFAULT_FREEZE_EFFECT_DURATION;
    const slownessAmplifier = config?.freezeSlownessAmplifier ?? DEFAULT_FREEZE_SLOWNESS_AMPLIFIER;
    const weaknessAmplifier = config?.freezeWeaknessAmplifier ?? DEFAULT_FREEZE_WEAKNESS_AMPLIFIER;
    const showParticles = config?.freezeShowParticles ?? false;
    const usageMsg = `§cUsage: ${prefix}freeze <playername> [on|off|toggle|status]`;

    if (args.length < 1) {
        if (player) {
            player.sendMessage(usageMsg);
        } else {
            console.warn(`[FreezeCommand.execute] System call missing target player name. Usage: ${usageMsg}`);
        }
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1]?.toLowerCase() || (invokedBy === 'PlayerCommand' ? 'toggle' : 'on'); // Default to 'on' for programmatic non-toggle

    let targetPlayer;
    if (invokedBy === 'PlayerCommand' && player) {
        targetPlayer = playerUtils.validateCommandTarget(player, targetPlayerName, dependencies, { commandName: 'freeze', allowSelf: false });
        if (!targetPlayer) {
            return;
        } // validateCommandTarget sends messages

        // No canAdminActionTarget needed for freeze as it's typically a base admin perm
    } else { // System or AutoMod call
        targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (!targetPlayer || !targetPlayer.isValid()) {
            console.warn(`[FreezeCommand.execute] ${issuerName} call: Target player '${targetPlayerName}' not found or invalid.`);
            logManager?.addLog({
                actionType: 'error.cmd.freeze.targetNotFound',
                context: 'FreezeCommand.execute',
                adminName: issuerName,
                targetName: targetPlayerName,
                details: { errorCode: 'CMD_TARGET_NOT_FOUND', message: `${issuerName} attempt to freeze offline/invalid player.` },
            }, dependencies);
            return;
        }
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
        if (invokedBy !== 'PlayerCommand') { // System/AutoMod should specify on/off
            console.warn(`[FreezeCommand.execute] ${issuerName} call used 'toggle'. Defaulting to 'on' if not frozen, 'off' if frozen.`);
            targetFreezeState = !currentFreezeState; // Still allow toggle for safety but log warning
        } else {
            targetFreezeState = !currentFreezeState;
        }
        break;
    case 'status': {
        if (player) { // Status is only for player query
            const statusMessage = currentFreezeState ?
                getString('command.freeze.status.isFrozen', { playerName: targetPlayer.nameTag }) :
                getString('command.freeze.status.notFrozen', { playerName: targetPlayer.nameTag });
            player.sendMessage(statusMessage);
        } else {
            console.warn(`[FreezeCommand.execute] ${issuerName} call attempted 'status' subcommand.`);
        }
        return;
    }
    default:
        if (player) {
            player.sendMessage(getString('command.freeze.invalidArg'));
        } else {
            console.warn(`[FreezeCommand.execute] ${issuerName} call with invalid subcommand: ${subCommand}`);
        }
        return;
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            targetPlayer.addTag(frozenTagName);
            targetPlayer.addEffect(mc.MinecraftEffectTypes.slowness, effectDuration, { amplifier: slownessAmplifier, showParticles });
            targetPlayer.addEffect(mc.MinecraftEffectTypes.weakness, effectDuration, { amplifier: weaknessAmplifier, showParticles });

            targetPlayer.sendMessage(getString('command.freeze.targetFrozen'));
            const successMsg = getString('command.freeze.success.frozen', { playerName: targetPlayer.nameTag });
            if (player) {
                player.sendMessage(successMsg);
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                // console.log(`[FreezeCommand] ${successMsg.replace(/§[a-f0-9lr]/g, '')} (Invoked by ${issuerName})`);
            }

            if (config?.notifyOnAdminUtilCommandUsage !== false && invokedBy === 'PlayerCommand') {
                const baseNotifyMsg = getString('command.freeze.notify.froze', { adminName: issuerName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            } else if (isAutoModAction && config?.notifyOnAutoModAction !== false) {
                const baseNotifyMsg = getString('command.freeze.notify.froze', { adminName: issuerName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, null, null);
            }

            logManager?.addLog({
                adminName: issuerName,
                actionType: 'playerFrozen',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: 'Player frozen',
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        } catch (e) {
            const errorMsg = getString('command.freeze.error.apply', { playerName: targetPlayer.nameTag, errorMessage: e.message });
            if (player) {
                player.sendMessage(errorMsg);
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            } else {
                console.error(`[FreezeCommand CRITICAL] ${errorMsg.replace(/§[a-f0-9lr]/g, '')} (Invoked by ${issuerName})`);
            }
            playerUtils?.debugLog(`[FreezeCommand CRITICAL] Error freezing ${targetPlayer.nameTag} by ${issuerName}: ${e.message}`, issuerName, dependencies);
            console.error(`[FreezeCommand CRITICAL] Error freezing ${targetPlayer.nameTag} by ${issuerName}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            targetPlayer.removeTag(frozenTagName);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.slowness);
            targetPlayer.removeEffect(mc.MinecraftEffectTypes.weakness);

            targetPlayer.sendMessage(getString('command.freeze.targetUnfrozen'));
            const successMsg = getString('command.freeze.success.unfrozen', { playerName: targetPlayer.nameTag });
            if (player) {
                player.sendMessage(successMsg);
                playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);
            } else {
                // console.log(`[FreezeCommand] ${successMsg.replace(/§[a-f0-9lr]/g, '')} (Invoked by ${issuerName})`);
            }

            if (config?.notifyOnAdminUtilCommandUsage !== false && invokedBy === 'PlayerCommand') {
                const baseNotifyMsg = getString('command.freeze.notify.unfroze', { adminName: issuerName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, player, null);
            } else if (isAutoModAction && config?.notifyOnAutoModAction !== false) { // Though AutoMod rarely unfreezes
                const baseNotifyMsg = getString('command.freeze.notify.unfroze', { adminName: issuerName, targetPlayerName: targetPlayer.nameTag });
                playerUtils?.notifyAdmins(baseNotifyMsg, dependencies, null, null);
            }
            logManager?.addLog({
                adminName: issuerName,
                actionType: 'playerUnfrozen',
                targetName: targetPlayer.nameTag,
                targetId: targetPlayer.id,
                details: 'Player unfrozen',
                isAutoMod: isAutoModAction,
                checkType: autoModCheckType,
            }, dependencies);
        } catch (e) {
            const errorMsg = getString('command.freeze.error.remove', { playerName: targetPlayer.nameTag, errorMessage: e.message });
            if (player) {
                player.sendMessage(errorMsg);
                playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
            } else {
                console.error(`[FreezeCommand CRITICAL] ${errorMsg.replace(/§[a-f0-9lr]/g, '')} (Invoked by ${issuerName})`);
            }
            playerUtils?.debugLog(`[FreezeCommand CRITICAL] Error unfreezing ${targetPlayer.nameTag} by ${issuerName}: ${e.message}`, issuerName, dependencies);
            console.error(`[FreezeCommand CRITICAL] Error unfreezing ${targetPlayer.nameTag} by ${issuerName}: ${e.stack || e}`);
        }
    } else {
        const alreadyMsg = targetFreezeState ?
            getString('command.freeze.alreadyFrozen', { playerName: targetPlayer.nameTag }) :
            getString('command.freeze.alreadyUnfrozen', { playerName: targetPlayer.nameTag });
        if (player) {
            player.sendMessage(alreadyMsg);
        } else if (invokedBy !== 'PlayerCommand') { // Log if system tried an already-set state
            playerUtils?.debugLog(`[FreezeCommand] ${issuerName} call: Player ${targetPlayer.nameTag} already in desired freeze state (${targetFreezeState}).`, null, dependencies);
        }
    }
}
