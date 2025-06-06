// AntiCheatsBP/scripts/commands/gmc.js
import { permissionLevels } from '../core/rankManager.js';
import * as mc from '@minecraft/server';

export const definition = {
    name: "gmc",
    syntax: "!gmc [playername]",
    description: "Sets Creative mode for self or [playername].",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { playerUtils, config, addLog } = dependencies; // setPlayerGameMode is expected in playerUtils

    if (playerUtils && typeof playerUtils.setPlayerGameMode === 'function') {
        // playerUtils.setPlayerGameMode will handle messages, logging, etc.
        await playerUtils.setPlayerGameMode(player, args[0], mc.GameMode.creative, "Creative", config, addLog);
    } else {
        player.sendMessage("§cError: Game mode setting utility is not available. Please contact an administrator.");
        console.warn("[gmcCmd] playerUtils.setPlayerGameMode is not available in dependencies.");
    }
}
