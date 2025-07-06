/**
 * @file Implements a check to detect suspicious self-inflicted damage, specifically when a player
 * damages themselves via a direct entity attack (which is normally not possible without cheats).
 */
import * as mc from '@minecraft/server'; // For mc.EntityDamageCause and mc.EntityComponentTypes

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData containing `cause` (mc.EntityDamageCause) and `damagingEntity` (mc.Entity).
 */

/**
 * Checks if a player is damaging themselves directly via an entity attack.
 * This is suspicious as players cannot normally attack themselves directly.
 * This check is typically called from an `EntityHurtAfterEvent` handler where the `hurtEntity` is the player.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who was hurt (the `hurtEntity` from the event).
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the hurt player.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `cause` (damage cause from event) and `damagingEntity` (from event damageSource).
 * @returns {Promise<void>}
 */
export async function checkSelfHurt(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // damageSource.cause is directly from the event, not from eventSpecificData.cause
    const cause = eventSpecificData?.damageCause ?? eventSpecificData?.cause; // Accommodate if it's passed as damageCause
    const damagingEntity = eventSpecificData?.damagingEntity;

    if (!config?.enableSelfHurtCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[SelfHurtCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }
    if (!cause) { // Cause is essential for this check
        playerUtils?.debugLog(`[SelfHurtCheck] Skipping for ${playerName}: cause is missing from eventSpecificData.`, playerName, dependencies);
        return;
    }


    const watchedPlayerName = pData.isWatched ? playerName : null;

    // The core of the check: player is damaged by themselves AND the cause is a direct entity attack.
    if (damagingEntity && damagingEntity.id === player.id && cause === mc.EntityDamageCause.entityAttack) {
        playerUtils?.debugLog(
            `[SelfHurtCheck] ${playerName} damaged by self via entityAttack. Cause: ${cause}, DamagingEntity: ${damagingEntity.typeId} (ID: ${damagingEntity.id})`,
            watchedPlayerName, dependencies
        );

        let playerHealthString = 'N/A';
        try {
            const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
            if (healthComponent) {
                playerHealthString = healthComponent.currentValue.toFixed(1);
            }
        } catch (e) {
            playerUtils?.debugLog(`[SelfHurtCheck WARNING] Error getting health for ${playerName}: ${e.message}`, watchedPlayerName, dependencies);
        }

        const violationDetails = {
            damageCause: cause, // Store the actual cause enum value or its string name
            damagingEntityType: damagingEntity.typeId,
            playerHealth: playerHealthString,
        };

        // Ensure actionProfileKey is camelCase
        const rawActionProfileKey = config?.selfHurtActionProfileName ?? 'playerSelfHurt';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
        playerUtils?.debugLog(`[SelfHurtCheck] Flagged ${playerName} for suspicious self-hurt (entityAttack by self).`, watchedPlayerName, dependencies);

    } else if (pData.isWatched && damagingEntity && damagingEntity.id === player.id && config?.enableDebugLogging) {
        // Log if player hurt themselves but not via direct entity attack (e.g., fall damage, magic)
        // This is informational for watched players if extensive debugging is on.
        playerUtils?.debugLog(
            `[SelfHurtCheck INFO] ${playerName} damaged by self. Cause: ${cause} (NOT flagged as it's not mc.EntityDamageCause.entityAttack). DamagingEntity: ${damagingEntity.typeId}`,
            watchedPlayerName, dependencies
        );
    }
}
