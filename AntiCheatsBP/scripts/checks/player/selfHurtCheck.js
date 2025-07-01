/**
 * @file Implements a check to detect suspicious self-inflicted damage, specifically when a player
 * damages themselves via a direct entity attack (which is normally not possible without cheats).
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData containing `cause` and `damagingEntity`.
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks if a player is damaging themselves directly via an entity attack.
 * This is suspicious as players cannot normally attack themselves directly.
 * This check is typically called from an `EntityHurtAfterEvent` handler.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who was hurt (the `hurtEntity` from the event).
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the hurt player.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `cause` (mc.EntityDamageSource) and `damagingEntity` (mc.Entity).
 * @returns {Promise<void>}
 */
export async function checkSelfHurt(player, pData, dependencies, eventSpecificData) {
    const { config, playerUtils, actionManager } = dependencies;
    const cause = eventSpecificData?.cause;
    const damagingEntity = eventSpecificData?.damagingEntity;

    if (!config.enableSelfHurtCheck || !pData || !cause) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (damagingEntity && damagingEntity.id === player.id && cause.cause === mc.EntityDamageCause.entityAttack) {
        playerUtils.debugLog(
            `[SelfHurtCheck] ${player.nameTag} damaged by self via entityAttack. Cause: ${cause.cause}, DamagingEntity: ${damagingEntity.typeId} (ID: ${damagingEntity.id})`,
            watchedPrefix, dependencies
        );

        let playerHealthString = 'N/A';
        try {
            const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
            if (healthComponent) {
                playerHealthString = healthComponent.currentValue.toFixed(1);
            }
        } catch (e) {
            playerUtils.debugLog(`[SelfHurtCheck] Error getting health for ${player.nameTag}: ${e.message}`, watchedPrefix, dependencies);
        }

        const violationDetails = {
            damageCause: cause.cause,
            damagingEntityType: damagingEntity.typeId,
            playerHealth: playerHealthString,
        };

        const actionProfileKey = config.selfHurtActionProfileName ?? 'playerSelfHurt';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

    } else if (pData.isWatched && damagingEntity && damagingEntity.id === player.id) {
        playerUtils.debugLog(
            `[SelfHurtCheck] (Info): ${player.nameTag} damaged by self. Cause: ${cause.cause} (Not flagged as entityAttack). DamagingEntity: ${damagingEntity.typeId}`,
            watchedPrefix, dependencies
        );
    }
}
