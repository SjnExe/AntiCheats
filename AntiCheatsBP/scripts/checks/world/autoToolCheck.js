import * as mc from '@minecraft/server';
import { getOptimalToolForBlock, getBlockBreakingSpeed } from '../../utils/index.js'; // Corrected import path assuming index.js in utils

export async function checkAutoTool(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick, dimension) {
    if (!config.enableAutoToolCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Part 1: Detect switch to optimal tool just before/at the start of break
    if (pData.isAttemptingBlockBreak &&
        pData.breakingBlockLocation && // Ensure location is set
        !pData.switchedToOptimalToolForBreak && // Only detect once per break attempt
        pData.lastSelectedSlotChangeTick === currentTick && // Slot changed this very tick
        (currentTick - pData.breakAttemptTick < config.autoToolSwitchToOptimalWindowTicks)) { // And very close to break attempt start

        const currentSlotIndex = player.selectedSlotIndex;
        const previousSlotIndex = pData.previousSelectedSlotIndex; // Slot before the current change

        if (previousSlotIndex === pData.slotAtBreakAttemptStart) { // Ensure the switch is from the slot held when break was initiated
            const blockPermutation = dimension.getBlock(pData.breakingBlockLocation)?.permutation;
            if (blockPermutation && pData.breakingBlockTypeId === blockPermutation.type.id) { // Verify block hasn't changed
                const optimalToolInfo = getOptimalToolForBlock(player, blockPermutation);

                if (optimalToolInfo && currentSlotIndex === optimalToolInfo.slotIndex) {
                    // Check if the switch was meaningful (e.g., new tool is significantly faster or correct type)
                    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                    const initialToolStack = inventory?.container?.getItem(pData.slotAtBreakAttemptStart);
                    const newToolStack = optimalToolInfo.itemStack; // This is the stack for the optimal tool

                    const initialSpeed = getBlockBreakingSpeed(player, blockPermutation, initialToolStack);
                    const newSpeed = optimalToolInfo.speed; // Already calculated by getOptimalToolForBlock

                    // Define "significantly better": e.g., new speed is >1.5x initial, or initial was very slow (like hand)
                    // and new tool is appropriate. This condition can be refined.
                    if (newSpeed > initialSpeed * 1.5 || (initialSpeed < 1 && newSpeed > 1 && newSpeed !== Infinity) || (newSpeed === Infinity && initialSpeed < 1000) ) { // Simplified significance check, ensure hand to shears is significant
                        pData.switchedToOptimalToolForBreak = true;
                        if (pData.isWatched && playerUtils.debugLog) {
                            playerUtils.debugLog(\`AutoTool: Detected switch to optimal tool (\${newToolStack ? newToolStack.typeId : 'hand'} in slot \${currentSlotIndex}) for \${pData.breakingBlockTypeId}. Initial slot: \${pData.slotAtBreakAttemptStart}\`, watchedPrefix);
                        }
                        // Not flagging here yet, waiting for potential switch-back.
                    }
                }
            }
        }
    }

    // Part 2: Detect switch back from optimal tool just after break
    if (pData.optimalToolSlotForLastBreak !== null && // Indicates a break was completed with a switched optimal tool
        pData.lastSelectedSlotChangeTick === currentTick && // Slot changed this very tick
        pData.lastBreakCompleteTick > 0 && // Ensure break was actually completed
        (currentTick - pData.lastBreakCompleteTick < config.autoToolSwitchBackWindowTicks)) {

        const currentSlotIndex = player.selectedSlotIndex;
        const previousOptimalSlot = pData.optimalToolSlotForLastBreak;

        // Check if player switched away from the slot that was optimal for the break
        if (currentSlotIndex !== previousOptimalSlot) {
            let switchedBackToOriginal = (currentSlotIndex === pData.slotAtBreakAttemptStart && pData.slotAtBreakAttemptStart !== previousOptimalSlot);

            const dependencies = { config, playerDataManager, playerUtils, logManager };

            const violationDetails = {
                blockType: pData.blockBrokenWithOptimalTypeId || pData.breakingBlockTypeId || "unknown", // Use newly stored, fallback to original attempt
                toolUsed: pData.optimalToolTypeIdForLastBreak || "unknown",   // Use newly stored optimal tool type
                switchPattern: switchedBackToOriginal ? "ToOptimalThenBackToOriginal" : "ToOptimalThenSwitchedAway",
                fromSlot: previousOptimalSlot, // This is optimalToolSlotForLastBreak
                toSlot: currentSlotIndex,      // The slot switched back to
                originalSlot: pData.slotAtBreakAttemptStart, // The very first slot held at break initiation
                breakAttemptTick: pData.breakAttemptTick,
                // switchedToOptimalTick: pData.switchedToOptimalToolTick, // This field doesn't exist.
                                                                        // lastSelectedSlotChangeTick at the time of switch could be stored if needed.
                breakCompleteTick: pData.lastBreakCompleteTick,
                currentTick: currentTick
            };

            await executeCheckAction(player, "world_autotool", violationDetails, dependencies);
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(\`AutoTool: Flagged \${player.nameTag} for switching back after optimal tool use. From: \${previousOptimalSlot}, To: \${currentSlotIndex}\`, watchedPrefix);
            }

            // Reset state after flagging full AutoTool behavior
            pData.switchedToOptimalToolForBreak = false;
            pData.optimalToolSlotForLastBreak = null;
            pData.blockBrokenWithOptimalTypeId = null;
            pData.optimalToolTypeIdForLastBreak = null;
            pData.lastBreakCompleteTick = 0;
            // pData.slotAtBreakAttemptStart is naturally overwritten on next break attempt.
            // pData.breakingBlockTypeId and pData.breakingBlockLocation are reset by event handler or timeout.
        }
    }

    // Cleanup stale autotool states
    // If a break attempt was started but not completed (no lastBreakCompleteTick update)
    if (pData.isAttemptingBlockBreak && (currentTick - pData.breakAttemptTick > 200)) { // ~10 seconds timeout for a break attempt
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`AutoTool: Stale break attempt timed out for \${player.nameTag}. Block: \${pData.breakingBlockTypeId}\`, watchedPrefix);
        }
        pData.isAttemptingBlockBreak = false;
        pData.switchedToOptimalToolForBreak = false;
        pData.breakingBlockTypeId = null;
        pData.breakingBlockLocation = null;
        // Also clear the logging fields if the attempt times out
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
    }
    // If a break was completed with an optimal tool, but player didn't switch back in time
    if (pData.optimalToolSlotForLastBreak !== null && (currentTick - pData.lastBreakCompleteTick > config.autoToolSwitchBackWindowTicks + 20)) {
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`AutoTool: Stale optimalToolSlotForLastBreak timed out for \${player.nameTag}. Slot: \${pData.optimalToolSlotForLastBreak}\`, watchedPrefix);
        }
        pData.optimalToolSlotForLastBreak = null;
        pData.blockBrokenWithOptimalTypeId = null;
        pData.optimalToolTypeIdForLastBreak = null;
        pData.switchedToOptimalToolForBreak = false;
        pData.lastBreakCompleteTick = 0; // Reset this as well
    }
}
