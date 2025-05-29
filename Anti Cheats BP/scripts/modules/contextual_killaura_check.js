import * as Minecraft from '@minecraft/server';
import CONFIG from '../config.js';
import { sendMessageToAdmins } from '../assets/util.js';
import { logDebug } from '../assets/logger.js';
// Removed i18n import

const world = Minecraft.world;
const system = Minecraft.system;

// We might need to track player states if direct properties aren't available.
// e.g., const playersUsingItems = new Set(); // player.id
// e.g., const playersWithOpenContainers = new Set(); // player.id

/**
 * Initializes the Contextual Killaura Check module.
 * This function checks if the contextual killaura feature is enabled in the configuration.
 * If enabled, it subscribes to the `world.afterEvents.entityHitEntity` event to monitor
 * player attack patterns in specific contexts (e.g., while sleeping, blocking).
 *
 * @export
 * @returns {void} This function does not return a value.
 */
export function initializeContextualKillauraCheck() {
    const killauraConfig = CONFIG.combat?.contextualKillauraCheck;
    if (!killauraConfig || !killauraConfig.enabled) {
        return;
    }

    // Note: Detecting "using item" and "chest open" accurately server-side for all cases can be very complex.
    // This implementation will make best-effort attempts or focus on what's feasible.

    // Example for "using item" - very simplified:
    // This would require more events (ItemStartUse, ItemStopUse) for robust tracking.
    // world.afterEvents.itemUse.subscribe(event => {
    //     if (isItemWithUseDuration(event.itemStack.typeId)) {
    //         playersUsingItems.add(event.source.id);
    //         // Need a way to remove them: ItemStopUse, or a timer, or if they switch item.
    //     }
    // });

    /**
     * Event handler for `world.afterEvents.entityHitEntity`.
     * Performs contextual killaura checks when a player damages another entity.
     * It evaluates if the player is attacking under suspicious circumstances, such as:
     * - Attacking while presumed to be sleeping (e.g., has "ac:is_sleeping" tag).
     * - Attacking while blocking.
     * (Note: Attacking while a chest is open is mentioned as hard to detect and not implemented).
     * If a violation is detected, it increments a dynamic property counter for the player.
     * If the violation count reaches a configured threshold, it resets the counter and takes action
     * (e.g., sends an admin alert, runs a custom command).
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
        let violationType = null;

        // 1. Check for attacking while sleeping
        if (killauraConfig.checkWhileSleeping) {
            // The 'isSleeping' property is the most direct way if available.
            // As of @minecraft/server 1.8.0, there isn't a direct player.isSleeping.
            // A common workaround is to check if the player has the 'sleeping' state (e.g., player.matches({ state: "sleeping" }))
            // or if they are physically in a bed via location checks + block type, or if they have a specific vanilla tag.
            // Let's assume a hypothetical tag or state for now, or this check might be difficult.
            // For example, if a system elsewhere adds a "safeguard:is_sleeping" tag:
            if (player.hasTag("ac:is_sleeping")) { // Placeholder for actual sleep detection
                violationType = "AttackingWhileSleeping";
            }
        }

        // 2. Check for attacking while using an item (Simplified: check if player is blocking)
        // More robust checks would involve tracking item use states.
        if (!violationType && killauraConfig.checkWhileUsingItem) {
            if (player.isBlocking) { // isBlocking is a standard Player property
                 violationType = "AttackingWhileBlocking";
            }
            // Add more checks here if we track other item uses, e.g. if (playersUsingItems.has(player.id)) ...
        }
        
        // 3. Check for attacking while chest open (Very hard to detect reliably server-side without specific events)
        // if (!violationType && killauraConfig.checkWhileChestOpen) {
        //     // if (playersWithOpenContainers.has(player.id)) { // Needs a system to add/remove player IDs
        //     // violationType = "AttackingWithContainerOpen";
        //     // }
        // }


        if (violationType) {
            let violations = player.getDynamicProperty("ac:contextKillauraViolations") || 0;
            violations++;
            player.setDynamicProperty("ac:contextKillauraViolations", violations);

            logDebug(`[ContextualKillaura] Player ${player.name} ${violationType}. Violations: ${violations}`);

            if (violations >= killauraConfig.violationThreshold) {
                player.setDynamicProperty("ac:contextKillauraViolations", 0); 

                sendMessageToAdmins("modules.contextualKillaura.notify.adminFlag", {
                    playerName: player.name,
                    violationType: violationType
                });
                
                const action = killauraConfig.action;
                if (action === "customCommand") {
                    let command = killauraConfig.customCommand;
                    command = command.replace(/{playerName}/g, player.name)
                                     .replace(/{type}/g, violationType);
                    try {
                        world.overworld.runCommandAsync(command);
                        logDebug(`[ContextualKillaura] Executed custom command for ${player.name}: ${command}`);
                    } catch(e) {
                        logDebug(`[ContextualKillaura] Error executing custom command for ${player.name}: ${e}`);
                    }
                }
            }
        }
    });
}
