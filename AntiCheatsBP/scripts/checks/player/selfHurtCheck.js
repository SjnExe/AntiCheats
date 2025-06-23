/**
 * Implements a check to detect suspicious self-inflicted damage, specifically when a player
 * damages themselves via a direct entity attack (which is normally not possible without cheats).
 */
import * as mc from '@minecraft/server';
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').EventSpecificData} EventSpecificData
 */
/**
 * Checks if a player is damaging themselves directly via an entity attack, which is suspicious.
 * This check is typically called from an `EntityHurtEvent` handler.
 *
 * @param {mc.Player} player - The player who was hurt (the `hurtEntity` from the event).
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the hurt player.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @param {EventSpecificData} eventSpecificData - Data specific to the event, expects `cause` (mc.EntityDamageSource) and `damagingEntity` (mc.Entity).
 * @returns {Promise<void>}
 */
export async function checkSelfHurt(
    player,
    pData,
    dependencies,
    eventSpecificData
) {
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

        let playerHealthString = "N/A";
        try {
            const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
            if (healthComponent) {
                playerHealthString = healthComponent.currentValue.toFixed(1);
            }
        } catch (e) {
            playerUtils.debugLog(`[SelfHurtCheck] Error getting health for ${player.nameTag}: ${e.message}`, watchedPrefix, dependencies);
            console.error(`[SelfHurtCheck] Error getting health for ${player.nameTag}: ${e.stack || e}`);
        }

        const violationDetails = {
            damageCause: cause.cause,
            damagingEntityType: damagingEntity.typeId,
            playerHealth: playerHealthString
        };

        await actionManager.executeCheckAction(player, "playerSelfHurt", violationDetails, dependencies);

    } else if (pData.isWatched && damagingEntity && damagingEntity.id === player.id) {
        playerUtils.debugLog(
            `[SelfHurtCheck] (Info): ${player.nameTag} damaged by self. Cause: ${cause.cause} (Ignored by flagging logic). DamagingEntity: ${damagingEntity.typeId}`,
            watchedPrefix, dependencies
        );
    }
}
