/**
 * @file AntiCheatsBP/scripts/checks/combat/viewSnapCheck.js
 * Implements checks for invalid player view pitch and rapid view snaps (aimbot-like behavior)
 * that can occur shortly after a player performs an attack.
 * @version 1.1.0
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */

/**
 * Checks for invalid pitch (looking too far up or down) and for excessively rapid
 * changes in view angle (pitch/yaw snaps) that occur shortly after a player attacks.
 * Player's last pitch and yaw are updated in `updateTransientPlayerData`.
 * Player's last attack tick is updated in `handleEntityHurt`.
 *
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastAttackTick`, `lastPitch`, `lastYaw`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, executeCheckAction, currentTick, etc.
 * @param {EventSpecificData} [eventSpecificData] - Optional data specific to the event that triggered this check (unused by ViewSnap).
 * @returns {Promise<void>}
 */
export async function checkViewSnap(
    player,
    pData,
    dependencies,
    eventSpecificData // Unused by ViewSnap check
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager, currentTick } = dependencies;

    if (!config.enableViewSnapCheck || !pData) {
        return;
    }

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Construct a more focused dependencies object for executeCheckAction if preferred,
    // or pass the main 'dependencies' object directly if action profiles expect the full set.
    // For consistency with other checks, we can pass the main 'dependencies'.
    // const actionContextDependencies = { config, playerDataManager, playerUtils, logManager };

    // 1. Check for invalid absolute pitch
    const invalidPitchMin = config.invalidPitchThresholdMin ?? -90.5;
    const invalidPitchMax = config.invalidPitchThresholdMax ?? 90.5;

    if (currentPitch < invalidPitchMin || currentPitch > invalidPitchMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: invalidPitchMin.toFixed(2),
            maxLimit: invalidPitchMax.toFixed(2)
        };
        await actionManager.executeCheckAction(player, "combatInvalidPitch", violationDetails, dependencies);
    }

    // 2. Check for view snaps after an attack
    const viewSnapWindow = config.viewSnapWindowTicks ?? 10;
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindow)) {
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch);
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);

        if (deltaYaw > 180) { // Normalize yaw difference
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        const postAttackTimeMs = ticksSinceLastAttack * 50; // Approximate ms

        const maxPitchSnap = config.maxPitchSnapPerTick ?? 75;
        if (deltaPitch > maxPitchSnap) {
            const violationDetails = {
                type: "pitch",
                change: deltaPitch.toFixed(2),
                limit: maxPitchSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString()
            };
            await actionManager.executeCheckAction(player, "combatViewsnapPitch", violationDetails, dependencies);
            playerUtils.debugLog(`[ViewSnapCheck] (Pitch) for ${player.nameTag}: dP=${deltaPitch.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix, dependencies);
        }

        const maxYawSnap = config.maxYawSnapPerTick ?? 100;
        if (deltaYaw > maxYawSnap) {
            const violationDetails = {
                type: "yaw",
                change: deltaYaw.toFixed(2),
                limit: maxYawSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString()
            };
            await actionManager.executeCheckAction(player, "combatViewsnapYaw", violationDetails, dependencies);
            playerUtils.debugLog(`[ViewSnapCheck] (Yaw) for ${player.nameTag}: dY=${deltaYaw.toFixed(1)} within ${ticksSinceLastAttack} ticks.`, watchedPrefix, dependencies);
        }
    }
    // pData.lastPitch and pData.lastYaw are updated in main.js's updateTransientPlayerData.
}
