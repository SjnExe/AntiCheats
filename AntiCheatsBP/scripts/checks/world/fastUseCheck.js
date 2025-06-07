/**
 * @file AntiCheatsBP/scripts/checks/world/fastUseCheck.js
 * Implements a check to detect if a player is using items faster than their configured cooldowns allow.
 * Relies on `pData.itemUseTimestamps` to track the last usage time for each item type.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks for overly fast item usage based on configured cooldowns for specific item types.
 * Timestamps of item usage are stored in `pData.itemUseTimestamps`.
 *
 * @param {mc.Player} player - The player instance using the item.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.ItemStack} itemStack - The item stack being used.
 * @param {Config} config - The server configuration object, containing `enableFastUseCheck`
 *                          and `fastUseItemCooldowns`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkFastUse(
    player,
    pData,
    itemStack,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableFastUseCheck || !pData) { // Added null check for pData
        return;
    }

    const itemTypeId = itemStack.typeId;
    // Ensure fastUseItemCooldowns exists and is an object in config
    const cooldown = config.fastUseItemCooldowns?.[itemTypeId];

    if (typeof cooldown !== 'number') { // Item not tracked or cooldown not a number
        // playerUtils.debugLog?.(`FastUseCheck: Item ${itemTypeId} not tracked or invalid cooldown.`, pData.isWatched ? player.nameTag : null);
        return;
    }

    const currentTime = Date.now();
    // Initialize itemUseTimestamps if it doesn't exist
    pData.itemUseTimestamps = pData.itemUseTimestamps || {};
    const lastUseTime = pData.itemUseTimestamps[itemTypeId] || 0; // Default to 0 if never used

    const timeSinceLastUse = currentTime - lastUseTime;

    if (timeSinceLastUse < cooldown) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            itemType: itemTypeId,
            cooldownMs: cooldown.toString(),
            actualTimeMs: timeSinceLastUse.toString()
        };
        // Action profile name: config.fastUseActionProfileName ?? "action_fast_use"
        await executeCheckAction(player, "action_fast_use", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog?.(
            `FastUse: Flagged ${player.nameTag} for using ${itemTypeId} too fast. Actual: ${timeSinceLastUse}ms, Cooldown: ${cooldown}ms`,
            watchedPrefix
        );
    }

    // Update the last use timestamp for this item type regardless of flagging.
    pData.itemUseTimestamps[itemTypeId] = currentTime;
    pData.isDirtyForSave = true; // Mark pData as dirty because itemUseTimestamps changed.
}
