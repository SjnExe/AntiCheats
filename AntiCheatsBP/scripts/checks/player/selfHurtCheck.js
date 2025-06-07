// AntiCheatsBP/scripts/checks/player/selfHurtCheck.js
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if a player is damaging themselves directly via entityAttack, which is suspicious.
 * @param {mc.Player} player The player who was hurt.
 * @param {mc.EntityDamageSource} cause The full damage cause from the event.
 * @param {mc.Entity} [damagingEntity] The entity that dealt the damage, if any.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkSelfHurt(player, cause, damagingEntity, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableSelfHurtCheck) {
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // We are interested if the player is the direct damaging entity and the cause is an attack.
    if (damagingEntity && damagingEntity.id === player.id && cause.cause === mc.EntityDamageCause.entityAttack) {
        if (playerUtils.debugLog) {
            playerUtils.debugLog(`SelfHurtCheck: ${player.nameTag} damaged by self via entityAttack. Cause: ${cause.cause}, DamagingEntity: ${damagingEntity.typeId} (ID: ${damagingEntity.id})`, watchedPrefix);
        }

        const violationDetails = {
            cause: cause.cause, // e.g., "entityAttack"
            damagingEntityType: damagingEntity.typeId,
            playerHealth: player.getComponent(mc.EntityComponentTypes.Health)?.currentValue.toFixed(1) || "N/A"
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "player_self_hurt", violationDetails, dependencies);
    } else {
        if (playerUtils.debugLog && pData.isWatched && damagingEntity && damagingEntity.id === player.id) {
            // Log if player is damaging entity but cause is not entityAttack, for observation.
            playerUtils.debugLog(`SelfHurtCheck: ${player.nameTag} damaged by self. Cause: ${cause.cause} (Ignored by current logic). DamagingEntity: ${damagingEntity.typeId}`, watchedPrefix);
        }
    }
}
