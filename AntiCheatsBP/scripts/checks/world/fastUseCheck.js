/**
 * @file AntiCheatsBP/scripts/checks/world/fastUseCheck.js
 * Implements a check to detect if a player is using items faster than their configured cooldowns allow.
 * Relies on `pData.itemUseTimestamps` to track the last usage time for each item type.
 * @version 1.1.0
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks for overly fast item usage based on configured cooldowns for specific item types.
 * Timestamps of item usage are stored in `pData.itemUseTimestamps`.
 *
 * @param {import('@minecraft/server').Player} player - The player instance using the item.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack`.
 * @returns {Promise<void>}
 */
export async function checkFastUse(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;
    const itemStack = eventSpecificData?.itemStack;

    if (!config.enableFastUseCheck || !pData || !itemStack) {
        return;
    }

    const itemTypeId = itemStack.typeId;
    const cooldown = config.fastUseItemCooldowns?.[itemTypeId];

    if (typeof cooldown !== 'number') {
        // This log is fine as is, or could be prefixed if desired, but it's a config/setup notice.
        // For consistency, we'll update it.
        playerUtils.debugLog(`[FastUseCheck] Item ${itemTypeId} not tracked or invalid cooldown in config for player ${player.nameTag}.`, pData.isWatched ? player.nameTag : null, dependencies);
        return;
    }

    const currentTime = Date.now();
    pData.itemUseTimestamps = pData.itemUseTimestamps || {};
    const lastUseTime = pData.itemUseTimestamps[itemTypeId] || 0;

    const timeSinceLastUse = currentTime - lastUseTime;

    if (timeSinceLastUse < cooldown) {
        const violationDetails = {
            itemType: itemTypeId,
            cooldownMs: cooldown.toString(),
            actualTimeMs: timeSinceLastUse.toString()
        };
        const profileName = config.fastUseActionProfileName ?? "actionFastUse"; // Ensure consistent profile naming
        await actionManager.executeCheckAction(player, profileName, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[FastUseCheck] Flagged ${player.nameTag} for using ${itemTypeId} too fast. Actual: ${timeSinceLastUse}ms, Cooldown: ${cooldown}ms`,
            watchedPrefix, dependencies
        );
    }

    pData.itemUseTimestamps[itemTypeId] = currentTime;
    pData.isDirtyForSave = true;
}
