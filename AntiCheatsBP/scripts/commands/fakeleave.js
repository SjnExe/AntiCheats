/**
 * @file AntiCheatsBP/scripts/commands/fakeleave.js
 * Implements the !fakeleave command for administrators to simulate leaving and joining the server.
 * @version 1.0.0
 */

import { world } from "@minecraft/server";
import { permissionLevels } from "../core/rankManager.js";
// Assuming playerUtils and addLog might be part of dependencies.
// import { playerUtils } from "../utils/playerUtils.js"; // If direct import needed
// import { addLog } from "../core/logManager.js"; // If direct import needed

const FAKE_LEAVED_TAG = "fake_leaved";
const VANISHED_TAG = "vanished"; // Assuming this tag is used by vanish.js for nametag hiding

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "fakeleave",
    syntax: "!fakeleave [on|off]",
    description: "Toggles your fake leave status, making you appear to leave/join the game.",
    permissionLevel: permissionLevels.admin,
};

/**
 * Executes the fakeleave command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, including config, playerUtils, and addLog.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog } = dependencies;
    const subCommand = args[0] ? args[0].toLowerCase() : "toggle";
    const currentFakeLeavedStatus = player.hasTag(FAKE_LEAVED_TAG);

    let activate;

    switch (subCommand) {
        case "on":
            activate = true;
            break;
        case "off":
            activate = false;
            break;
        case "toggle":
            activate = !currentFakeLeavedStatus;
            break;
        default:
            player.sendMessage(`§cUsage: ${config.prefix}${definition.name} [on|off]`);
            return;
    }

    if (activate) {
        if (currentFakeLeavedStatus) {
            player.sendMessage("§eYou are already in fake leave mode.");
            return;
        }
        try {
            player.addTag(FAKE_LEAVED_TAG);
            player.addTag(VANISHED_TAG); // For nametag hiding, as per requirements
            player.addEffect("invisibility", 2000000, { amplifier: 0, showParticles: false });

            world.sendMessage(`§e${player.nameTag} left the game.`); // Use world.sendMessage for global broadcast
            player.sendMessage("§7You are now in fake leave mode.");

            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'fakeleave_on', details: 'Activated fake leave mode' });
            if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`${player.nameTag} activated fake leave mode.`, player.nameTag);

        } catch (error) {
            player.sendMessage("§cError activating fake leave mode. Check console for details.");
            console.error(`Error activating fakeleave for ${player.nameTag}: ${error}`);
        }
    } else {
        if (!currentFakeLeavedStatus) {
            player.sendMessage("§eYou are not in fake leave mode.");
            return;
        }
        try {
            player.removeTag(FAKE_LEAVED_TAG);
            player.removeTag(VANISHED_TAG); // Revert nametag hiding
            player.removeEffect("invisibility");

            world.sendMessage(`§e${player.nameTag} joined the game.`); // Use world.sendMessage for global broadcast
            player.sendMessage("§7You are no longer in fake leave mode.");

            if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'fakeleave_off', details: 'Deactivated fake leave mode' });
            if (playerUtils && playerUtils.debugLog) playerUtils.debugLog(`${player.nameTag} deactivated fake leave mode.`, player.nameTag);

        } catch (error) {
            player.sendMessage("§cError deactivating fake leave mode. Check console for details.");
            console.error(`Error deactivating fakeleave for ${player.nameTag}: ${error}`);
        }
    }
}
