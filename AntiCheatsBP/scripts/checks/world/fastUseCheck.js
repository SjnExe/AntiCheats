/**
 * @file Implements a check to detect if a player is using items faster than their configured cooldowns allow.
 * Relies on `pData.itemUseTimestamps` to track the last usage time for each item type.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData; // Expects itemStack
 * @typedef {import('../../types.js').Config} Config;
 */

/**
 * Checks for overly fast item usage based on configured cooldowns for specific item types.
 * Timestamps of item usage are stored in `pData.itemUseTimestamps`.
 * This check is typically called from an `ItemUseBeforeEvent` or `ItemUseOnBeforeEvent` handler.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance using the item.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack`.
 * @returns {Promise<void>}
 */
export async function checkFastUse(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies; // Removed unused playerDataManager, logManager
    const itemStack = eventSpecificData?.itemStack;

    if (!config.enableFastUseCheck || !pData || !itemStack) {
        return;
    }

    const itemTypeId = itemStack.typeId;
    const cooldown = config.fastUseItemCooldowns?.[itemTypeId];

    // If item is not in cooldown config, or cooldown is not a valid number, skip
    if (typeof cooldown !== 'number' || cooldown <= 0) {
        if (config.enableDebugLogging && pData.isWatched) { // Log only if relevant
            playerUtils.debugLog(`[FastUseCheck] Item ${itemTypeId} not tracked or invalid cooldown in config for player ${player.nameTag}. Cooldown: ${cooldown}`, pData.isWatched ? player.nameTag : null, dependencies);
        }
        return;
    }

    const currentTime = Date.now();
    pData.itemUseTimestamps = pData.itemUseTimestamps || {}; // Initialize if not present
    const lastUseTime = pData.itemUseTimestamps[itemTypeId] || 0; // Default to 0 if no previous use

    const timeSinceLastUseMs = currentTime - lastUseTime;

    if (timeSinceLastUseMs < cooldown) {
        const violationDetails = {
            itemType: itemTypeId,
            cooldownMs: cooldown.toString(),
            actualTimeMs: timeSinceLastUseMs.toString(),
        };
        // Standardized action profile key
        const actionProfileKey = config.fastUseActionProfileName || 'actionFastUse';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[FastUseCheck] Flagged ${player.nameTag} for using ${itemTypeId} too fast. Actual: ${timeSinceLastUseMs}ms, Cooldown: ${cooldown}ms`,
            watchedPrefix, dependencies
        );
        // Note: Event cancellation for ItemUseBeforeEvent would typically be handled by the actionProfile if configured.
        // This function itself doesn't directly cancel, it relies on the actionManager's interpretation of the profile.
    }

    // Update the last use timestamp for this item type
    pData.itemUseTimestamps[itemTypeId] = currentTime;
    pData.isDirtyForSave = true;
}
