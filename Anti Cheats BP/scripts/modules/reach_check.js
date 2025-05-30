import * as Minecraft from '@minecraft/server';
import CONFIG from '../config.js';
import { sendMessageToAllAdmins } from '../assets/util.js'; // sendMessageToAdmins -> sendMessageToAllAdmins
import { logDebug } from '../assets/logger.js';
// Removed i18n import

const world = Minecraft.world;

/**
 * Handles the logic when a reach violation is detected.
 * Increments the player's reach violation count stored in a dynamic property.
 * If the violation count meets or exceeds the configured threshold, it resets the count,
 * sends an alert to admins, and executes a configured action (e.g., a custom command).
 *
 * @param {Minecraft.Player} player - The player who committed the reach violation.
 * @param {string} reachTypeStr - A string identifying the type of reach violation (e.g., "EntityHit", "BlockBreak", "BlockPlace").
 * @param {number} actualDistance - The actual distance of the player's interaction.
 * @param {number} maxAllowedDistance - The maximum allowed distance for this type of interaction.
 * @param {object} reachConfig - The specific reach check configuration object from `config.js` (e.g., `config.default.combat.reachCheck`).
 * @returns {boolean} Returns `true` if the configured action for a violation is "cancelEvent" and the threshold was met,
 *                    indicating the originating event should be cancelled. Otherwise, returns `false`.
 */
function handleReachViolation(player, reachTypeStr, actualDistance, maxAllowedDistance, reachConfig) {
    let violations = player.getDynamicProperty("ac:reachViolations") || 0;
    violations++;
    player.setDynamicProperty("ac:reachViolations", violations);

    logDebug(`[ReachCheck] Player ${player.name} exceeded ${reachTypeStr} reach. Distance: ${actualDistance.toFixed(2)}/${maxAllowedDistance}. Violations: ${violations}`);

    if (violations >= reachConfig.violationThreshold) {
        player.setDynamicProperty("ac:reachViolations", 0); // Reset violations

        sendMessageToAllAdmins("modules.reach.notify.adminFlag", {
            playerName: player.name,
            reachType: reachTypeStr,
            actualDistance: actualDistance.toFixed(2),
            maxAllowedDistance: maxAllowedDistance.toFixed(2)
        }, true);

        const action = reachConfig.action;
        if (action === "customCommand" && reachConfig.customCommand) {
            let command = reachConfig.customCommand;
            command = command.replace(/{playerName}/g, player.name)
                             .replace(/{reachType}/g, reachTypeStr)
                             .replace(/{distance}/g, actualDistance.toFixed(2))
                             .replace(/{maxDistance}/g, maxAllowedDistance.toFixed(2)); // Ensure maxDistance is also formatted
            try {
                // It's generally safer to run commands from the player's dimension or overworld
                player.dimension.runCommandAsync(command); 
                logDebug(`[ReachCheck] Executed custom command for ${player.name}: ${command}`);
            } catch(e) {
                logDebug(`[ReachCheck] Error executing custom command for ${player.name}: ${e}`);
            }
        }
        // Return true if the action implies cancellation and the event is cancellable
        return action === "cancelEvent"; 
    }
    return false; // Do not cancel event by default
}

/**
 * Initializes the Reach Check module.
 * This function checks if reach detection is enabled in the configuration.
 * If enabled, it subscribes to relevant game events (`entityHitEntity`, `playerBreakBlock`, `playerPlaceBlock`)
 * to monitor player interaction distances and detect potential reach violations.
 *
 * @export
 * @returns {void} This function does not return a value.
 */
