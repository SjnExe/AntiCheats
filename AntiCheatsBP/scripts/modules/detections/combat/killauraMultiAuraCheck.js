import { EntityDamageCause } from '@minecraft/server';

/**
 * @typedef {import('../../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is attacking multiple entities in a short amount of time.
 * @param {import('@minecraft/server').Player} player The player to check.
 * @param {PlayerAntiCheatData} pData The player's data.
 * @param {Dependencies} dependencies The command dependencies.
 */
export async function checkKillauraMultiAura(player, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    if (!config.checks.killauraMultiAura.enabled) {
        return;
    }

    if (!pData || !Array.isArray(pData.attackEvents)) {
        playerUtils.debugLog(`[KillauraMultiAuraCheck] Skipping for ${player.name}: pData or pData.attackEvents is invalid.`, player.name, dependencies);
        return;
    }

    const watchedPrefix = pData.isWatched ? player.name : null;
    const now = Date.now();
    const calculationWindowMs = config.checks.killauraMultiAura.windowMs ?? 1000;
    const windowStartTime = now - calculationWindowMs;

    const recentAttacks = pData.attackEvents.filter(/** @param {import('../../../types.js').AttackEvent} event */ event =>
        event.timestamp >= windowStartTime &&
        event.damageSource.cause === EntityDamageCause.entityAttack,
    );
    const uniqueTargets = new Set(recentAttacks.map(/** @param {import('../../../types.js').AttackEvent} event */ event => event.targetId));

    if (pData.isWatched && uniqueTargets.size > 0) {
        playerUtils.debugLog(`[KillauraMultiAuraCheck] Processing for ${player.name}. UniqueTargets=${uniqueTargets.size}. WindowMs=${calculationWindowMs}`, watchedPrefix, dependencies);
    }

    const maxTargets = config.checks.killauraMultiAura.maxTargets ?? 3;

    if (uniqueTargets.size > maxTargets) {
        const violationDetails = {
            targetCount: uniqueTargets.size.toString(),
            windowSeconds: (calculationWindowMs / 1000).toFixed(1),
            threshold: maxTargets.toString(),
        };
        await actionManager.executeCheckAction(player, 'killauraMultiAura', violationDetails, dependencies);
    }
}
