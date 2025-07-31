/**
 * @typedef {import('../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../types.js').Dependencies} Dependencies
 */

/**
 * Flags a player for a specific cheat detection.
 * @param {import('@minecraft/server').Player} player The player to flag.
 * @param {string} checkType The type of check that was triggered.
 * @param {import('../types.js').ViolationDetails} violationDetails Details about the violation.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function flag(player, checkType, violationDetails, dependencies) {
    const { playerDataManager, actionManager, config } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);

    if (!pData) {
        return;
    }

    pData.flags[checkType] = (pData.flags[checkType] || 0) + 1;
    pData.isDirtyForSave = true;

    const checkConfig = config.checks[checkType];
    if (checkConfig && pData.flags[checkType] >= checkConfig.minVlbeforePunishment) {
        await actionManager.executeCheckAction(player, checkType, violationDetails, dependencies);
    }
}
