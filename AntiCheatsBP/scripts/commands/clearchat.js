// AntiCheatsBP/scripts/commands/clearchat.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server'; // For world.sendMessage

export const definition = {
    name: "clearchat",
    syntax: "!clearchat",
    description: "Clears the chat for all players.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { playerUtils, addLog } = dependencies;
    const linesToClear = 150; // As per original logic
    for (let i = 0; i < linesToClear; i++) {
        mc.world.sendMessage("");
    }
    // mc.world.sendMessage("§7Chat cleared by an Administrator."); // Optional public message
    player.sendMessage("§aChat has been cleared.");
    if (playerUtils.notifyAdmins) {
        playerUtils.notifyAdmins(`Chat was cleared by ${player.nameTag}.`, player, null);
    }
    if (addLog) {
        addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'clear_chat',
            targetName: 'Global',
            details: `Chat cleared by ${player.nameTag}`
        });
    }
}
