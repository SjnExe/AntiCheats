/**
 * @file AntiCheatsBP/scripts/checks/player/selfHurtCheck.js
 * Implements a check to detect suspicious self-inflicted damage, specifically when a player
 * damages themselves via a direct entity attack (which is normally not possible without cheats).
 * @version 1.1.0
 */

import * as mc from '@minecraft/server'; // For mc.EntityDamageCause and mc.EntityComponentTypes
import { getString } from '../../../core/i18n.js'; // If any translatable strings are needed

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
    const { config, playerUtils, actionManager } = dependencies; // Destructure what's needed
    const cause = eventSpecificData?.cause;
    const damagingEntity = eventSpecificData?.damagingEntity;

    if (!config.enableSelfHurtCheck || !pData || !cause) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // Core condition: damaging entity exists, is the player themselves, and damage cause is entityAttack.
    if (damagingEntity && damagingEntity.id === player.id && cause.cause === mc.EntityDamageCause.entityAttack) {
        playerUtils.debugLog?.(
            \`SelfHurtCheck: \${player.nameTag} damaged by self via entityAttack. Cause: \${cause.cause}, DamagingEntity: \${damagingEntity.typeId} (ID: \${damagingEntity.id})\`,
            watchedPrefix
        );

        let playerHealthString = "N/A";
        try {
            const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
            if (healthComponent) {
                playerHealthString = healthComponent.currentValue.toFixed(1);
            }
        } catch (e) {
            playerUtils.debugLog?.(\`SelfHurtCheck: Error getting health for \${player.nameTag}: \${e}\`, watchedPrefix);
        }

        const violationDetails = {
            damageCause: cause.cause,
            damagingEntityType: damagingEntity.typeId,
            playerHealth: playerHealthString
            // Consider adding damage amount if available from eventData.damage and relevant
        };

        await actionManager.executeCheckAction(player, "playerSelfHurt", violationDetails, dependencies);

    } else if (pData.isWatched && damagingEntity && damagingEntity.id === player.id) {
        // Log other types of self-damage for watched players, for observation, but don't flag.
        playerUtils.debugLog?.(
            \`SelfHurtCheck (Info): \${player.nameTag} damaged by self. Cause: \${cause.cause} (Ignored by flagging logic). DamagingEntity: \${damagingEntity.typeId}\`,
            watchedPrefix
        );
    }
}
