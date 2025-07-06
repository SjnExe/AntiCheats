/**
 * @file Implements checks for invalid player view pitch and rapid view snaps (aimbot-like behavior)
 * that can occur shortly after a player performs an attack.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks for invalid pitch (looking too far up or down) and for excessively rapid
 * changes in view angle (pitch/yaw snaps) that occur shortly after a player attacks.
 * Player's last pitch and yaw are updated by the game or via `playerDataManager.updateTransientPlayerData`.
 * Player's last attack tick is updated in `eventHandlers.handleEntityHurt`.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastAttackTick`, `lastPitch`, `lastYaw`.
 * @param {Dependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, currentTick, etc.
 * @returns {Promise<void>}
 */
export async function checkViewSnap(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableViewSnapCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[ViewSnapCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x; // Pitch
    const currentYaw = currentRotation.y;   // Yaw
    const watchedPlayerName = pData.isWatched ? playerName : null;

    // Invalid Pitch Check (independent of attack)
    const invalidPitchMin = config?.invalidPitchThresholdMin ?? -90.5;
    const invalidPitchMax = config?.invalidPitchThresholdMax ?? 90.5;

    // Ensure actionProfileKey is camelCase
    const rawInvalidPitchActionProfileKey = config?.invalidPitchActionProfileName ?? 'combatInvalidPitch';
    const invalidPitchActionProfileKey = rawInvalidPitchActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (currentPitch < invalidPitchMin || currentPitch > invalidPitchMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: invalidPitchMin.toFixed(2),
            maxLimit: invalidPitchMax.toFixed(2),
        };
        await actionManager?.executeCheckAction(player, invalidPitchActionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[ViewSnapCheck] Flagged ${playerName} for Invalid Pitch: ${currentPitch.toFixed(2)}°. Limits: ${invalidPitchMin}/${invalidPitchMax}`, watchedPlayerName, dependencies);
    }

    // View Snap Check (related to recent attack)
    const viewSnapWindowTicks = config?.viewSnapWindowTicks ?? 10; // How many ticks after an attack to monitor for snaps
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindowTicks)) {
        const deltaPitch = Math.abs(currentPitch - (pData.lastPitch ?? currentPitch)); // Use current if lastPitch is undefined
        let deltaYaw = Math.abs(currentYaw - (pData.lastYaw ?? currentYaw)); // Use current if lastYaw is undefined

        // Normalize yaw difference (e.g., -170 to 170 is 20 deg change, not 340)
        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        // Minecraft ticks are 20 per second, so 1 tick = 50ms.
        const postAttackTimeMs = ticksSinceLastAttack * 50;

        // Pitch Snap Check
        const maxPitchSnap = config?.maxPitchSnapPerTick ?? 75; // Degrees per tick
        const rawPitchSnapActionProfileKey = config?.pitchSnapActionProfileName ?? 'combatViewSnapPitch';
        const pitchSnapActionProfileKey = rawPitchSnapActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        if (deltaPitch > maxPitchSnap) { // If change in one tick is too large
            const violationDetails = {
                type: 'pitch',
                change: deltaPitch.toFixed(2),
                limit: maxPitchSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString(),
            };
            await actionManager?.executeCheckAction(player, pitchSnapActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[ViewSnapCheck] (Pitch Snap) for ${playerName}: dP=${deltaPitch.toFixed(1)}° within ${ticksSinceLastAttack} ticks of attack. Limit: ${maxPitchSnap}°/tick.`, watchedPlayerName, dependencies);
        }

        // Yaw Snap Check
        const maxYawSnap = config?.maxYawSnapPerTick ?? 100; // Degrees per tick
        const rawYawSnapActionProfileKey = config?.yawSnapActionProfileName ?? 'combatViewSnapYaw';
        const yawSnapActionProfileKey = rawYawSnapActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        if (deltaYaw > maxYawSnap) { // If change in one tick is too large
            const violationDetails = {
                type: 'yaw',
                change: deltaYaw.toFixed(2),
                limit: maxYawSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString(),
            };
            await actionManager?.executeCheckAction(player, yawSnapActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[ViewSnapCheck] (Yaw Snap) for ${playerName}: dY=${deltaYaw.toFixed(1)}° within ${ticksSinceLastAttack} ticks of attack. Limit: ${maxYawSnap}°/tick.`, watchedPlayerName, dependencies);
        }
    }

    // Update last known pitch/yaw for the next tick's comparison, if this check runs every tick for a player.
    // However, pData.lastPitch and pData.lastYaw are primarily set by the entityHurt event handler
    // to capture the rotation *at the moment of attack* for post-attack snap analysis.
    // If this check itself needs to track rotation changes *between its own executions*,
    // then it should update pData fields here. For now, assuming external update is sufficient.
}
