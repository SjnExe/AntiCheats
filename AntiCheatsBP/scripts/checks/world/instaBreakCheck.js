import * as mc from '@minecraft/server';

/**
 * Checks if a player is attempting to break an unbreakable block.
 * This function should be called from a PlayerBreakBlockBeforeEvent handler.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData The event data from PlayerBreakBlockBeforeEvent.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkBreakUnbreakable(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableInstaBreakUnbreakableCheck) return;

    const blockTypeId = eventData.block.typeId;

    if (config.instaBreakUnbreakableBlocks.includes(blockTypeId)) {
        // Check for admin/op bypass if needed. For now, assume all non-creative players are subject to this.
        // A more robust permission check might involve player.getCommandPermissionLevel() or specific tags.
        if (player.gameMode !== mc.GameMode.creative) { // Creative mode players can break anything
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                blockType: blockTypeId,
                x: eventData.block.location.x,
                y: eventData.block.location.y,
                z: eventData.block.location.z,
                playerName: player.nameTag
            };

            await executeCheckAction(player, "world_instabreak_unbreakable", violationDetails, dependencies);
            eventData.cancel = true; // Prevent the block from being broken

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`InstaBreak: \${player.nameTag} attempt to break unbreakable block \${blockTypeId} cancelled.\`, watchedPrefix);
            }
        } else {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (playerUtils.debugLog) { // Log even for creative if watched, for info
                 playerUtils.debugLog(\`InstaBreak: Creative player \${player.nameTag} broke normally unbreakable block \${blockTypeId}.\`, watchedPrefix);
            }
        }
    }
}

import { getExpectedBreakTicks } from '../../utils/index.js'; // Import the new utility

export async function checkBreakSpeed(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableInstaBreakSpeedCheck) return;

    // This check runs on PlayerBreakBlockAfterEvent
    const blockTypeId = eventData.brokenBlockPermutation.type.id;
    const blockLocation = eventData.block.location;

    // Ensure this is the same block break attempt we timed
    if (pData.breakingBlockTypeId === blockTypeId &&
        pData.breakingBlockLocation &&
        pData.breakingBlockLocation.x === blockLocation.x &&
        pData.breakingBlockLocation.y === blockLocation.y &&
        pData.breakingBlockLocation.z === blockLocation.z &&
        pData.breakStartTickGameTime > 0) {

        const actualDurationTicks = currentTick - pData.breakStartTickGameTime;
        // expectedBreakDurationTicks should have been calculated and stored in pData by PlayerBreakBlockBeforeEvent handler
        const expectedTicks = pData.expectedBreakDurationTicks;

        if (expectedTicks === Infinity && actualDurationTicks < 1000) { // Broke something "unbreakable" very fast (e.g. <50s for bedrock)
                                                                     // This might be redundant if checkBreakUnbreakable works perfectly, but provides a fallback.
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                blockType: blockTypeId,
                expectedTicks: "Infinity",
                actualTicks: actualDurationTicks,
                x: blockLocation.x, y: blockLocation.y, z: blockLocation.z,
                tool: pData.toolUsedForBreakAttempt || "unknown"
            };
            await executeCheckAction(player, "world_instabreak_speed", violationDetails, dependencies); // Could use a specific profile if desired
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`InstaBreak (Speed): \${player.nameTag} broke \${blockTypeId} (expected Infinity) in \${actualDurationTicks}t.\`, watchedPrefix);
            }
        } else if (expectedTicks > 0 && actualDurationTicks < (expectedTicks - config.instaBreakTimeToleranceTicks)) {
            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                blockType: blockTypeId,
                expectedTicks: expectedTicks,
                actualTicks: actualDurationTicks,
                x: blockLocation.x, y: blockLocation.y, z: blockLocation.z,
                tool: pData.toolUsedForBreakAttempt || "unknown"
            };
            await executeCheckAction(player, "world_instabreak_speed", violationDetails, dependencies);
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`InstaBreak (Speed): \${player.nameTag} broke \${blockTypeId} in \${actualDurationTicks}t (expected \${expectedTicks}t).\`, watchedPrefix);
            }
        }
    }
    // Reset timing fields after check, regardless of whether it was the same block or flagged.
    // This is important because a new break attempt might start on a different block immediately.
    pData.breakStartTimeMs = 0;
    pData.breakStartTickGameTime = 0;
    pData.expectedBreakDurationTicks = 0;
    pData.toolUsedForBreakAttempt = null;
    // pData.breakingBlockTypeId and pData.breakingBlockLocation are reset by AutoTool's event handler logic or the beforeBreak event for the next block.
    // For InstaBreak, we clear them here if a break completed to ensure they are fresh for the next PlayerBreakBlockBeforeEvent.
    // However, if AutoTool also relies on them, ensure order of operations or that AutoTool clears them if its sequence completes/aborts.
    // Given AutoTool also resets isAttemptingBlockBreak, this should be fine.
}
