// AntiCheatsBP/scripts/commands/gma.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';

export const definition = {
    name: "gma",
    syntax: "!gma [playername]",
    description: "Sets Adventure mode for self or [playername].",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog } = dependencies;

    if (playerUtils && typeof playerUtils.setPlayerGameMode === 'function') {
        await playerUtils.setPlayerGameMode(player, args[0], mc.GameMode.adventure, "Adventure", config, addLog);
    } else {
        player.sendMessage("§cError: Game mode setting utility is not available. Please contact an administrator.");
        console.warn("[gmaCmd] playerUtils.setPlayerGameMode is not available in dependencies.");
    }
}
