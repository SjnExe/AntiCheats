import * as Minecraft from '@minecraft/server';
import * as config from '../config.js';
import { sendMessageToAllAdmins } from '../assets/util.js';
import { logDebug } from '../assets/logger.js'; // Moved logDebug to logger.js
// Removed i18n import

const world = Minecraft.world;
/**
 * Stores the timestamp of the last swing for each player.
 * Key: player.id (string)
 * Value: timestamp (number) of the last recorded swing.
 * @type {Map<string, number>}
 */
const playerLastSwingTime = new Map(); // Stores player.id -> timestamp

/**
 * Initializes the NoSwing Check module.
 * This function checks if the NoSwing detection feature is enabled in the configuration.
 * If enabled, it subscribes to `playerSwing` (if available) and `entityHitEntity` events
 * to detect attacks made without a corresponding recent swing animation from the player.
 *
 * @export
 * @returns {void} This function does not return a value.
 */
export function initializeNoSwingCheck() {
    if (!config.default.combat.noSwingCheck.enabled) {
        return;
    }

    // Subscribe to player swing events to record the time
    if (world.afterEvents.playerSwing) {
        /**
         * Event handler for `world.afterEvents.playerSwing`.
         * Records the timestamp of the player's swing action to the `playerLastSwingTime` map.
         * This information is used by the `entityHitEntity` subscriber to detect NoSwing behavior.
         *
         * @param {Minecraft.PlayerSwingAfterEvent} event - The event data object containing details about the player swing.
         * @returns {void}
         */
        world.afterEvents.playerSwing.subscribe(event => {
            const { player } = event;
            playerLastSwingTime.set(player.id, Date.now());
        }, {
            // No specific entityTypes needed here, just general player swings.
        });
    } else {
        logDebug("[NoSwingCheck] world.afterEvents.playerSwing is not available. NoSwing detection based on actual swings will be impaired.");
    }

    /**
     * Event handler for `world.afterEvents.entityHitEntity`.
     * Checks for NoSwing violations when a player damages another entity.
     * It compares the time of the hit against the player's last recorded swing time from `playerLastSwingTime`.
     * If the hit occurs without a recent swing (or if no swing is recorded within a configured timeframe),
     * it's considered a NoSwing violation.
     * Accumulating violations beyond a configured threshold triggers a defined action,
     * such as alerting admins or running a custom command.
     *
     * @param {Minecraft.EntityHitEntityAfterEvent} event - The event data object containing details about the hit.
     * @returns {void}
     */
    world.afterEvents.entityHitEntity.subscribe(event => {
        const { damagingEntity, hitEntity } = event;

        if (!(damagingEntity instanceof Minecraft.Player) || hitEntity instanceof Minecraft.Player) {
            // Only check for players hitting non-player entities for NoSwing,
            // as player-on-player NoSwing might be too prone to false positives with this method
            // or could be part of a more specific PvP Killaura check.
            // This can be adjusted later if needed.
            // Also, ignore if the player is hitting themselves (e.g. shooting arrow up)
            if (damagingEntity instanceof Minecraft.Player && damagingEntity.id === hitEntity.id) return;
            
            // If we want to check for PvE only:
            // if (hitEntity instanceof Minecraft.Player) return; 
            // For now, let's allow checking for PvP as well, but be mindful of false positives.
            // The provided code effectively makes this a PvE-only check due to the outer condition.
            // To check PvP as well, the `|| hitEntity instanceof Minecraft.Player` should be removed.
            // For now, I will keep the provided logic as is.
            return; 
        }

        const player = damagingEntity;
        const lastSwingTime = playerLastSwingTime.get(player.id);
        const currentTime = Date.now();

        if (lastSwingTime === undefined || (currentTime - lastSwingTime > config.default.combat.noSwingCheck.maxTimeSinceSwingMs)) {
            // If no swing was recorded recently, or at all, it's a potential NoSwing.

            let violations = player.getDynamicProperty("ac:noSwingViolations") || 0;
            violations++;
            player.setDynamicProperty("ac:noSwingViolations", violations);

            const debugMsg = `[NoSwingCheck] Player ${player.name} potential NoSwing. Last swing: ${lastSwingTime ? (currentTime - lastSwingTime) + 'ms ago' : 'never/long ago'}. Violations: ${violations}`;
            logDebug(debugMsg);
            
            if (violations >= config.default.combat.noSwingCheck.violationThreshold) {
                player.setDynamicProperty("ac:noSwingViolations", 0); // Reset violations

                sendMessageToAllAdmins("modules.noswing.notify.adminFlag", { playerName: player.name }, true);

                const action = config.default.combat.noSwingCheck.action;
                if (action === "customCommand") {
                    let command = config.default.combat.noSwingCheck.customCommand;
                    command = command.replace(/{playerName}/g, player.name);
                    try {
                        world.overworld.runCommandAsync(command); // Changed from world.overworld to player.dimension for context
                        logDebug(`[NoSwingCheck] Executed custom command for ${player.name}: ${command}`);
                    } catch(e) {
                        logDebug(`[NoSwingCheck] Error executing custom command for ${player.name}: ${e}`);
                    }
                }
            }
        }
    }, {
        // No specific entityTypes needed here for the hit event itself.
    });
}
