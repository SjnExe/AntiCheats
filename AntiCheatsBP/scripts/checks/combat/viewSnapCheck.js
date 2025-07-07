/**
 * @file Implements checks for invalid player view pitch and rapid view snaps (aimbot-like behavior)
 * that can occur shortly after a player performs an attack.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const DEFAULT_INVALID_PITCH_MIN = -90.5;
const DEFAULT_INVALID_PITCH_MAX = 90.5;
const YAW_FLIP_THRESHOLD = 180; // Degrees
const DEGREES_IN_CIRCLE = 360; // Degrees
const MS_PER_TICK = 50;
const DEFAULT_MAX_PITCH_SNAP_PER_TICK = 75; // Degrees per tick

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
    const currentPitch = currentRotation.x;
    const currentYaw = currentRotation.y;
    const watchedPlayerName = pData.isWatched ? playerName : null;

    const invalidPitchMin = config?.invalidPitchThresholdMin ?? DEFAULT_INVALID_PITCH_MIN;
    const invalidPitchMax = config?.invalidPitchThresholdMax ?? DEFAULT_INVALID_PITCH_MAX;

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

    const viewSnapWindowTicks = config?.viewSnapWindowTicks ?? 10;
    if (pData.lastAttackTick && (currentTick - pData.lastAttackTick < viewSnapWindowTicks)) {
        const deltaPitch = Math.abs(currentPitch - (pData.lastPitch ?? currentPitch));
        let deltaYaw = Math.abs(currentYaw - (pData.lastYaw ?? currentYaw));

        if (deltaYaw > YAW_FLIP_THRESHOLD) {
            deltaYaw = DEGREES_IN_CIRCLE - deltaYaw;
        }

        const ticksSinceLastAttack = currentTick - pData.lastAttackTick;
        const postAttackTimeMs = ticksSinceLastAttack * MS_PER_TICK;

        const maxPitchSnap = config?.maxPitchSnapPerTick ?? DEFAULT_MAX_PITCH_SNAP_PER_TICK;
        const rawPitchSnapActionProfileKey = config?.pitchSnapActionProfileName ?? 'combatViewSnapPitch';
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
            await actionManager?.executeCheckAction(player, pitchSnapActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[ViewSnapCheck] (Pitch Snap) for ${playerName}: dP=${deltaPitch.toFixed(1)}° within ${ticksSinceLastAttack} ticks of attack. Limit: ${maxPitchSnap}°/tick.`, watchedPlayerName, dependencies);
        }

        const maxYawSnap = config?.maxYawSnapPerTick ?? 100;
        const rawYawSnapActionProfileKey = config?.yawSnapActionProfileName ?? 'combatViewSnapYaw';
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
            await actionManager?.executeCheckAction(player, yawSnapActionProfileKey, violationDetails, dependencies);
            playerUtils?.debugLog(`[ViewSnapCheck] (Yaw Snap) for ${playerName}: dY=${deltaYaw.toFixed(1)}° within ${ticksSinceLastAttack} ticks of attack. Limit: ${maxYawSnap}°/tick.`, watchedPlayerName, dependencies);
        }
    }
}
