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
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const dimension = player.dimension;

    if (!config.enableAutoToolCheck || !pData) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const switchToOptimalWindowTicks = config.autoToolSwitchToOptimalWindowTicks ?? 2;
    const switchBackWindowTicks = config.autoToolSwitchBackWindowTicks ?? 5;
    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawActionProfileKey = config.autoToolActionProfileName ?? 'worldAutoTool'; // Corrected default casing
    const actionProfileKey = rawActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

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
                        const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                        const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                        const newToolStack = optimalToolInfo.itemStack;

                        const initialPower = calculateRelativeBlockBreakingPower(player, blockPermutation, initialToolStack);
                        const newPower = optimalToolInfo.speed;

                        const isSignificantlyBetter = (newPower > initialPower * 1.5) ||
                                                    (newPower === Infinity && initialPower < 1000) ||
                                                    (newPower > 5 && initialPower < 1);

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
                playerUtils.debugLog(`[AutoToolCheck] Error during optimal tool switch detection for ${player.nameTag}: ${error.message}`, watchedPrefix, dependencies);
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
            playerUtils.debugLog(`[AutoToolCheck] Flagged ${player.nameTag} for switching back after optimal tool use. From: ${previousOptimalSlot}, To: ${currentSlotIndex}`, watchedPrefix, dependencies);

            pData.switchedToOptimalToolForBreak = false;
            pData.optimalToolSlotForLastBreak = null;
            pData.blockBrokenWithOptimalTypeId = null;
            pData.optimalToolTypeIdForLastBreak = null;
            pData.isDirtyForSave = true;
        }
    }

    const timeoutForBreakAttempt = config.autoToolBreakAttemptTimeoutTicks ?? 200;
    if (pData.isAttemptingBlockBreak && (currentTick - (pData.breakAttemptStartTick ?? 0) > timeoutForBreakAttempt)) {
        playerUtils.debugLog(`[AutoToolCheck] Stale break attempt timed out for ${player.nameTag}. Block: ${pData.breakingBlockTypeId ?? 'N/A'}`, watchedPrefix, dependencies);
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        pData.isDirtyForSave = true;
    }

    const timeoutForSwitchBackState = (config.autoToolSwitchBackWindowTicks ?? 5) + 20;
    if (
        pData.optimalToolSlotForLastBreak !== null &&
        (pData.lastBreakCompleteTick ?? 0) > 0 &&
        (currentTick - (pData.lastBreakCompleteTick ?? 0) > timeoutForSwitchBackState)
    ) {
        playerUtils.debugLog(`[AutoToolCheck] Stale optimalToolSlotForLastBreak state timed out for ${player.nameTag}. Slot: ${pData.optimalToolSlotForLastBreak}`, watchedPrefix, dependencies);
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false;
        pData.isDirtyForSave = true;
    }
}
