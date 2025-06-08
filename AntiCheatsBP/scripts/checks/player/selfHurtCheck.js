/**
 * @file AntiCheatsBP/scripts/checks/player/selfHurtCheck.js
 * Implements a check to detect suspicious self-inflicted damage, specifically when a player
 * damages themselves via a direct entity attack (which is normally not possible without cheats).
 * @version 1.0.1
 */

import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks if a player is damaging themselves directly via an entity attack, which is suspicious.
 * This check is typically called from an `EntityHurtEvent` handler.
 *
 * @param {mc.Player} player - The player who was hurt (the `hurtEntity` from the event).
 * @param {mc.EntityDamageSource} cause - The full damage cause from the `EntityHurtEvent`.
 * @param {mc.Entity} [damagingEntity] - The entity that dealt the damage, if any (from `damageSource.damagingEntity`).
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data for the hurt player.
 * @param {Config} config - The server configuration object, with `enableSelfHurtCheck`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkSelfHurt(
    player,
    cause,
    damagingEntity,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableSelfHurtCheck || !pData) { // Added null check for pData
        return;
    }

    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    // The core condition: damaging entity exists, is the player themselves, and damage cause is entityAttack.
    // Other self-damage (fall, void, suffocation, magic with AOE hitting self) is not covered here.
    if (damagingEntity && damagingEntity.id === player.id && cause.cause === mc.EntityDamageCause.entityAttack) {
        playerUtils.debugLog?.(
            `SelfHurtCheck: ${player.nameTag} damaged by self via entityAttack. Cause: ${cause.cause}, DamagingEntity: ${damagingEntity.typeId} (ID: ${damagingEntity.id})`,
            watchedPrefix
        );

        let playerHealthString = "N/A";
        try {
            const healthComponent = player.getComponent(mc.EntityComponentTypes.Health);
            if (healthComponent) {
                playerHealthString = healthComponent.currentValue.toFixed(1);
            }
        } catch (e) {
            playerUtils.debugLog?.(`SelfHurtCheck: Error getting health for ${player.nameTag}: ${e}`, watchedPrefix);
        }

        const violationDetails = {
            damageCause: cause.cause, // e.g., "entityAttack"
            damagingEntityType: damagingEntity.typeId, // Should be player's typeId
            playerHealth: playerHealthString
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "player_self_hurt", violationDetails, dependencies);

    } else if (pData.isWatched && damagingEntity && damagingEntity.id === player.id) {
        // Log other types of self-damage for watched players, for observation, but don't flag.
        playerUtils.debugLog?.(
            `SelfHurtCheck (Info): ${player.nameTag} damaged by self. Cause: ${cause.cause} (Ignored by flagging logic). DamagingEntity: ${damagingEntity.typeId}`,
            watchedPrefix
        );
    }
    // This check reads pData but doesn't modify it. No isDirtyForSave needed.
}
