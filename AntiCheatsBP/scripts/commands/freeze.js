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
    const { config, playerUtils, logManager, findPlayer, permissionLevels } = dependencies; // getString removed
    const frozenTag = "frozen"; // Consider moving to config if customizable
    const effectDuration = 2000000; // A very long duration for "permanent" effect until removed

    // definition.description is static
    // definition.permissionLevel is static

    if (args.length < 1) {
        // Original key: "command.freeze.usage" (Not in en_US.js) -> Using syntax definition: "!freeze <playername> [on|off]"
        player.sendMessage(`§cUsage: ${config.prefix}freeze <playername> [on|off|toggle|status]`); // Updated to match syntax in definition
        return;
    }
    const targetPlayerName = args[0];
    const subCommand = args[1] ? args[1].toLowerCase() : null; // Keep toggle|status logic based on original code

    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // "common.error.invalidPlayer" -> "Player \"{targetName}\" not found."
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    if (foundPlayer.id === player.id) {
        // "command.freeze.error.self" -> "§cYou cannot freeze yourself."
        player.sendMessage("§cYou cannot freeze yourself."); // Using the available string
        return;
    }

    let currentFreezeState = foundPlayer.hasTag(frozenTag);
    let targetFreezeState;

    // Retaining toggle and status logic from original code as it was more advanced than simple on/off
    if (subCommand === "on") {
        targetFreezeState = true;
    } else if (subCommand === "off") {
        targetFreezeState = false;
    } else if (subCommand === "toggle") {
        targetFreezeState = !currentFreezeState;
    } else if (subCommand === "status") {
        // Placeholder: "command.freeze.status.frozen" / "command.freeze.status.notFrozen" (Not in en_US.js)
        const statusMessage = currentFreezeState ? `${foundPlayer.nameTag} is currently FROZEN.` : `${foundPlayer.nameTag} is currently NOT FROZEN.`;
        player.sendMessage(statusMessage);
        return;
    } else if (subCommand === null) { // If no subcommand, default to toggle
        targetFreezeState = !currentFreezeState;
    }
    else {
        // "commands.error.invalidArgOnOffStatusToggle" (Not in en_US.js, but common.error.invalidArgOnOffStatus is)
        // Using "commands.error.invalidArgOnOffStatus" -> "§cInvalid argument. Use 'on', 'off', or 'status'."
        // Adapting for toggle:
        player.sendMessage("§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.");
        return;
    }

    if (targetFreezeState === true && !currentFreezeState) {
        try {
            foundPlayer.addTag(frozenTag);
            foundPlayer.addEffect("slowness", effectDuration, { amplifier: 255, showParticles: false });
            // "command.freeze.frozenTarget" -> "§cYou have been frozen."
            foundPlayer.sendMessage("§cYou have been frozen.");
            // Placeholder: "command.freeze.frozenAdmin" (Not in en_US.js)
            player.sendMessage(`§a${foundPlayer.nameTag} has been frozen.`);
            // Placeholder: "command.freeze.notifyAdmins.frozen" (Not in en_US.js)
            playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was frozen by §e${player.nameTag}.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'freeze', targetName: foundPlayer.nameTag, details: 'Player frozen' }, dependencies);
        } catch (e) {
            // Placeholder: "command.freeze.error.generic" (Not in en_US.js)
            player.sendMessage(`§cAn error occurred while trying to freeze ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error freezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else if (targetFreezeState === false && currentFreezeState) {
        try {
            foundPlayer.removeTag(frozenTag);
            foundPlayer.removeEffect("slowness");
            // "command.freeze.unfrozenTarget" -> "§aYou have been unfrozen."
            foundPlayer.sendMessage("§aYou have been unfrozen.");
            // Placeholder: "command.freeze.unfrozenAdmin" (Not in en_US.js)
            player.sendMessage(`§a${foundPlayer.nameTag} has been unfrozen.`);
            // Placeholder: "command.freeze.notifyAdmins.unfrozen" (Not in en_US.js)
            playerUtils.notifyAdmins(`§7[Admin] §e${foundPlayer.nameTag} §7was unfrozen by §e${player.nameTag}.`, dependencies, player, null);
            logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'unfreeze', targetName: foundPlayer.nameTag, details: 'Player unfrozen' }, dependencies);
        } catch (e) {
            // Placeholder: "command.freeze.error.generic" (Not in en_US.js)
            player.sendMessage(`§cAn error occurred while trying to unfreeze ${foundPlayer.nameTag}: ${e.message}`);
            playerUtils.debugLog(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[FreezeCommand] Error unfreezing ${foundPlayer.nameTag} by ${player.nameTag}: ${e.stack || e}`);
        }
    } else {
        // Placeholders: "command.freeze.alreadyFrozen" / "command.freeze.alreadyUnfrozen" (Not in en_US.js)
        player.sendMessage(targetFreezeState ? `§e${foundPlayer.nameTag} is already frozen.` : `§e${foundPlayer.nameTag} is already unfrozen.`);
    }
}
