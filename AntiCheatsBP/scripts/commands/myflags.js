/**
 * @file AntiCheatsBP/scripts/commands/myflags.js
 * Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 * @version 1.0.0
 */
// AntiCheatsBP/scripts/commands/myflags.js
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "myflags",
    syntax: "!myflags",
    description: "Shows your own current flag status.",
    permissionLevel: permissionLevels.normal // Accessible by all players
};

/**
 * Executes the myflags command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { playerDataManager } = dependencies;
    const pDataSelf = playerDataManager.getPlayerData(player.id);

    if (pDataSelf && pDataSelf.flags) {
        let message = `§7Your current flags: §eTotal=${pDataSelf.flags.totalFlags || 0}§7. Last type: §e${pDataSelf.lastFlagType || "None"}§r\n`;
        let specificFlagsFound = false;
        for (const key in pDataSelf.flags) {
            if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                const flagDetail = pDataSelf.flags[key];
                message += ` §7- ${key}: §e${flagDetail.count} §7(Last: ${flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleTimeString() : 'N/A'})\n`;
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound && (pDataSelf.flags.totalFlags === 0 || pDataSelf.flags.totalFlags === undefined)) {
            message = "§7You have no active flags."; // Overwrite if no specific flags and total is 0
        } else if (!specificFlagsFound && pDataSelf.flags.totalFlags > 0) {
            // This case indicates totalFlags has a value but no individual flag types do.
            // It might be less confusing to just show total in this scenario.
            message = `§7Your current flags: §eTotal=${pDataSelf.flags.totalFlags}§7. Last type: §e${pDataSelf.lastFlagType || "None"}§r\n§7(No specific flag type details available with counts > 0).`;
        }
        player.sendMessage(message.trim());
    } else {
        player.sendMessage("§7No flag data found for you, or you have no flags.");
    }
}
