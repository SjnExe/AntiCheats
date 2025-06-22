/**
 * @file AntiCheatsBP/scripts/commands/warnings.js
 * Defines the !warnings command for administrators to view a player's AntiCheat flags.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "warnings",
    syntax: "!warnings <playername>",
    description: "Views a player's AntiCheat flags (similar to inspect).", // Static fallback
    permissionLevel: 1, // Static fallback (Admin)
    enabled: true,
};

/**
 * Executes the warnings command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, permissionLevels } = dependencies; // getString removed
    const findPlayer = playerUtils.findPlayer;

    // Static definitions are used

    if (args.length < 1) {
        // "command.warnings.usage" -> "§cUsage: {prefix}warnings <playername>"
        player.sendMessage(`§cUsage: ${config.prefix}warnings <playername>`);
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        // "common.error.invalidPlayer" -> "Player \"{targetName}\" not found."
        player.sendMessage(`Player "${targetPlayerName}" not found.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id);
    if (pData && pData.flags) {
        // "command.warnings.header" -> "§e--- Warnings for {playerName} ---"
        let warningDetails = `§e--- Warnings for ${foundPlayer.nameTag} ---\n`;
        // "command.inspect.totalFlags" -> "§fTotal Flags: §c{count}"
        warningDetails += `§fTotal Flags: §c${pData.flags.totalFlags || 0}\n`;
        // "command.inspect.lastFlagType" -> "§fLast Flag Type: §7{type}"
        // "common.value.none" -> "None"
        warningDetails += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n`;
        // "command.warnings.individualFlagsHeader" -> "§eIndividual Flags:"
        warningDetails += "§eIndividual Flags:\n";
        let hasSpecificFlags = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                // "common.value.notApplicable" -> "N/A"
                const lastTime = flagData.lastDetectionTime && flagData.lastDetectionTime > 0 ? new Date(flagData.lastDetectionTime).toLocaleString() : "N/A";
                // "command.inspect.flagEntry" -> "  §f- {flagKey}: §c{count} §7(Last: {timestamp})"
                warningDetails += `  §f- ${flagKey}: §c${flagData.count} §7(Last: ${lastTime})\n`;
                hasSpecificFlags = true;
            }
        }
        if (!hasSpecificFlags) {
            // "command.inspect.noSpecificFlags" -> "    §7No specific flag types recorded."
            warningDetails += "    §7No specific flag types recorded.\n";
        }
        player.sendMessage(warningDetails.trim());
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'view_warnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` }, dependencies);
    } else {
        // "command.warnings.noData" -> "§cNo warning data found for {playerName}."
        player.sendMessage(`§cNo warning data found for ${foundPlayer.nameTag}.`);
    }
}
