/**
 * @file AntiCheatsBP/scripts/checks/world/autoToolCheck.js
 * Implements a check to detect AutoTool behavior, where a player might rapidly switch
 * to an optimal tool just before breaking a block and potentially switch back immediately after.
 * Relies on various `pData` fields being updated by block break event handlers and the main tick loop.
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';
// Assuming getOptimalToolForBlock and getBlockBreakingSpeed (or its equivalent) are correctly exported from utils.
import { getOptimalToolForBlock, getBlockBreakingSpeed } from '../../utils/index.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks for AutoTool behavior by analyzing tool switches around block break events.
 * This involves two parts:
 * 1. Detecting a quick switch to an optimal tool right when a block break attempt starts.
 * 2. Detecting a quick switch away from that optimal tool right after the block is broken.
 *
 * Expected `pData` fields managed by other systems:
 * - `isAttemptingBlockBreak`, `breakingBlockLocation`, `breakingBlockTypeId`, `slotAtBreakAttemptStart`: Set by `handlePlayerBreakBlockBeforeEvent`.
 * - `lastSelectedSlotChangeTick`, `previousSelectedSlotIndex`: Set by `updateTransientPlayerData`.
 * - `lastBreakCompleteTick`, `optimalToolSlotForLastBreak`, `blockBrokenWithOptimalTypeId`, `optimalToolTypeIdForLastBreak`: Set by `handlePlayerBreakBlockAfterEvent`.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @param {mc.Dimension} dimension - The dimension the player is in (used to get block permutations).
 * @returns {Promise<void>}
 */
