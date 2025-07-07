/**
 * @file Implements checks for InstaBreak, including breaking unbreakable blocks
 * and breaking blocks significantly faster than legitimately possible.
 */
import * as mc from '@minecraft/server';

/**
 * Checks if a player is attempting to break an "unbreakable" block (e.g., bedrock)
 * when not in Creative mode.
 * This function should be called from a `PlayerBreakBlockBeforeEvent` handler.
 *
 * @async
 * @param {mc.Player} player - The player instance.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData - The event data from `PlayerBreakBlockBeforeEvent`.
 * @param {import('../../types.js').Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkBreakUnbreakable(player, pData, eventData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.enableInstaBreakUnbreakableCheck || !pData) {
        return;
    }

    const blockTypeId = eventData.block.typeId;
    const unbreakableBlocks = config.instaBreakUnbreakableBlocks ?? [];

    if (unbreakableBlocks.includes(blockTypeId)) {
        if (player.gameMode !== mc.GameMode.creative) {
            const violationDetails = {
                blockType: blockTypeId,
                x: eventData.block.location.x.toString(),
                y: eventData.block.location.y.toString(),
                z: eventData.block.location.z.toString(),
                playerName: player.nameTag,
            };
            const rawActionProfileKey = config.instaBreakUnbreakableActionProfileName ?? 'worldInstaBreakUnbreakable';
            const actionProfileKey = rawActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());

            // For this specific check, cancellation is intrinsic to the detection of breaking an unbreakable block.
            // The actionManager.executeCheckAction is primarily for logging/flagging this event.
            // The decision to cancel is made here, not based on a profile.
            // For this specific check, cancellation is intrinsic.
            // Set cancel before await to satisfy linter.
            eventData.cancel = true;

            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            // The if(shouldCancel) is now redundant as eventData.cancel is already set.
            // const shouldCancel = true; // This variable is no longer strictly needed here.

            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(`[InstaBreakCheck](Unbreakable): ${player.nameTag} attempt to break '${blockTypeId}' cancelled.`, watchedPrefix, dependencies);
        }
        else {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            playerUtils.debugLog(`[InstaBreakCheck](Unbreakable): Creative player ${player.nameTag} broke normally unbreakable block '${blockTypeId}'. Allowed.`, watchedPrefix, dependencies);
        }
    }
}

/**
 * Checks if a player broke a block faster than legitimately possible.
 * This function is called from a `PlayerBreakBlockAfterEvent` handler and relies on timing information
 * (e.g., `pData.breakStartTickGameTime`, `pData.expectedBreakDurationTicks`) being set in `pData`
 * by the `PlayerBreakBlockBeforeEvent` handler (which should call `getExpectedBreakTicks` from `itemUtils.js`).
 *
 * @async
 * @param {mc.Player} player - The player instance.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData - The event data from `PlayerBreakBlockAfterEvent`.
 * @param {import('../../types.js').Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkBreakSpeed(player, pData, eventData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;

    if (!config.enableInstaBreakSpeedCheck || !pData) {
        return;
    }

    const blockTypeId = eventData.brokenBlockPermutation.type.id;
    const blockLocation = eventData.block.location;

    if (
        pData.breakingBlockTypeId === blockTypeId &&
        pData.breakingBlockLocation &&
        pData.breakingBlockLocation.x === blockLocation.x &&
        pData.breakingBlockLocation.y === blockLocation.y &&
        pData.breakingBlockLocation.z === blockLocation.z &&
        (pData.breakStartTickGameTime ?? 0) > 0
    ) {
        const actualDurationTicks = currentTick - pData.breakStartTickGameTime;
        const expectedTicks = pData.expectedBreakDurationTicks ?? Infinity;
        const tolerance = config.instaBreakTimeToleranceTicks ?? 2;

        if (pData.isWatched || config.enableDebugLogging) {
            playerUtils.debugLog(
                `[InstaBreakCheck](Speed Eval): Player ${player.nameTag} broke ${blockTypeId}. ` +
                `Actual: ${actualDurationTicks}t, Expected: ${expectedTicks === Infinity ? 'Inf' : expectedTicks}t, Tolerance: ${tolerance}t, ` +
                `Tool: ${pData.toolUsedForBreakAttempt ?? 'unknown'}`,
                pData.isWatched ? player.nameTag : null, dependencies,
            );
        }

        let flagged = false;
        if (expectedTicks === Infinity && actualDurationTicks < 1000) {
            flagged = true;
        }
        else if (expectedTicks > 0 && expectedTicks !== Infinity && actualDurationTicks < (expectedTicks - tolerance)) {
            flagged = true;
        }

        if (flagged) {
            const violationDetails = {
                blockType: blockTypeId,
                expectedTicks: expectedTicks === Infinity ? 'Infinity' : expectedTicks.toString(),
                actualTicks: actualDurationTicks.toString(),
                toleranceTicks: tolerance.toString(),
                x: blockLocation.x.toString(),
                y: blockLocation.y.toString(),
                z: blockLocation.z.toString(),
                toolUsed: pData.toolUsedForBreakAttempt ?? 'unknown',
            };
            const rawActionProfileKey = config.instaBreakSpeedActionProfileName ?? 'worldInstaBreakSpeed';
            const actionProfileKey = rawActionProfileKey
                .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
                .replace(/^[A-Z]/, (match) => match.toLowerCase());
            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[InstaBreakCheck](Speed): Flagged ${player.nameTag} for breaking ${blockTypeId} in ${actualDurationTicks}t (Expected: ${expectedTicks === Infinity ? 'Inf' : expectedTicks}t, Tool: ${pData.toolUsedForBreakAttempt ?? 'unknown'}).`, pData.isWatched ? player.nameTag : null, dependencies);
        }
    }

    if (pData.breakStartTickGameTime || pData.toolUsedForBreakAttempt || pData.breakingBlockTypeId) {
        pData.isDirtyForSave = true;
    }
    pData.breakStartTickGameTime = 0;
    pData.expectedBreakDurationTicks = 0;
    pData.breakingBlockTypeId = null;
    pData.breakingBlockLocation = null;
    pData.toolUsedForBreakAttempt = null;
}
