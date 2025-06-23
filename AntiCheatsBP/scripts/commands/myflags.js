/**
 * Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels

export const definition = {
    name: "myflags",
    syntax: "!myflags",
    description: "Allows players to view their own AntiCheat flag status.",
    permissionLevel: permissionLevels.normal, // Corrected: Should be available to normal players
    enabled: true,
};
/**
 * Executes the myflags command.
 */
export async function execute(player, _args, dependencies) {
    const { playerDataManager, permissionLevels } = dependencies;
    const pDataSelf = playerDataManager.getPlayerData(player.id);

    if (pDataSelf && pDataSelf.flags) {
        const totalFlags = pDataSelf.flags.totalFlags || 0;
        const lastFlagTypeString = pDataSelf.lastFlagType || "None";

        let message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n`;
        let specificFlagsFound = false;

        for (const key in pDataSelf.flags) {
            if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                const flagDetail = pDataSelf.flags[key];
                const lastDetectionTime = flagDetail.lastDetectionTime
                    ? new Date(flagDetail.lastDetectionTime).toLocaleTimeString()
                    : "N/A";
                message += ` §7- ${key}: §e${flagDetail.count} §7(Last: ${lastDetectionTime})\n`;
                specificFlagsFound = true;
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = "§7You have no active flags.";
        } else if (!specificFlagsFound && totalFlags > 0) {
            message = `§7Your current flags: §eTotal=${totalFlags}§7. Last type: §e${lastFlagTypeString}§r\n§7(No specific flag type details available with counts > 0).`;
        }
        player.sendMessage(message.trim());
    } else {
        player.sendMessage("§7No flag data found for you, or you have no flags.");
    }
}
