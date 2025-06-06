// AntiCheatsBP/scripts/commands/freeze.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "freeze",
    syntax: "!freeze <playername> [on|off]",
    description: "Freezes or unfreezes a player, preventing movement.",
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the freeze command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog, findPlayer } = dependencies;
    const frozenTag = "frozen";
    const effectDuration = 2000000;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off]`);
        return;
    }
    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : null;

    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage("§cYou cannot freeze yourself.");
        return;
    }

    let currentFreezeState = foundPlayer.hasTag(frozenTag);
    let targetFreezeState;

    if (subCommand === "on") {
        targetFreezeState = true;
    } else if (subCommand === "off") {
        targetFreezeState = false;
    } else {
        targetFreezeState = !currentFreezeState; // Toggle
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
            foundPlayer.sendMessage("§cYou have been frozen by an administrator!");
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} is now frozen.`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was frozen by ${player.nameTag}.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' });
            }
        } catch (e) {
            player.sendMessage(`§cError freezing ${foundPlayer.nameTag}: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect("slowness");
            foundPlayer.sendMessage("§aYou have been unfrozen.");
            player.sendMessage(`§aPlayer ${foundPlayer.nameTag} is no longer frozen.`);
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`Player ${foundPlayer.nameTag} was unfrozen by ${player.nameTag}.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' });
            }
        } catch (e) {
            player.sendMessage(`§cError unfreezing ${foundPlayer.nameTag}: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else {
        player.sendMessage(targetFreezeState ? `§7Player ${foundPlayer.nameTag} is already frozen.` : `§7Player ${foundPlayer.nameTag} is already unfrozen.`);
    }
}
