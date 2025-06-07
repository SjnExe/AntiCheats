import * as mc from '@minecraft/server';

/**
 * Checks for overly fast item usage based on configured cooldowns.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.ItemStack} itemStack The item being used.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkFastUse(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableFastUseCheck) return;

    const itemTypeId = itemStack.typeId;
    const cooldown = config.fastUseItemCooldowns[itemTypeId];

    if (cooldown === undefined) { // Item not tracked for fast use
        return;
    }

    const currentTime = Date.now();
    const lastUseTime = pData.itemUseTimestamps[itemTypeId] || 0; // Default to 0 if never used

    if ((currentTime - lastUseTime) < cooldown) {
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        const violationDetails = {
            itemType: itemTypeId,
            cooldown: cooldown,
            actualTime: (currentTime - lastUseTime)
        };
        // Using "action_fast_use" as the checkType string to match the profile key
        await executeCheckAction(player, "action_fast_use", violationDetails, dependencies);

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`FastUse: Flagged \${player.nameTag} for using \${itemTypeId} too fast. Actual: \${(currentTime - lastUseTime)}ms, Cooldown: \${cooldown}ms\`, watchedPrefix);
        }
    }
    // Update the last use timestamp for this item type regardless of flagging
    pData.itemUseTimestamps[itemTypeId] = currentTime;
}