export function initializeReachCheck() {
    const reachConfig = CONFIG.combat.reachCheck; // Get the full reach config
    if (!reachConfig || !reachConfig.enabled) {
        return;
    }

    // Entity Hit Check (using afterEvents, so cannot be cancelled by this handler directly)
    /**
     * Event handler for `world.afterEvents.entityHitEntity`.
     * Checks for reach violations when a player damages another entity.
     * It calculates the distance between the attacking player's head and the hit entity's location.
     * If this distance exceeds the configured maximum for the player's game mode (creative or survival),
     * it calls `handleReachViolation` to process the potential infraction.
     * Note: This is an "afterEvent", so the hit has already occurred and cannot be cancelled by this handler.
     *
     * @param {Minecraft.EntityHitEntityAfterEvent} event - The event data object containing details about the hit.
     * @returns {void}
     */
    world.afterEvents.entityHitEntity.subscribe(event => {
        const { damagingEntity, hitEntity } = event;

        if (!(damagingEntity instanceof Minecraft.Player)) {
            return; 
        }
        const player = damagingEntity;

        let maxDistance;
        if (player.currentGamemode === Minecraft.GameMode.creative) {
            maxDistance = reachConfig.maxHitDistanceCreative;
        } else { 
            maxDistance = reachConfig.maxHitDistanceSurvival;
        }

        const playerLocation = player.getHeadLocation(); 
        const targetLocation = hitEntity.location;
        
        const distance = Math.sqrt(
            Math.pow(playerLocation.x - targetLocation.x, 2) +
            Math.pow(playerLocation.y - targetLocation.y, 2) +
            Math.pow(playerLocation.z - targetLocation.z, 2)
        );

        if (distance > maxDistance) {
            // Call the common handler. Cancellation won't apply here due to afterEvents.
            handleReachViolation(player, "EntityHit", distance, maxDistance, reachConfig);
        }
    });

    // Player Break Block Check
    if (reachConfig.checkBlockBreak) {
        /**
         * Event handler for `world.beforeEvents.playerBreakBlock`.
         * Checks for reach violations before a player breaks a block.
         * It calculates the distance between the player's head and the center of the block being broken.
         * If this distance exceeds the configured maximum for the player's game mode,
         * it calls `handleReachViolation`. If `handleReachViolation` indicates the event should be cancelled
         * (based on configured action and threshold), this handler cancels the block break event.
         *
         * @param {Minecraft.PlayerBreakBlockBeforeEvent} event - The event data object.
         * @returns {void}
         */
        world.beforeEvents.playerBreakBlock.subscribe(event => {
            const { player, block } = event;
            
            let maxDistance;
            if (player.currentGamemode === Minecraft.GameMode.creative) {
                maxDistance = reachConfig.maxBlockBreakDistanceCreative;
            } else {
                maxDistance = reachConfig.maxBlockBreakDistanceSurvival;
            }

            const playerHeadLocation = player.getHeadLocation();
            // Calculate center of the block for more accurate distance
            const blockCenterLocation = { 
                x: block.location.x + 0.5, 
                y: block.location.y + 0.5, 
                z: block.location.z + 0.5 
            };

            const distance = Math.sqrt(
                Math.pow(playerHeadLocation.x - blockCenterLocation.x, 2) +
                Math.pow(playerHeadLocation.y - blockCenterLocation.y, 2) +
                Math.pow(playerHeadLocation.z - blockCenterLocation.z, 2)
            );

            if (distance > maxDistance) {
                if (handleReachViolation(player, "BlockBreak", distance, maxDistance, reachConfig)) {
                    event.cancel = true;
                }
            }
        });
    }

    // Player Place Block Check
    if (reachConfig.checkBlockPlace) {
        /**
         * Event handler for `world.beforeEvents.playerPlaceBlock`.
         * Checks for reach violations before a player places a block.
         * It calculates the distance between the player's head and the center of the location where the block is being placed.
         * If this distance exceeds the configured maximum for the player's game mode,
         * it calls `handleReachViolation`. If `handleReachViolation` indicates the event should be cancelled
         * (based on configured action and threshold), this handler cancels the block place event.
         *
         * @param {Minecraft.PlayerPlaceBlockBeforeEvent} event - The event data object.
         * @returns {void}
         */
        world.beforeEvents.playerPlaceBlock.subscribe(event => {
            const { player, block } = event; // block is the block being placed

            let maxDistance;
            if (player.currentGamemode === Minecraft.GameMode.creative) {
                maxDistance = reachConfig.maxBlockPlaceDistanceCreative;
            } else {
                maxDistance = reachConfig.maxBlockPlaceDistanceSurvival;
            }
            
            const playerHeadLocation = player.getHeadLocation();
            // block.location refers to the location where the block will be placed.
            // Calculate center of the block for more accurate distance
             const blockCenterLocation = { 
                x: block.location.x + 0.5, 
                y: block.location.y + 0.5, 
                z: block.location.z + 0.5 
            };

            const distance = Math.sqrt(
                Math.pow(playerHeadLocation.x - blockCenterLocation.x, 2) +
                Math.pow(playerHeadLocation.y - blockCenterLocation.y, 2) +
                Math.pow(playerHeadLocation.z - blockCenterLocation.z, 2)
            );

            if (distance > maxDistance) {
                 if (handleReachViolation(player, "BlockPlace", distance, maxDistance, reachConfig)) {
                    event.cancel = true;
                }
            }
        });
    }
}
