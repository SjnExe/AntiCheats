/**
 * @file AntiCheatsBP/scripts/commands/warnings.js
 * Defines the !warnings command for administrators to view a player's AntiCheat flags.
 * @version 1.0.3
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "warnings",
    syntax: "!warnings <playername>",
    description: "Views a player's AntiCheat flags (similar to inspect).",
    permissionLevel: 1,
    enabled: true,
};
/**
 * Executes the warnings command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${config.prefix}warnings <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id);
    if (pData && pData.flags) {
        let warningDetails = `§e--- Warnings for ${foundPlayer.nameTag} ---\n`;
        warningDetails += `§fTotal Flags: §c${pData.flags.totalFlags || 0}\n`;
        warningDetails += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n`;
        warningDetails += "§eIndividual Flags:\n";
        let hasSpecificFlags = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                const lastTime = flagData.lastDetectionTime && flagData.lastDetectionTime > 0 ? new Date(flagData.lastDetectionTime).toLocaleString() : "N/A";
                warningDetails += `  §f- ${flagKey}: §c${flagData.count} §7(Last: ${lastTime})\n`;
                hasSpecificFlags = true;
            }
        }
        if (!hasSpecificFlags) {
            warningDetails += "    §7No specific flag types recorded.\n";
        }
        player.sendMessage(warningDetails.trim());
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'view_warnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` }, dependencies);
    } else {
        player.sendMessage(`§cNo warning data found for ${foundPlayer.nameTag}.`);
    }
}
