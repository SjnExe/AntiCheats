// AntiCheatsBP/scripts/commands/vanish.js
import { world } from "@minecraft/server";
import { permissionLevels } from '../core/rankManager.js';

const VANISHED_TAG = "vanished";
const VANISH_MODE_NOTIFY_TAG = "vanish_mode_notify"; // Renamed from VANISH_MODE_BROADCAST_TAG
const EFFECT_DURATION = 2000000; // Approx 23 days, effectively infinite for a session

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "vanish",
    syntax: "!vanish [silent|notify]", // Updated syntax
    description: "Toggles admin visibility. Optional mode 'silent' (default) or 'notify' (broadcasts fake leave/join messages).", // Updated description
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the vanish command, toggling visibility with optional notification mode.
 * Uses the action bar for persistent status display to the command user.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments, where args[0] can be 'silent' or 'notify'.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies (config, playerUtils, addLog).
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, addLog } = dependencies; // Assuming config is available in dependencies

    let mode = args[0] ? args[0].toLowerCase() : 'silent';
    if (mode !== 'silent' && mode !== 'notify') {
        // player.sendMessage(`§cInvalid mode. Defaulting to 'silent'. Valid modes: silent, notify.`); // Optional: notify user of default
        mode = 'silent'; // Default to silent if arg is invalid
    }

    const isCurrentlyVanished = player.hasTag(VANISHED_TAG);
    const targetStateIsOn = !isCurrentlyVanished; // Always toggle

    if (targetStateIsOn) { // Activate vanish
        try {
            player.addTag(VANISHED_TAG);
            player.addEffect("invisibility", EFFECT_DURATION, { amplifier: 0, showParticles: false });
            // Nametag hiding is assumed to be handled by a system reacting to VANISHED_TAG or invisibility.

            if (mode === 'notify') {
                player.addTag(VANISH_MODE_NOTIFY_TAG);
                world.sendMessage(`§e${player.nameTag} left the game.`);
                player.onScreenDisplay.setActionBar("§7You are now vanished (notify mode)."); // Changed to action bar
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_notify', details: `${player.nameTag} enabled vanish (notify).` });
            } else { // mode === 'silent'
                player.onScreenDisplay.setActionBar("§7You are now vanished."); // Changed to action bar
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_silent', details: `${player.nameTag} enabled vanish (silent).` });
            }

            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`${player.nameTag} has vanished${mode === 'notify' ? ' (notify mode)' : ' (silent mode)'}.`, player, null);
            }
        } catch (e) {
            player.sendMessage(`§cError applying vanish: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error applying vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else { // Deactivate vanish
        try {
            player.onScreenDisplay.setActionBar(""); // Clear persistent action bar message
            const wasNotifyMode = player.hasTag(VANISH_MODE_NOTIFY_TAG); // Check before removing tags

            player.removeTag(VANISHED_TAG);
            player.removeEffect("invisibility");
            // Nametag restoration assumed to be handled by a system reacting to VANISHED_TAG removal or invisibility expiry.

            if (wasNotifyMode) {
                world.sendMessage(`§e${player.nameTag} joined the game.`);
                player.sendMessage("§7You are no longer vanished (notify mode).");
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_notify', details: `${player.nameTag} disabled vanish (notify).` });
                player.removeTag(VANISH_MODE_NOTIFY_TAG); // Clean up the notify mode tag
            } else { // Was silent mode
                player.sendMessage("§7You are no longer vanished.");
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_silent', details: `${player.nameTag} disabled vanish (silent).` });
            }

            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`${player.nameTag} is no longer vanished${wasNotifyMode ? ' (notify mode)' : ' (silent mode)'}.`, player, null);
            }
        } catch (e) {
            player.sendMessage(`§cError removing vanish: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error removing vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    }
}
