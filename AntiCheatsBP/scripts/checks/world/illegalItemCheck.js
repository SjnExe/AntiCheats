import * as mc from '@minecraft/server';
// Removed direct imports: addFlag, debugLog, warnPlayer, config values

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is trying to use or place a banned item.
 * @param {mc.Player} player The player performing the action.
 * @param {mc.ItemStack | undefined} itemStack The item stack involved.
 * @param {object} eventData The event data object (must have `cancel` property, and `block` for place action).
 * @param {"use" | "place"} actionType Type of action.
 * @param {PlayerAntiCheatData | undefined} pData Player-specific data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkIllegalItems(player, itemStack, eventData, actionType, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableIllegalItemCheck) return;

    const watchedPrefix = pData?.isWatched ? player.nameTag : null;

    if (!itemStack) {
        // if (playerUtils.debugLog && watchedPrefix) playerUtils.debugLog(`IllegalItemCheck: No itemStack provided for ${player.nameTag}, action ${actionType}.`, watchedPrefix);
        return;
    }

    const itemId = itemStack.typeId;

    if (pData?.isWatched && playerUtils.debugLog) {
         playerUtils.debugLog(`IllegalItemCheck: Processing for ${player.nameTag}. Action: ${actionType}, Item: ${itemId}.`, watchedPrefix);
    }

    let isBanned = false;
    let checkProfileKey = "";
    let violationDetails = {};
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    if (actionType === "place" && config.bannedItemsPlace.includes(itemId)) {
        isBanned = true;
        checkProfileKey = "world_illegal_item_place";
        violationDetails = {
            itemTypeId: itemId,
            action: "place",
            // Ensure eventData.block and eventData.block.location exist for place actions
            blockLocationX: eventData.block?.location?.x,
            blockLocationY: eventData.block?.location?.y,
            blockLocationZ: eventData.block?.location?.z
        };
    } else if (actionType === "use" && config.bannedItemsUse.includes(itemId)) {
        isBanned = true;
        checkProfileKey = "world_illegal_item_use";
        violationDetails = {
            itemTypeId: itemId,
            action: "use",
            sourceTypeId: eventData.source?.typeId || 'unknown' // eventData.source might be the player itself
        };
    }

    if (isBanned) {
        eventData.cancel = true; // Cancel the event immediately
        await executeCheckAction(player, checkProfileKey, violationDetails, dependencies);

        // The original code had a distinction if pData was not available, directly calling warnPlayer.
        // With ensurePlayerDataInitialized, pData should generally be available.
        // If direct feedback to the player is still desired beyond what the action profile's flag reason does,
        // it could be added here, but executeCheckAction should ideally handle notifications/warnings.
        // For example, the flag.reason from the profile can be quite descriptive.
        if (playerUtils.debugLog) playerUtils.debugLog(`Illegal ${actionType} by ${player.nameTag} for item ${itemId}. Event cancelled & action profile triggered.`, watchedPrefix);
    }
}
