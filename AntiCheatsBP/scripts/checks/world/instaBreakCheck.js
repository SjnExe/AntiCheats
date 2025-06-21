/**
 * @file AntiCheatsBP/scripts/checks/world/instaBreakCheck.js
 * Implements checks for InstaBreak, including breaking unbreakable blocks and breaking blocks faster than possible.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';
// getExpectedBreakTicks is used by eventHandlers.js to populate pData.expectedBreakDurationTicks, not directly here.
// import { getExpectedBreakTicks } from '../../utils/index.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is attempting to break an "unbreakable" block (e.g., bedrock)
 * when not in Creative mode.
 * This function should be called from a `PlayerBreakBlockBeforeEvent` handler.
 * Note: For optimal performance with very large `instaBreakUnbreakableBlocks` lists,
 * consider converting it to a Set during config loading.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData - The event data from `PlayerBreakBlockBeforeEvent`.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkBreakUnbreakable(
    player,
    pData,
    eventData,
    dependencies
) {
    const { config, playerUtils, actionManager, playerDataManager, logManager } = dependencies;

    if (!config.enableInstaBreakUnbreakableCheck || !pData) {
        return;
    }

    const blockTypeId = eventData.block.typeId;
    const unbreakableBlocks = config.instaBreakUnbreakableBlocks ?? [];

    if (unbreakableBlocks.includes(blockTypeId)) {
        if (player.gameMode !== mc.GameMode.creative) {
            // Pass the full dependencies object to executeCheckAction
            const violationDetails = {
                blockType: blockTypeId,
                x: eventData.block.location.x.toString(),
                y: eventData.block.location.y.toString(),
                z: eventData.block.location.z.toString(),
                playerName: player.nameTag
            };
            await actionManager.executeCheckAction(player, "worldInstabreakUnbreakable", violationDetails, dependencies);
            eventData.cancel = true; // Prevent the block from being broken

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(`[InstaBreakCheck] (Unbreakable): ${player.nameTag} attempt to break \`${blockTypeId}\` cancelled.`, watchedPrefix, dependencies);
        } else {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(`[InstaBreakCheck] (Unbreakable): Creative player ${player.nameTag} broke normally unbreakable block \`${blockTypeId}\`. Allowed.`, watchedPrefix, dependencies);
        }
    }
}

/**
 * Checks if a player broke a block faster than legitimately possible.
 * This function is called from a `PlayerBreakBlockAfterEvent` handler and relies on timing information
 * (e.g., `pData.breakStartTickGameTime`, `pData.expectedBreakDurationTicks`) being set in `pData`
 * by the `PlayerBreakBlockBeforeEvent` handler (usually in `eventHandlers.js` calling `getExpectedBreakTicks`).
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData - The event data from `PlayerBreakBlockAfterEvent`.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkBreakSpeed(
    player,
    pData,
    eventData,
    dependencies
) {
    const { config, playerUtils, actionManager, playerDataManager, logManager, currentTick } = dependencies;

    if (!config.enableInstaBreakSpeedCheck || !pData) {
        return;
    }

    const blockTypeId = eventData.brokenBlockPermutation.type.id;
    const blockLocation = eventData.block.location; // Location of the block that was broken

    // Ensure this is the same block break attempt we timed in the BeforeEvent
    if (pData.breakingBlockTypeId === blockTypeId &&
        pData.breakingBlockLocation &&
        pData.breakingBlockLocation.x === blockLocation.x &&
        pData.breakingBlockLocation.y === blockLocation.y &&
        pData.breakingBlockLocation.z === blockLocation.z &&
        (pData.breakStartTickGameTime ?? 0) > 0) { // Ensure breakStartTickGameTime was set

        const actualDurationTicks = currentTick - pData.breakStartTickGameTime;
        const expectedTicks = pData.expectedBreakDurationTicks ?? Infinity; // Default to Infinity if not set
        const tolerance = config.instaBreakTimeToleranceTicks ?? 2; // Default tolerance of 2 ticks

        const watchedPrefix = pData.isWatched ? player.nameTag : null;
        playerUtils.debugLog(
            `[InstaBreakCheck] (Speed Eval): Player ${player.nameTag} broke ${blockTypeId}. ` +
            `Actual: ${actualDurationTicks}t, Expected: ${expectedTicks}t, Tolerance: ${tolerance}t, ` +
            `Tool: ${pData.toolUsedForBreakAttempt ?? "unknown"}`,
            watchedPrefix, dependencies
        );

        let flagged = false;
        // Case 1: Broke a block that should be "unbreakable" (expectedTicks = Infinity) very fast.
        // This is a fallback for checkBreakUnbreakable or for blocks with extremely high hardness not in the "unbreakable" list.
        if (expectedTicks === Infinity && actualDurationTicks < 1000) { // e.g., broke in <50s
            flagged = true;
        }
        // Case 2: Broke a normal block faster than expected minus tolerance.
        // Ensure expectedTicks is a finite number greater than 0 for this comparison.
        else if (expectedTicks > 0 && expectedTicks !== Infinity && actualDurationTicks < (expectedTicks - tolerance)) {
            flagged = true;
        }

        if (flagged) {
            // Pass the full dependencies object to executeCheckAction
            const violationDetails = {
                blockType: blockTypeId,
                expectedTicks: expectedTicks === Infinity ? "Infinity" : expectedTicks.toString(),
                actualTicks: actualDurationTicks.toString(),
                toleranceTicks: tolerance.toString(),
                x: blockLocation.x.toString(),
                y: blockLocation.y.toString(),
                z: blockLocation.z.toString(),
                toolUsed: pData.toolUsedForBreakAttempt ?? "unknown"
            };
            await actionManager.executeCheckAction(player, "worldInstabreakSpeed", violationDetails, dependencies);
            playerUtils.debugLog(`[InstaBreakCheck] (Speed): Flagged ${player.nameTag} for breaking ${blockTypeId} in ${actualDurationTicks}t (Expected: ${expectedTicks}t, Tool: ${pData.toolUsedForBreakAttempt ?? 'unknown'}).`, watchedPrefix, dependencies);
        }
    }

    // Reset timing and break-specific fields in pData after every break attempt is processed (flagged or not).
    // This ensures they are clean for the next PlayerBreakBlockBeforeEvent.
    // These fields are transient for a single break action.
    if (pData.breakStartTickGameTime || pData.toolUsedForBreakAttempt) { // Check if any field was set
        pData.isDirtyForSave = true; // Mark dirty if these transient (but potentially logged/persisted) fields change
    }
    pData.breakStartTimeMs = 0; // Not used by this check, but reset for consistency if set by BeforeEvent
    pData.breakStartTickGameTime = 0;
    pData.expectedBreakDurationTicks = 0;
    pData.toolUsedForBreakAttempt = null;
    // pData.breakingBlockTypeId and pData.breakingBlockLocation are typically reset by the next BeforeEvent
    // or by AutoTool's logic. No need to reset them here as they identify the *completed* break.
    // However, if AutoTool is disabled, they might need resetting here to avoid stale data if player stops breaking.
    // For now, assume other mechanisms handle their lifecycle for future "isAttemptingBlockBreak" states.
}
