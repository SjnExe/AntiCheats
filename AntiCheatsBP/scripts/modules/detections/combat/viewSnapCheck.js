/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for invalid pitch and rapid view snaps after an attack.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function checkViewSnap(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableViewSnapCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[ViewSnapCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPlayerName = pData.isWatched ? playerName : null;

    const invalidPitchMin = config?.invalidPitchThresholdMin ?? -90.5;
    const invalidPitchMax = config?.invalidPitchThresholdMax ?? 90.5;

    const invalidPitchActionProfileKey = config?.invalidPitchActionProfileName ?? 'combatInvalidPitch';

    if (currentPitch < invalidPitchMin || currentPitch > invalidPitchMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: invalidPitchMin.toFixed(2),
            maxLimit: invalidPitchMax.toFixed(2),
        };
        await actionManager?.executeCheckAction(player, invalidPitchActionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ViewSnapCheck] Flagged ${playerName} for Invalid Pitch: ${currentPitch.toFixed(2)}°. Limits: ${invalidPitchMin}/${invalidPitchMax}`, watchedPlayerName, dependencies);
    }

    const viewSnapWindowTicks = config?.viewSnapWindowTicks ?? 10;
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindowTicks)) {
        const deltaPitch = Math.abs(currentPitch - (pData.lastPitch ?? currentPitch));
        let deltaYaw = Math.abs(currentYaw - (pData.lastYaw ?? currentYaw));

        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        const postAttackTimeMs = ticksSinceLastAttack * 50;

        const maxPitchSnapPerTick = config?.maxPitchSnapPerTick ?? 75;
        const pitchSnapActionProfileKey = config?.pitchSnapActionProfileName ?? 'combatViewSnapPitch';

        if (ticksSinceLastAttack > 0) {
            const pitchSnapRate = deltaPitch / ticksSinceLastAttack;
            if (pitchSnapRate > maxPitchSnapPerTick) {
                const violationDetails = {
                    type: 'pitch',
                    change: deltaPitch.toFixed(2),
                    rate: pitchSnapRate.toFixed(2),
                    limit: maxPitchSnapPerTick.toFixed(2),
                    ticksSinceAttack: ticksSinceLastAttack.toString(),
                    postAttackTimeMs: postAttackTimeMs.toString(),
                };
                await actionManager?.executeCheckAction(player, pitchSnapActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[ViewSnapCheck] (Pitch Snap) for ${playerName}: dP=${deltaPitch.toFixed(1)}° rate=${pitchSnapRate.toFixed(1)}°/t within ${ticksSinceLastAttack} ticks. Limit: ${maxPitchSnapPerTick}°/t.`, watchedPlayerName, dependencies);
            }
        }

        const maxYawSnapPerTick = config?.maxYawSnapPerTick ?? 100;
        const yawSnapActionProfileKey = config?.yawSnapActionProfileName ?? 'combatViewSnapYaw';

        if (ticksSinceLastAttack > 0) {
            const yawSnapRate = deltaYaw / ticksSinceLastAttack;
            if (yawSnapRate > maxYawSnapPerTick) {
                const violationDetails = {
                    type: 'yaw',
                    change: deltaYaw.toFixed(2),
                    rate: yawSnapRate.toFixed(2),
                    limit: maxYawSnapPerTick.toFixed(2),
                    ticksSinceAttack: ticksSinceLastAttack.toString(),
                    postAttackTimeMs: postAttackTimeMs.toString(),
                };
                await actionManager?.executeCheckAction(player, yawSnapActionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[ViewSnapCheck] (Yaw Snap) for ${playerName}: dY=${deltaYaw.toFixed(1)}° rate=${yawSnapRate.toFixed(1)}°/t within ${ticksSinceLastAttack} ticks. Limit: ${maxYawSnapPerTick}°/t.`, watchedPlayerName, dependencies);
            }
        }
    }
}
