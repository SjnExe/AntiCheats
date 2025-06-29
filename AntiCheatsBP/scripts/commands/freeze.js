/**
 * @file Defines the !freeze command for administrators to immobilize or release players.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'freeze',
    syntax: '!freeze <playername> [on|off|toggle|status]',
    description: 'Freezes or unfreezes a player, preventing movement by applying strong slowness.',
    permissionLevel: permissionLevels.admin,
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
    const { config, playerUtils, logManager } = dependencies;
    const frozenTag = 'frozen';
    const effectDuration = 2000000;
    const slownessAmplifier = 255;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off|toggle|status]`);
        return;
    }

    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : 'toggle';

    const foundPlayer = playerUtils.findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer '${targetPlayerName}' not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage('§cYou cannot freeze yourself.');
        return;
    }

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
                `§ePlayer ${foundPlayer.nameTag} is currently frozen.` :
                `§ePlayer ${foundPlayer.nameTag} is not frozen.`;
            player.sendMessage(statusMessage);
            return;
        default:
            player.sendMessage('§cInvalid argument. Use: on, off, toggle, or status.');
            return;
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect('slowness', effectDuration, { amplifier: slownessAmplifier, showParticles: false });
            foundPlayer.sendMessage('§cYou have been frozen by an administrator.');
            player.sendMessage(`§aSuccessfully froze ${foundPlayer.nameTag}.`);
            playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 froze §e${foundPlayer.nameTag}§7.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cError applying freeze to ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect('slowness');
            foundPlayer.sendMessage('§aYou have been unfrozen.');
            player.sendMessage(`§aSuccessfully unfroze ${foundPlayer.nameTag}.`);
            playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 unfroze §e${foundPlayer.nameTag}§7.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cError removing freeze from ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else {
        player.sendMessage(targetFreezeState ?
            `§ePlayer ${foundPlayer.nameTag} is already frozen.` :
            `§ePlayer ${foundPlayer.nameTag} is already unfrozen.`
        );
    }
}
