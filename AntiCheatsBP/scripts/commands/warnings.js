// AntiCheatsBP/scripts/commands/warnings.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "warnings",
    syntax: "!warnings <playername>",
    description: "Shows a detailed list of warnings/flags for a player.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}warnings <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id);
    if (pData && pData.flags) {
        let warningDetails = `§e--- Warnings for ${foundPlayer.nameTag} ---\n`;
        warningDetails += `§fTotal Flags: §c${pData.flags.totalFlags || 0}\n`;
        warningDetails += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n`;
        warningDetails += `§eIndividual Flags:\n`;
        let hasSpecificFlags = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                const lastTime = flagData.lastDetectionTime && flagData.lastDetectionTime > 0 ? new Date(flagData.lastDetectionTime).toLocaleString() : 'N/A';
                warningDetails += `  §f- ${flagKey}: §c${flagData.count} §7(Last: ${lastTime})\n`;
                hasSpecificFlags = true;
            }
        }
        if (!hasSpecificFlags) {
            warningDetails += `  §7No specific flag types recorded with counts > 0.\n`;
        }
        player.sendMessage(warningDetails.trim());
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'view_warnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` });
        }
    } else {
        player.sendMessage(`§cNo warning data found for ${foundPlayer.nameTag}.`);
    }
}