export async function checkAutoTool(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick,
    dimension // Passed from main.js tick loop
) {
    if (!config.enableAutoToolCheck || !pData) { return; }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const switchToOptimalWindow = config.autoToolSwitchToOptimalWindowTicks ?? 2;
    const switchBackWindow = config.autoToolSwitchBackWindowTicks ?? 5;

    // Part 1: Detect switch to optimal tool just before/at the start of break
    if (pData.isAttemptingBlockBreak &&
        pData.breakingBlockLocation &&
        !pData.switchedToOptimalToolForBreak &&
        pData.lastSelectedSlotChangeTick === currentTick &&
        (currentTick - (pData.breakAttemptTick ?? 0) < switchToOptimalWindow)) {

        const currentSlotIndex = player.selectedSlotIndex;
        const previousSlotIndex = pData.previousSelectedSlotIndex;

        // Ensure the switch is from the slot held when break was initiated
        if (previousSlotIndex === pData.slotAtBreakAttemptStart) {
            const blockPermutation = dimension.getBlock(pData.breakingBlockLocation)?.permutation;
            // Verify block hasn't changed unexpectedly
            if (blockPermutation && pData.breakingBlockTypeId === blockPermutation.type.id) {
                const optimalToolInfo = getOptimalToolForBlock(player, blockPermutation);

                if (optimalToolInfo && currentSlotIndex === optimalToolInfo.slotIndex) {
                    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                    const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                    const newToolStack = optimalToolInfo.itemStack; // Optimal tool stack

                    // Assuming getBlockBreakingSpeed returns a comparable "power" score like calculateRelativeBlockBreakingPower
                    const initialSpeed = getBlockBreakingSpeed(player, blockPermutation, initialToolStack);
                    const newSpeed = optimalToolInfo.speed; // Power score from getOptimalToolForBlock

                    // Significance check: new tool is much faster, or old was hand and new is proper, or new is instant (e.g. shears)
                    const isSignificantlyBetter = (newSpeed > initialSpeed * 1.5) ||
                                                (initialSpeed < 1 && newSpeed > 1 && newSpeed !== Infinity) ||
                                                (newSpeed === Infinity && initialSpeed < 1000); // Shears vs non-shearable

                    if (isSignificantlyBetter) {
                        pData.switchedToOptimalToolForBreak = true;
                        // AutoTool state is transient and typically doesn't need saving across sessions.
                        // If it were persisted, pData.isDirtyForSave = true; would be needed.
                        playerUtils.debugLog?.(`AutoTool: Detected switch to optimal tool (${newToolStack?.typeId ?? 'hand'} in slot ${currentSlotIndex}) for ${pData.breakingBlockTypeId}. Initial slot: ${pData.slotAtBreakAttemptStart}`, watchedPrefix);
                    }
                }
            }
        }
    }

    // Part 2: Detect switch back from optimal tool just after break
    if (pData.optimalToolSlotForLastBreak !== null &&
        pData.lastSelectedSlotChangeTick === currentTick &&
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) < switchBackWindow)) {

        const currentSlotIndex = player.selectedSlotIndex;
        const previousOptimalSlot = pData.optimalToolSlotForLastBreak;

        if (currentSlotIndex !== previousOptimalSlot) {
            const switchedBackToOriginal = (currentSlotIndex === pData.slotAtBreakAttemptStart &&
                                            pData.slotAtBreakAttemptStart !== previousOptimalSlot);

            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                blockType: pData.blockBrokenWithOptimalTypeId ?? pData.breakingBlockTypeId ?? "unknown",
                toolUsed: pData.optimalToolTypeIdForLastBreak ?? "unknown",
                switchPattern: switchedBackToOriginal ? "ToOptimalThenBackToOriginal" : "ToOptimalThenSwitchedAway",
                fromOptimalSlot: previousOptimalSlot.toString(),
                toNewSlot: currentSlotIndex.toString(),
                originalSlotAtBreakStart: (pData.slotAtBreakAttemptStart ?? 'N/A').toString(),
                breakAttemptTick: (pData.breakAttemptTick ?? 'N/A').toString(),
                breakCompleteTick: (pData.lastBreakCompleteTick ?? 'N/A').toString(),
                switchBackTick: currentTick.toString()
            };
            const autoToolActionProfile = config.autoToolActionProfileName ?? "world_autotool";
            await executeCheckAction(player, autoToolActionProfile, violationDetails, dependencies);
            playerUtils.debugLog?.(`AutoTool: Flagged ${player.nameTag} for switching back after optimal tool use. From: ${previousOptimalSlot}, To: ${currentSlotIndex}`, watchedPrefix);

            // Reset state after flagging
            pData.switchedToOptimalToolForBreak = false;
            pData.optimalToolSlotForLastBreak = null;
            pData.blockBrokenWithOptimalTypeId = null;
            pData.optimalToolTypeIdForLastBreak = null;
            pData.lastBreakCompleteTick = 0;
            // No explicit isDirtyForSave here, as these fields are transient for the check's internal state.
        }
    }

    // Cleanup stale autotool states to prevent them from persisting incorrectly or causing issues
    const timeoutForBreakAttempt = 200; // Approx 10 seconds
    if (pData.isAttemptingBlockBreak && (currentTick - (pData.breakAttemptTick ?? 0) > timeoutForBreakAttempt)) {
        playerUtils.debugLog?.(`AutoTool: Stale break attempt timed out for ${player.nameTag}. Block: ${pData.breakingBlockTypeId ?? 'N/A'}`, watchedPrefix);
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        pData.blockBrokenWithOptimalTypeId = null; // Clear logging fields too
        pData.optimalToolTypeIdForLastBreak = null;
    }

    // Timeout for state waiting for a switch-back
    const timeoutForSwitchBackState = switchBackWindow + 20; // A bit longer than the detection window
    if (pData.optimalToolSlotForLastBreak !== null &&
        (pData.lastBreakCompleteTick ?? 0) > 0 && // Ensure there was a completed break
        (currentTick - (pData.lastBreakCompleteTick ?? 0) > timeoutForSwitchBackState)) {
        playerUtils.debugLog?.(`AutoTool: Stale optimalToolSlotForLastBreak state timed out for ${player.nameTag}. Slot: ${pData.optimalToolSlotForLastBreak}`, watchedPrefix);
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false; // Reset this as well
        pData.lastBreakCompleteTick = 0;
    }
}
