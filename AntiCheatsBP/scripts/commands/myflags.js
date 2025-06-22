/**
 * @file AntiCheatsBP/scripts/commands/myflags.js
 * Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 * @version 1.0.3
 */
// permissionLevels and getString are now accessed via dependencies

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "myflags",
    syntax: "!myflags",
    description: "Allows players to view their own AntiCheat flag status.", // Static fallback
    permissionLevel: 0, // Static fallback (Normal)
    enabled: true,
};

/**
 * Executes the myflags command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, permissionLevels } = dependencies; // getString removed
    const pDataSelf = playerDataManager.getPlayerData(player.id);

    // Static definitions are used

    if (pDataSelf && pDataSelf.flags) {
        const totalFlags = pDataSelf.flags.totalFlags || 0;
        // "common.value.none" -> "None"
        const lastFlagTypeString = pDataSelf.lastFlagType || "None";

        // "command.myflags.header" -> "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r"
        let message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n`;
        let specificFlagsFound = false;

        for (const key in pDataSelf.flags) {
            if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                const flagDetail = pDataSelf.flags[key];
                // "common.value.notApplicable" -> "N/A"
                const lastDetectionTime = flagDetail.lastDetectionTime
                    ? new Date(flagDetail.lastDetectionTime).toLocaleTimeString()
                    : "N/A";
                // "command.myflags.flagEntry" -> " §7- {flagName}: §e{count} §7(Last: {lastDetectionTime})\n"
                message += ` §7- ${key}: §e${flagDetail.count} §7(Last: ${lastDetectionTime})\n`;
                specificFlagsFound = true;
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            // "command.myflags.noFlags" -> "§7You have no active flags."
            message = "§7You have no active flags.";
        } else if (!specificFlagsFound && totalFlags > 0) {
            // "command.myflags.noSpecificFlags" -> "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0)."
            message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n§7(No specific flag type details available with counts > 0).`;
        }
        player.sendMessage(message.trim());
    } else {
        // "command.myflags.noData" -> "§7No flag data found for you, or you have no flags."
        player.sendMessage("§7No flag data found for you, or you have no flags.");
    }
}
