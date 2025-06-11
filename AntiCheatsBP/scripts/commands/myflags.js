/**
 * @file AntiCheatsBP/scripts/commands/myflags.js
 * Defines the !myflags command, allowing players to view their own AntiCheat flag status.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "myflags",
    syntax: "!myflags",
    description: getString("command.myflags.description"),
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
        const totalFlags = pDataSelf.flags.totalFlags || 0;
        const lastFlagType = pDataSelf.lastFlagType || getString("command.myflags.value.none");

        let message = getString("command.myflags.header", { totalFlags: totalFlags, lastFlagType: lastFlagType }) + "\n";
        let specificFlagsFound = false;

        for (const key in pDataSelf.flags) {
            if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object' && pDataSelf.flags[key] !== null && pDataSelf.flags[key].count > 0) {
                const flagDetail = pDataSelf.flags[key];
                const lastDetectionTime = flagDetail.lastDetectionTime
                    ? new Date(flagDetail.lastDetectionTime).toLocaleTimeString()
                    : getString("command.myflags.value.notApplicable");
                message += getString("command.myflags.flagEntry", { flagName: key, count: flagDetail.count, lastDetectionTime: lastDetectionTime });
                specificFlagsFound = true;
            }
        }

        if (!specificFlagsFound && totalFlags === 0) {
            message = getString("command.myflags.noFlags");
        } else if (!specificFlagsFound && totalFlags > 0) {
            message = getString("command.myflags.noSpecificFlags", { totalFlags: totalFlags, lastFlagType: lastFlagType });
        }
        player.sendMessage(message.trim());
    } else {
        player.sendMessage(getString("command.myflags.noData"));
    }
}
