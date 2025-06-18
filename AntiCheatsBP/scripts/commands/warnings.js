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
    const { config, playerUtils, playerDataManager, logManager, getString, permissionLevels } = dependencies;
    const findPlayer = playerUtils.findPlayer;

    // definition.description = getString("command.warnings.description");
    // definition.permissionLevel = permissionLevels.admin;

    if (args.length < 1) {
        player.sendMessage(getString("command.warnings.usage", { prefix: config.prefix }));
        return;
    }
    const targetPlayerName = args[0];
    const foundPlayer = findPlayer(targetPlayerName);

    if (!foundPlayer) {
        player.sendMessage(getString("common.error.invalidPlayer", { targetName: targetPlayerName }));
        return;
    }

    const pData = playerDataManager.getPlayerData(foundPlayer.id); // Pass dependencies if getPlayerData expects it
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
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'view_warnings', targetName: foundPlayer.nameTag, details: `Viewed warnings for ${foundPlayer.nameTag}` }, dependencies);
    } else {
        player.sendMessage(getString("command.warnings.noData", { playerName: foundPlayer.nameTag }));
    }
}
