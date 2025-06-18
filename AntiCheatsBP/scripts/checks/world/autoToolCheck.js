/**
 * @file AntiCheatsBP/scripts/checks/world/autoToolCheck.js
 * Implements a check to detect AutoTool behavior, where a player might rapidly switch
 * to an optimal tool just before breaking a block and potentially switch back immediately after.
 * Relies on various `pData` fields being updated by block break event handlers and the main tick loop.
 * @version 1.1.0
 */

import * as mc from '@minecraft/server';
import { getOptimalToolForBlock, calculateRelativeBlockBreakingPower } from '../../utils/index.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks for AutoTool behavior by analyzing tool switches around block break events.
 * This involves two parts:
 * 1. Detecting a quick switch to an optimal tool right when a block break attempt starts.
 * 2. Detecting a quick switch away from that optimal tool right after the block is broken.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkAutoTool(
    player,
    pData,
    dependencies
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager, currentTick } = dependencies;
    const dimension = player.dimension; // Get dimension from player object

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

        if (previousSlotIndex === pData.slotAtBreakAttemptStart) {
            const blockPermutation = dimension.getBlock(pData.breakingBlockLocation)?.permutation;
            if (blockPermutation && pData.breakingBlockTypeId === blockPermutation.type.id) {
                const optimalToolInfo = getOptimalToolForBlock(player, blockPermutation);

                if (optimalToolInfo && currentSlotIndex === optimalToolInfo.slotIndex) {
                    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                    const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                    const newToolStack = optimalToolInfo.itemStack;

                    // 'speed' from getOptimalToolForBlock is actually breaking power
                    const initialPower = calculateRelativeBlockBreakingPower(player, blockPermutation, initialToolStack);
                    const newPower = optimalToolInfo.speed; // This 'speed' is the power score from getOptimalToolForBlock

                    // Higher power is better.
                    // 1. New tool is at least 50% more powerful.
                    // 2. New tool is "infinitely" powerful (e.g., shears on wool) and old tool wasn't already super effective.
                    // 3. New tool has a basic power level (e.g. >5) and initial was extremely low (e.g. <1, like punching stone).
                    const isSignificantlyBetter = (newPower > initialPower * 1.5) ||
                                                (newPower === Infinity && initialPower < 1000) ||
                                                (newPower > 5 && initialPower < 1);

                    if (isSignificantlyBetter) {
                        pData.switchedToOptimalToolForBreak = true;
                        playerUtils.debugLog(`[AutoToolCheck] Detected switch to optimal tool (${newToolStack?.typeId ?? 'hand'} in slot ${currentSlotIndex}, newPower: ${newPower.toFixed(2)}, oldPower: ${initialPower.toFixed(2)}) for ${pData.breakingBlockTypeId}. Initial slot: ${pData.slotAtBreakAttemptStart}`, dependencies, watchedPrefix);
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
            const autoToolActionProfile = config.autoToolActionProfileName ?? "worldAutotool";
            await actionManager.executeCheckAction(player, autoToolActionProfile, violationDetails, dependencies);
            playerUtils.debugLog(`[AutoToolCheck] Flagged ${player.nameTag} for switching back after optimal tool use. From: ${previousOptimalSlot}, To: ${currentSlotIndex}`, dependencies, watchedPrefix);

            pData.switchedToOptimalToolForBreak = false;
            pData.optimalToolSlotForLastBreak = null;
            pData.blockBrokenWithOptimalTypeId = null;
            pData.optimalToolTypeIdForLastBreak = null;
            pData.lastBreakCompleteTick = 0;
        }
    }

    const timeoutForBreakAttempt = 200;
    if (pData.isAttemptingBlockBreak && (currentTick - (pData.breakAttemptTick ?? 0) > timeoutForBreakAttempt)) {
        playerUtils.debugLog(`[AutoToolCheck] Stale break attempt timed out for ${player.nameTag}. Block: ${pData.breakingBlockTypeId ?? 'N/A'}`, dependencies, watchedPrefix);
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
    }

    const timeoutForSwitchBackState = switchBackWindow + 20;
    if (pData.optimalToolSlotForLastBreak !== null &&
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) > timeoutForSwitchBackState)) {
        playerUtils.debugLog(`[AutoToolCheck] Stale optimalToolSlotForLastBreak state timed out for ${player.nameTag}. Slot: ${pData.optimalToolSlotForLastBreak}`, dependencies, watchedPrefix);
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false;
        pData.lastBreakCompleteTick = 0;
    }
}
