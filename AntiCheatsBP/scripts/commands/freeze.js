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
    const { config, playerUtils, logManager, findPlayer, getString, permissionLevels } = dependencies; // Destructure all
    const frozenTag = "frozen"; // Consider moving to config if customizable
    const effectDuration = 2000000; // A very long duration for "permanent" effect until removed

    // definition.description = getString("command.freeze.description"); // If dynamic description needed
    // definition.permissionLevel = permissionLevels.admin;


    if (args.length < 1) {
        player.sendMessage(getString("command.freeze.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : null;

    const foundPlayer = findPlayer(targetPlayerName); // Assumes findPlayer is from playerUtils or global

    if (!foundPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }

    if (foundPlayer.id === player.id) {
        player.sendMessage(getString("command.freeze.error.self"));
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
            foundPlayer.sendMessage(getString("command.freeze.frozenTarget"));
            player.sendMessage(getString("command.freeze.frozenAdmin", { targetPlayerName: foundPlayer.nameTag }));
            playerUtils.notifyAdmins(getString("command.freeze.notifyAdmins.frozen", { adminName: player.nameTag, targetPlayerName: foundPlayer.nameTag }), dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            player.sendMessage(getString("command.freeze.error.generic", { targetPlayerName: foundPlayer.nameTag, error: e.message }));
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect("slowness");
            foundPlayer.sendMessage(getString("command.freeze.unfrozenTarget"));
            player.sendMessage(getString("command.freeze.unfrozenAdmin", { targetPlayerName: foundPlayer.nameTag }));
            playerUtils.notifyAdmins(getString("command.freeze.notifyAdmins.unfrozen", { adminName: player.nameTag, targetPlayerName: foundPlayer.nameTag }), dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            player.sendMessage(getString("command.freeze.error.generic", { targetPlayerName: foundPlayer.nameTag, error: e.message }));
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, dependencies, player.nameTag);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else {
        player.sendMessage(targetFreezeState ? getString("command.freeze.alreadyFrozen", { targetPlayerName: foundPlayer.nameTag }) : getString("command.freeze.alreadyUnfrozen", { targetPlayerName: foundPlayer.nameTag }));
    }
}
