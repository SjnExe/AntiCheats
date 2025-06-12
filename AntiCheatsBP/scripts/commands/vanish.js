/**
 * @file AntiCheatsBP/scripts/commands/vanish.js
 * Defines the !vanish command for administrators to toggle their visibility and related effects.
 * @version 1.0.2
 */
import { world } from "@minecraft/server";
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js'; // Import getString

const vanishedTag = "vanished";
const vanishModeNotifyTag = "vanish_mode_notify";
const effectDuration = 2000000;

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "vanish",
    syntax: "!vanish [silent|notify]",
    description: getString("command.vanish.description"),
    permissionLevel: permissionLevels.admin
};

/**
 * Executes the vanish command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments, where args[0] can be 'silent' or 'notify'.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, addLog } = dependencies;

    let mode = args[0] ? args[0].toLowerCase() : 'silent';
    if (mode !== 'silent' && mode !== 'notify') {
        mode = 'silent';
    }

    const isCurrentlyVanished = player.hasTag(vanishedTag);
    const targetStateIsOn = !isCurrentlyVanished;

    if (targetStateIsOn) {
        try {
            player.addTag(vanishedTag);
            player.addEffect("invisibility", effectDuration, { amplifier: 0, showParticles: false });
            player.addEffect("night_vision", effectDuration, { amplifier: 0, showParticles: false });
            player.addEffect("resistance", effectDuration, { amplifier: 4, showParticles: false });
            player.addEffect("fire_resistance", effectDuration, { amplifier: 0, showParticles: false });
            player.canPickupItems = false;

            if (mode === 'notify') {
                player.addTag(vanishModeNotifyTag);
                world.sendMessage(getString("command.vanish.fakeLeave", { playerName: player.nameTag }));
                player.onScreenDisplay.setActionBar(getString("command.vanish.enabled.notify"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_notify', details: `${player.nameTag} enabled vanish (notify).` });
            } else {
                player.onScreenDisplay.setActionBar(getString("command.vanish.enabled.silent"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_silent', details: `${player.nameTag} enabled vanish (silent).` });
            }

            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(getString("command.vanish.adminNotify.on", {adminName: player.nameTag, mode: mode }), player, null);
            }
        } catch (e) {
            player.sendMessage(getString("command.vanish.error.apply", { error: e }));
            if (playerUtils.debugLog) playerUtils.debugLog(`Error applying vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else {
        try {
            player.onScreenDisplay.setActionBar("");
            const wasNotifyMode = player.hasTag(vanishModeNotifyTag);

            player.canPickupItems = true;
            player.removeTag(vanishedTag);
            player.removeEffect("invisibility");
            player.removeEffect("night_vision");
            player.removeEffect("resistance");
            player.removeEffect("fire_resistance");

            if (wasNotifyMode) {
                world.sendMessage(getString("command.vanish.fakeJoin", { playerName: player.nameTag }));
                player.sendMessage(getString("command.vanish.disabled.notify"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_notify', details: `${player.nameTag} disabled vanish (notify).` });
                player.removeTag(vanishModeNotifyTag);
            } else {
                player.sendMessage(getString("command.vanish.disabled.silent"));
                if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_silent', details: `${player.nameTag} disabled vanish (silent).` });
            }

            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(getString("command.vanish.adminNotify.off", {adminName: player.nameTag, mode: (wasNotifyMode ? 'notify' : 'silent') }), player, null);
            }
        } catch (e) {
            player.sendMessage(getString("command.vanish.error.remove", { error: e }));
            if (playerUtils.debugLog) playerUtils.debugLog(`Error removing vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    }
}
