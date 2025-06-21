/**
 * @file AntiCheatsBP/scripts/commands/freeze.js
 * Defines the !freeze command for administrators to immobilize or release players.
 * @version 1.0.2
 */
// permissionLevels is now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "freeze",
    syntax: "!freeze <playername> [on|off]",
    description: "Freezes or unfreezes a player, preventing movement.", // Static
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the freeze command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager, findPlayer, permissionLevels } = dependencies; // Destructure all
    const frozenTag = "frozen"; // Consider moving to config if customizable
    const effectDuration = 2000000; // A very long duration for "permanent" effect until removed

    // definition.description = getString("command.freeze.description"); // If dynamic description needed
    // definition.permissionLevel = permissionLevels.admin;


    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off]`);
        return;
    }
    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : null;

    const foundPlayer = findPlayer(targetPlayerName); // Assumes findPlayer is from playerUtils or global

    if (!foundPlayer) {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
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
        targetFreezeState = !currentFreezeState; // Toggle if no valid "on" or "off" argument
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
            foundPlayer.sendMessage("§cYou have been frozen by an administrator.");
            player.sendMessage(`§aSuccessfully froze ${foundPlayer.nameTag}.`);
            playerUtils.notifyAdmins(`§7[Freeze] §e${foundPlayer.nameTag} §7was frozen by §e${player.nameTag}§7.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while trying to modify freeze state for ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect("slowness");
            foundPlayer.sendMessage("§aYou have been unfrozen.");
            player.sendMessage(`§aSuccessfully unfroze ${foundPlayer.nameTag}.`);
            playerUtils.notifyAdmins(`§7[Freeze] §e${foundPlayer.nameTag} §7was unfrozen by §e${player.nameTag}§7.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player.sendMessage(`§cAn error occurred while trying to modify freeze state for ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else {
        player.sendMessage(targetFreezeState ? `§e${foundPlayer.nameTag} is already frozen.` : `§e${foundPlayer.nameTag} is already unfrozen.`);
    }
}
