/**
 * @file Implements a check to detect AutoTool behavior, where a player might rapidly switch
 * @module AntiCheatsBP/scripts/checks/world/autoToolCheck
 * to an optimal tool just before breaking a block and potentially switch back immediately after.
 * Relies on various `pData` fields being updated by block break event handlers and the main tick loop.
 */
import { getOptimalToolForBlock, calculateRelativeBlockBreakingPower } from '../../utils/index.js';

// Constants for magic numbers
const defaultAutoToolSwitchToOptimalWindowTicks = 2;
const defaultAutoToolSwitchBackWindowTicks = 5;
const significantPowerIncreaseMultiplier = 1.5;
const highPowerThreshold = 5;
const defaultAutoToolBreakAttemptTimeoutTicks = 200;
const switchBackStateAdditionalTimeoutTicks = 20;

/**
 * Checks for AutoTool behavior by analyzing tool switches around block break events.
 * This involves two parts:
 * 1. Detecting a quick switch to an optimal tool right when a block break attempt starts.
 * 2. Detecting a quick switch away from that optimal tool right after the block is broken.
 * This check is typically run on a tick-based interval.
 * @async
 * @param {mc.Player} player - The player instance.
 * @param {import('../../types.js').PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {import('../../types.js').Dependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkAutoTool(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const dimension = player.dimension;

    if (!config.enableAutoToolCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const switchToOptimalWindowTicks = config.autoToolSwitchToOptimalWindowTicks ?? defaultAutoToolSwitchToOptimalWindowTicks;
    const switchBackWindowTicks = config.autoToolSwitchBackWindowTicks ?? defaultAutoToolSwitchBackWindowTicks;
    const actionProfileKey = config.autoToolActionProfileName ?? 'worldAutoTool';

    if (
        pData.isAttemptingBlockBreak &&
        pData.breakingBlockLocation &&
        !pData.switchedToOptimalToolForBreak &&
        pData.lastSelectedSlotChangeTick === currentTick &&
        (currentTick - (pData.breakAttemptStartTick ?? 0) < switchToOptimalWindowTicks)
    ) {
        const currentSlotIndex = player.selectedSlotIndex;
        const previousSlotIndex = pData.previousSelectedSlotIndex;

        if (previousSlotIndex === pData.slotAtBreakAttemptStart) {
            try {
                const blockPermutation = dimension.getBlock(pData.breakingBlockLocation)?.permutation;
                if (blockPermutation && pData.breakingBlockTypeId === blockPermutation.type.id) {
                    const optimalToolInfo = getOptimalToolForBlock(player, blockPermutation);

                    if (optimalToolInfo && currentSlotIndex === optimalToolInfo.slotIndex) {
                        const inventory = player.getComponent('inventory');
                        const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                        const newToolStack = optimalToolInfo.itemStack;

                        const initialPower = calculateRelativeBlockBreakingPower(player, blockPermutation, initialToolStack);
                        const newPower = optimalToolInfo.speed;

                        const isSignificantlyBetter = (newPower > initialPower * significantPowerIncreaseMultiplier) ||
                                                    (newPower === Infinity && initialPower < 1000) || // 1000 is fine
                                                    (newPower > highPowerThreshold && initialPower < 1); // 1 is fine

                        if (isSignificantlyBetter) {
                            pData.switchedToOptimalToolForBreak = true;
                            pData.optimalToolSlotForLastBreak = currentSlotIndex;
                            pData.optimalToolTypeIdForLastBreak = newToolStack?.typeId;
                            pData.isDirtyForSave = true;
                            playerUtils.debugLog(`[AutoToolCheck] Detected switch to optimal tool (${newToolStack?.typeId ?? 'hand'} in slot ${currentSlotIndex}, newPower: ${newPower.toFixed(2)}, oldPower: ${initialPower.toFixed(2)}) for ${pData.breakingBlockTypeId}. Initial slot: ${pData.slotAtBreakAttemptStart}`, watchedPrefix, dependencies);
                        }
                    }
                }
            } catch (error) {
                playerUtils.debugLog(`[AutoToolCheck] Error during optimal tool switch detection for ${player.name}: ${error.message}`, watchedPrefix, dependencies);
            }
        }
    }

    if (
        pData.switchedToOptimalToolForBreak &&
        pData.optimalToolSlotForLastBreak !== null &&
        pData.lastSelectedSlotChangeTick === currentTick &&
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) < switchBackWindowTicks)
    ) {
        const currentSlotIndex = player.selectedSlotIndex;
        const previousOptimalSlot = pData.optimalToolSlotForLastBreak;

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
                breakAttemptTick: (pData.breakAttemptStartTick ?? 'N/A').toString(),
                breakCompleteTick: (pData.lastBreakCompleteTick ?? 'N/A').toString(),
                switchBackTick: currentTick.toString(),
            };

            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[AutoToolCheck] Flagged ${player.name} for switching back after optimal tool use. From: ${previousOptimalSlot}, To: ${currentSlotIndex}`, watchedPrefix, dependencies);

            const pDataToUpdate = pData; // Re-affirm pData reference
            pDataToUpdate.switchedToOptimalToolForBreak = false;
            pDataToUpdate.optimalToolSlotForLastBreak = null;
            pDataToUpdate.blockBrokenWithOptimalTypeId = null;
            pDataToUpdate.optimalToolTypeIdForLastBreak = null;
            pDataToUpdate.isDirtyForSave = true;
        }
    }

    const timeoutForBreakAttempt = config.autoToolBreakAttemptTimeoutTicks ?? defaultAutoToolBreakAttemptTimeoutTicks;
    if (pData.isAttemptingBlockBreak && (currentTick - (pData.breakAttemptStartTick ?? 0) > timeoutForBreakAttempt)) { // 0 is fine
        playerUtils.debugLog(`[AutoToolCheck] Stale break attempt timed out for ${player.name}. Block: ${pData.breakingBlockTypeId ?? 'N/A'}`, watchedPrefix, dependencies);
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        pData.isDirtyForSave = true;
    }

    const timeoutForSwitchBackState = (config.autoToolSwitchBackWindowTicks ?? defaultAutoToolSwitchBackWindowTicks) + switchBackStateAdditionalTimeoutTicks;
    if (
        pData.optimalToolSlotForLastBreak !== null &&
        (pData.lastBreakCompleteTick ?? 0) > 0 && // 0 is fine
        (currentTick - (pData.lastBreakCompleteTick ?? 0) > timeoutForSwitchBackState)
    ) {
        playerUtils.debugLog(`[AutoToolCheck] Stale optimalToolSlotForLastBreak state timed out for ${player.name}. Slot: ${pData.optimalToolSlotForLastBreak}`, watchedPrefix, dependencies);
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false;
        pData.isDirtyForSave = true;
    }
}
