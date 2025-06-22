/**
 * @file AntiCheatsBP/scripts/commands/vanish.js
 * Defines the !vanish command for administrators to toggle their visibility and related effects.
 * @version 1.0.3
 */
import { world } from "@minecraft/server";

const vanishedTag = "vanished";
const vanishModeNotifyTag = "vanish_mode_notify";
const effectDuration = 2000000;
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "vanish",
    syntax: "!vanish [silent|notify]",
    description: "Toggles your visibility and related effects.",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the vanish command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments, where args[0] can be 'silent' or 'notify'.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, logManager, config, playerDataManager, permissionLevels } = dependencies;

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
                world.sendMessage(`§e${player.nameTag} left the game`);
                player.onScreenDisplay.setActionBar("§7You are now vanished (notify mode).");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_notify', details: `${player.nameTag} enabled vanish (notify).` }, dependencies);
            } else {
                player.onScreenDisplay.setActionBar("§7You are now vanished (silent mode).");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on_silent', details: `${player.nameTag} enabled vanish (silent).` }, dependencies);
            }

            const pData = playerDataManager.getPlayerData(player.id);
            playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has enabled vanish (${mode} mode).`, dependencies, player, pData);

        } catch (e) {
            player.sendMessage(`§cError applying vanish effect: ${e.message}`);
            playerUtils.debugLog(`[VanishCommand] Error applying vanish for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[VanishCommand] Error applying vanish for ${player.nameTag}: ${e.stack || e}`);
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
                world.sendMessage(`§e${player.nameTag} joined the game`);
                player.sendMessage("§7You are no longer vanished (notify mode).");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_notify', details: `${player.nameTag} disabled vanish (notify).` }, dependencies);
                player.removeTag(vanishModeNotifyTag);
            } else {
                player.sendMessage("§7You are no longer vanished (silent mode).");
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off_silent', details: `${player.nameTag} disabled vanish (silent).` }, dependencies);
            }

            const pData = playerDataManager.getPlayerData(player.id);
            playerUtils.notifyAdmins(`§7[Admin] §e${player.nameTag}§7 has disabled vanish (${wasNotifyMode ? 'notify' : 'silent'} mode).`, dependencies, player, pData);

        } catch (e) {
            player.sendMessage(`§cError removing vanish effect: ${e.message}`);
            playerUtils.debugLog(`[VanishCommand] Error removing vanish for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
            console.error(`[VanishCommand] Error removing vanish for ${player.nameTag}: ${e.stack || e}`);
        }
    }
}
