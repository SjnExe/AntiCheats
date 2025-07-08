/**
 * @file Implements a check to detect if a player is using items faster than their configured cooldowns allow.
 * Relies on `pData.itemUseTimestamps` to track the last usage time for each item type.
 */

/**
 * Checks for overly fast item usage based on configured cooldowns for specific item types.
 * Timestamps of item usage are stored in `pData.itemUseTimestamps`.
 * This check is typically called from an `ItemUseBeforeEvent` or `ItemUseOnBeforeEvent` handler.
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance using the item.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Object containing necessary dependencies.
 * @param {import('../../types.js').EventSpecificData} eventSpecificData - Data specific to the event, expects `itemStack`.
 * @returns {Promise<void>}
 */
export async function checkFastUse(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const itemStack = eventSpecificData?.itemStack;

    if (!config.enableFastUseCheck || !pData || !itemStack) {
        return;
    }

    const itemTypeId = itemStack.typeId;
    const cooldown = config.fastUseItemCooldowns?.[itemTypeId];

    if (typeof cooldown !== 'number' || cooldown <= 0) {
        if (config.enableDebugLogging && pData.isWatched) {
            playerUtils.debugLog(`[FastUseCheck] Item ${itemTypeId} not tracked or invalid cooldown in config for player ${player.nameTag}. Cooldown: ${cooldown}`, pData.isWatched ? player.nameTag : null, dependencies);
        }
        return;
    }

    const currentTime = Date.now();
    pData.itemUseTimestamps ??= {};
    const lastUseTime = pData.itemUseTimestamps[itemTypeId] || 0;

    const timeSinceLastUseMs = currentTime - lastUseTime;

    if (timeSinceLastUseMs < cooldown) {
        const violationDetails = {
            itemType: itemTypeId,
            cooldownMs: cooldown.toString(),
            actualTimeMs: timeSinceLastUseMs.toString(),
        };
        const rawActionProfileKey = config.fastUseActionProfileName ?? 'actionFastUse';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[FastUseCheck] Flagged ${player.nameTag} for using ${itemTypeId} too fast. Actual: ${timeSinceLastUseMs}ms, Cooldown: ${cooldown}ms`,
            watchedPrefix, dependencies,
        );
    }

    pData.itemUseTimestamps[itemTypeId] = currentTime;
    pData.isDirtyForSave = true;
}
