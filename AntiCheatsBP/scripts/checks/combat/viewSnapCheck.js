/**
 * @file Implements checks for invalid player view pitch and rapid view snaps (aimbot-like behavior)
 * that can occur shortly after a player performs an attack.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks for invalid pitch (looking too far up or down) and for excessively rapid
 * changes in view angle (pitch/yaw snaps) that occur shortly after a player attacks.
 * Player's last pitch and yaw are updated in `updateTransientPlayerData` in `playerDataManager.js`.
 * Player's last attack tick is updated in `handleEntityHurt` in `eventHandlers.js`.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data, containing `lastAttackTick`, `lastPitch`, `lastYaw`.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, currentTick, etc.
 * @returns {Promise<void>}
 */
export async function checkViewSnap(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;

    if (!config.enableViewSnapCheck || !pData) {
        return;
    }

    const currentRotation = player.getRotation();
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    const invalidPitchMin = config.invalidPitchThresholdMin ?? -90.5;
    const invalidPitchMax = config.invalidPitchThresholdMax ?? 90.5;
    // Ensure actionProfileKey is camelCase, standardizing from config
    const rawInvalidPitchActionProfileKey = config.invalidPitchActionProfileName ?? 'combatInvalidPitch'; // Default is already camelCase
    const invalidPitchActionProfileKey = rawInvalidPitchActionProfileKey
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    if (currentPitch < invalidPitchMin || currentPitch > invalidPitchMax) {
        const violationDetails = {
            pitch: currentPitch.toFixed(2),
            minLimit: invalidPitchMin.toFixed(2),
            maxLimit: invalidPitchMax.toFixed(2),
        };
        await actionManager.executeCheckAction(player, invalidPitchActionProfileKey, violationDetails, dependencies);
        playerUtils.debugLog(`[ViewSnapCheck] Flagged ${player.nameTag} for Invalid Pitch: ${currentPitch.toFixed(2)}°. Limits: ${invalidPitchMin}/${invalidPitchMax}`, watchedPrefix, dependencies);
    }

    const viewSnapWindowTicks = config.viewSnapWindowTicks ?? 10;
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindowTicks)) {
        const deltaPitch = Math.abs(currentPitch - pData.lastPitch);
        let deltaYaw = Math.abs(currentYaw - pData.lastYaw);

        if (deltaYaw > 180) {
            deltaYaw = 360 - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        const postAttackTimeMs = ticksSinceLastAttack * 50;

        const maxPitchSnap = config.maxPitchSnapPerTick ?? 75;
        // Ensure actionProfileKey is camelCase, standardizing from config
        const rawPitchSnapActionProfileKey = config.pitchSnapActionProfileName ?? 'combatViewSnapPitch'; // Corrected default casing
        const pitchSnapActionProfileKey = rawPitchSnapActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        if (deltaPitch > maxPitchSnap) {
            const violationDetails = {
                type: 'pitch',
                change: deltaPitch.toFixed(2),
                limit: maxPitchSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString(),
            };
            await actionManager.executeCheckAction(player, pitchSnapActionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[ViewSnapCheck] (Pitch) for ${player.nameTag}: dP=${deltaPitch.toFixed(1)}° within ${ticksSinceLastAttack} ticks.`, watchedPrefix, dependencies);
        }

        const maxYawSnap = config.maxYawSnapPerTick ?? 100;
        // Ensure actionProfileKey is camelCase, standardizing from config
        const rawYawSnapActionProfileKey = config.yawSnapActionProfileName ?? 'combatViewSnapYaw'; // Corrected default casing
        const yawSnapActionProfileKey = rawYawSnapActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        if (deltaYaw > maxYawSnap) {
            const violationDetails = {
                type: 'yaw',
                change: deltaYaw.toFixed(2),
                limit: maxYawSnap.toFixed(2),
                ticksSinceAttack: ticksSinceLastAttack.toString(),
                postAttackTimeMs: postAttackTimeMs.toString(),
            };
            await actionManager.executeCheckAction(player, yawSnapActionProfileKey, violationDetails, dependencies);
            playerUtils.debugLog(`[ViewSnapCheck] (Yaw) for ${player.nameTag}: dY=${deltaYaw.toFixed(1)}° within ${ticksSinceLastAttack} ticks.`, watchedPrefix, dependencies);
        }
    }
}
