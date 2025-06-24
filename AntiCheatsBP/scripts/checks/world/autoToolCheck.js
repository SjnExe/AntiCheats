/**
 * @file Implements a check to detect AutoTool behavior, where a player might rapidly switch
 * to an optimal tool just before breaking a block and potentially switch back immediately after.
 * Relies on various `pData` fields being updated by block break event handlers and the main tick loop.
 */
import * as mc from '@minecraft/server';
import { getOptimalToolForBlock, calculateRelativeBlockBreakingPower } from '../../utils/index.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData;
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies;
 * @typedef {import('../../types.js').Config} Config;
 */

/**
 * Checks for AutoTool behavior by analyzing tool switches around block break events.
 * This involves two parts:
 * 1. Detecting a quick switch to an optimal tool right when a block break attempt starts.
 * 2. Detecting a quick switch away from that optimal tool right after the block is broken.
 * This check is typically run on a tick-based interval.
 *
 * @async
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkAutoTool(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies; // Removed unused playerDataManager, logManager
    const dimension = player.dimension;

    if (!config.enableAutoToolCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const switchToOptimalWindowTicks = config.autoToolSwitchToOptimalWindowTicks ?? 2;
    const switchBackWindowTicks = config.autoToolSwitchBackWindowTicks ?? 5;
    const actionProfileKey = config.autoToolActionProfileName || 'worldAutotool'; // Standardized key

    // Part 1: Detect switch to optimal tool at the start of a break attempt
    if (pData.isAttemptingBlockBreak &&
        pData.breakingBlockLocation &&
        !pData.switchedToOptimalToolForBreak && // Only check if we haven't already flagged this part of the sequence
        pData.lastSelectedSlotChangeTick === currentTick && // Switched tool this very tick
        (currentTick - (pData.breakAttemptStartTick ?? 0) < switchToOptimalWindowTicks)) { // Switched shortly after break attempt started

        const currentSlotIndex = player.selectedSlotIndex;
        const previousSlotIndex = pData.previousSelectedSlotIndex; // Slot before the current switch

        // Ensure the switch was from the slot they started breaking with
        if (previousSlotIndex === pData.slotAtBreakAttemptStart) {
            try {
                const blockPermutation = dimension.getBlock(pData.breakingBlockLocation)?.permutation;
                if (blockPermutation && pData.breakingBlockTypeId === blockPermutation.type.id) { // Verify block hasn't changed
                    const optimalToolInfo = getOptimalToolForBlock(player, blockPermutation); // Pass player and blockPermutation

                    if (optimalToolInfo && currentSlotIndex === optimalToolInfo.slotIndex) {
                        const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                        const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                        const newToolStack = optimalToolInfo.itemStack; // This is the optimal tool

                        const initialPower = calculateRelativeBlockBreakingPower(player, blockPermutation, initialToolStack);
                        const newPower = optimalToolInfo.speed; // Power of the new (optimal) tool

                        // Define what "significantly better" means
                        const isSignificantlyBetter = (newPower > initialPower * 1.5) || // e.g., 50% faster
                                                    (newPower === Infinity && initialPower < 1000) || // e.g., shears vs hand for wool
                                                    (newPower > 5 && initialPower < 1); // e.g., basic tool vs hand for stone

                        if (isSignificantlyBetter) {
                            pData.switchedToOptimalToolForBreak = true; // Mark that an optimal switch occurred for this break event
                            pData.optimalToolSlotForLastBreak = currentSlotIndex; // Store the slot of the optimal tool
                            pData.optimalToolTypeIdForLastBreak = newToolStack?.typeId; // Store type ID
                            pData.isDirtyForSave = true;
                            playerUtils.debugLog(`[AutoToolCheck] Detected switch to optimal tool (${newToolStack?.typeId ?? 'hand'} in slot ${currentSlotIndex}, newPower: ${newPower.toFixed(2)}, oldPower: ${initialPower.toFixed(2)}) for ${pData.breakingBlockTypeId}. Initial slot: ${pData.slotAtBreakAttemptStart}`, watchedPrefix, dependencies);
                        }
                    }
                }
            } catch (error) {
                playerUtils.debugLog(`[AutoToolCheck] Error during optimal tool switch detection for ${player.nameTag}: ${error.message}`, watchedPrefix, dependencies);
                console.error(`[AutoToolCheck] Optimal tool switch error: ${error.stack || error}`);
            }
        }
    }

    // Part 2: Detect switch away from optimal tool shortly after block break completion
    if (pData.switchedToOptimalToolForBreak && // Must have switched to optimal for this break
        pData.optimalToolSlotForLastBreak !== null &&
        pData.lastSelectedSlotChangeTick === currentTick && // Switched tool this very tick
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) < switchBackWindowTicks)) {

        const currentSlotIndex = player.selectedSlotIndex;
        const previousOptimalSlot = pData.optimalToolSlotForLastBreak;

        // If they switched away from the slot that held the optimal tool used for the break
        if (currentSlotIndex !== previousOptimalSlot) {
            const switchedBackToOriginal = (currentSlotIndex === pData.slotAtBreakAttemptStart &&
                                            pData.slotAtBreakAttemptStart !== previousOptimalSlot);

            const violationDetails = {
                blockType: pData.blockBrokenWithOptimalTypeId ?? pData.breakingBlockTypeId ?? 'unknown',
                toolUsed: pData.optimalToolTypeIdForLastBreak ?? 'unknown',
                switchPattern: switchedBackToOriginal ? 'ToOptimalThenBackToOriginal' : 'ToOptimalThenSwitchedAway',
                fromOptimalSlot: previousOptimalSlot.toString(),
                toNewSlot: currentSlotIndex.toString(),
                originalSlotAtBreakStart: (pData.slotAtBreakAttemptStart ?? 'N/A').toString(),
                breakAttemptTick: (pData.breakAttemptStartTick ?? 'N/A').toString(), // Use breakAttemptStartTick
                breakCompleteTick: (pData.lastBreakCompleteTick ?? 'N/A').toString(),
                switchBackTick: currentTick.toString(),
            };

            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[AutoToolCheck] Flagged ${player.nameTag} for switching back after optimal tool use. From: ${previousOptimalSlot}, To: ${currentSlotIndex}`, watchedPrefix, dependencies);

            // Reset state after flagging to prevent re-flagging for the same sequence
            pData.switchedToOptimalToolForBreak = false;
            pData.optimalToolSlotForLastBreak = null;
            pData.blockBrokenWithOptimalTypeId = null;
            pData.optimalToolTypeIdForLastBreak = null;
            // pData.lastBreakCompleteTick = 0; // Keep lastBreakCompleteTick for other potential checks, or reset if specific to AutoTool
            pData.isDirtyForSave = true;
        }
    }

    // Timeout logic for stale break attempts or switch states
    const timeoutForBreakAttempt = config.autoToolBreakAttemptTimeoutTicks ?? 200; // e.g., 10 seconds
    if (pData.isAttemptingBlockBreak && (currentTick - (pData.breakAttemptStartTick ?? 0) > timeoutForBreakAttempt)) {
        playerUtils.debugLog(`[AutoToolCheck] Stale break attempt timed out for ${player.nameTag}. Block: ${pData.breakingBlockTypeId ?? 'N/A'}`, watchedPrefix, dependencies);
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false; // Reset this with the attempt
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        // Don't reset optimalToolSlotForLastBreak here, as that's tied to a completed break
        pData.isDirtyForSave = true;
    }

    // Timeout for the state where we are waiting for a switch-back
    const timeoutForSwitchBackState = (config.autoToolSwitchBackWindowTicks ?? 5) + 20; // A bit longer than the window
    if (pData.optimalToolSlotForLastBreak !== null &&
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) > timeoutForSwitchBackState)) {
        playerUtils.debugLog(`[AutoToolCheck] Stale optimalToolSlotForLastBreak state timed out for ${player.nameTag}. Slot: ${pData.optimalToolSlotForLastBreak}`, watchedPrefix, dependencies);
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false; // Should have been reset or flagged by now
        // pData.lastBreakCompleteTick = 0; // Reset if this state is purely for AutoTool's switch-back part
        pData.isDirtyForSave = true;
    }
}
