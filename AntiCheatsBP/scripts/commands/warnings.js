/**
 * @file AntiCheatsBP/scripts/commands/warnings.js
 * Defines the !warnings command for administrators to view a player's AntiCheat flags.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "warnings",
    syntax: "!warnings <playername>",
    description: "command.warnings.description",
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

/**
 * Executes the warnings command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, addLog, findPlayer } = dependencies;

    if (args.length < 1) {
        player.sendMessage(getString("command.warnings.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName, playerUtils);

    if (!foundPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id);
    if (pData && pData.flags) {
        let warningDetails = getString("command.warnings.header", { playerName: foundPlayer.nameTag }) + "\n";
        warningDetails += getString("command.inspect.totalFlags", { count: pData.flags.totalFlags || 0 }) + "\n";
        warningDetails += getString("command.inspect.lastFlagType", { type: pData.lastFlagType || getString("common.value.none") }) + "\n";
        warningDetails += getString("command.warnings.individualFlagsHeader") + "\n";
        let hasSpecificFlags = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                const lastTime = flagData.lastDetectionTime && flagData.lastDetectionTime > 0 ? new Date(flagData.lastDetectionTime).toLocaleString() : getString("common.value.notApplicable");
                warningDetails += getString("command.inspect.flagEntry", { flagKey: flagKey, count: flagData.count, timestamp: lastTime }) + "\n";
                hasSpecificFlags = true;
            }
        }
        if (!hasSpecificFlags) {
            warningDetails += getString("command.inspect.noSpecificFlags") + "\n";
        }
        player.sendMessage(warningDetails.trim());
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'view_warnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` });
        }
    } else {
        player.sendMessage(getString("command.warnings.noData", { playerName: foundPlayer.nameTag }));
    }
}
