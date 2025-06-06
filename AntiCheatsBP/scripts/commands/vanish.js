// AntiCheatsBP/scripts/commands/vanish.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "vanish",
    syntax: "!vanish [on|off]",
    description: "Toggles admin visibility. Makes you invisible and hides your nametag.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { playerUtils, addLog } = dependencies;
    const vanishedTag = "vanished"; // Consistent with old logic
    const effectDuration = 2000000; // Consistent

    let currentState = player.hasTag(vanishedTag);
    let targetState;

    const subArg = args[0] ? args[0].toLowerCase() : null;
    if (subArg === "on") {
        targetState = true;
    } else if (subArg === "off") {
        targetState = false;
    } else {
        targetState = !currentState; // Toggle if no valid arg
    }

    if (targetState === true && !currentState) {
        try {
            player.addTag(vanishedTag);
            player.addEffect("invisibility", effectDuration, { amplifier: 0, showParticles: false });
            player.sendMessage("§7You are now vanished. Your nametag display will be updated by the rank manager.");
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`${player.nameTag} has vanished.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_on', targetName: player.nameTag, details: `${player.nameTag} enabled vanish.` });
            }
        } catch (e) {
            player.sendMessage(`§cError applying vanish: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error applying vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else if (targetState === false && currentState) {
        try {
            player.removeTag(vanishedTag);
            player.removeEffect("invisibility"); // Vanilla effect
            player.sendMessage("§7You are no longer vanished. Your nametag display will be restored by the rank manager.");
            if (playerUtils.notifyAdmins) {
                playerUtils.notifyAdmins(`${player.nameTag} is no longer vanished.`, player, null);
            }
            if (addLog) {
                addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'vanish_off', targetName: player.nameTag, details: `${player.nameTag} disabled vanish.` });
            }
        } catch (e) {
            player.sendMessage(`§cError removing vanish: ${e}`);
            if (playerUtils.debugLog) playerUtils.debugLog(`Error removing vanish for ${player.nameTag}: ${e}`, player.nameTag);
        }
    } else {
        player.sendMessage(targetState ? "§7You are already vanished." : "§7You are already visible.");
    }
}
