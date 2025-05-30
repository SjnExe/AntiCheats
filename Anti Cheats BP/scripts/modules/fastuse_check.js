import * as Minecraft from '@minecraft/server';
import CONFIG from '../config.js';
import { sendMessageToAllAdmins } from '../assets/util.js'; // sendMessageToAdmins -> sendMessageToAllAdmins
import { logDebug } from '../assets/logger.js';
// Removed i18n import

const world = Minecraft.world;
/**
 * Stores the timestamp of the last use for each item type, per player.
 * Key: player.id (string)
 * Value: Map<string, number> where key is item ID (string) and value is the timestamp (number) of the last use.
 * @type {Map<string, Map<string, number>>}
 */
const playerLastItemUseTime = new Map(); 

/**
 * Initializes the Fast Use Check module.
 * This function checks if the fast use detection feature is enabled in the configuration.
 * If enabled, it subscribes to the `world.beforeEvents.itemUse` event to monitor
 * and potentially cancel rapid item usage based on configured cooldowns.
 *
 * @export
 * @returns {void} This function does not return a value.
 */
export function initializeFastUseCheck() {
    const fastUseConfig = CONFIG.itemInteractions?.fastUseCheck;
    if (!fastUseConfig || !fastUseConfig.enabled) {
        return;
    }

    /**
     * Event handler for `world.beforeEvents.itemUse`.
     * Checks if a player is using an item too quickly based on configured cooldowns.
     * Cooldowns can be default, item-specific, or food-specific.
     * If fast use is detected, it increments a violation counter for the player.
     * If the violation count reaches a configured threshold, action is taken (e.g., event cancellation, custom command)
     * and the violation counter is reset. Timestamps of item uses are updated for valid uses or
     * if a violation occurred but the event was not cancelled.
     *
     * @param {Minecraft.ItemUseBeforeEvent} event - The event data object containing details about the item use.
     * @returns {void}
     */
    world.beforeEvents.itemUse.subscribe(event => {
        const { source, itemStack } = event;
        if (!(source instanceof Minecraft.Player)) {
            return; // Only check for players
        }

        const player = source;
        const itemId = itemStack.typeId;
        const currentTime = Date.now();

        let itemCooldown = fastUseConfig.defaultCooldownMs;
        if (fastUseConfig.itemSpecificCooldowns[itemId] !== undefined) {
            itemCooldown = fastUseConfig.itemSpecificCooldowns[itemId];
        } else if (itemStack.isFood) { // Check if the item is food
            itemCooldown = fastUseConfig.foodCooldownMs;
        }
        
        if (!playerLastItemUseTime.has(player.id)) {
            playerLastItemUseTime.set(player.id, new Map());
        }

        const playerItemCooldowns = playerLastItemUseTime.get(player.id);
        const lastUseTime = playerItemCooldowns.get(itemId) || 0;

        if (currentTime - lastUseTime < itemCooldown) {
            let violations = player.getDynamicProperty("ac:fastUseViolations") || 0;
            violations++;
            player.setDynamicProperty("ac:fastUseViolations", violations);

            logDebug(`[FastUseCheck] Player ${player.name} FastUse violation for ${itemId}. Interval: ${currentTime - lastUseTime}ms. Violations: ${violations}`);

            if (violations >= fastUseConfig.violationThreshold) {
                player.setDynamicProperty("ac:fastUseViolations", 0); // Reset violations

                sendMessageToAllAdmins("modules.fastuse.notify.adminFlag", {
                    playerName: player.name,
                    itemName: itemStack.typeId.replace("minecraft:", "")
                });
                
                const action = fastUseConfig.action;
                if (action === "cancelEvent") {
                    event.cancel = true;
                    logDebug(`[FastUseCheck] Cancelled item use for ${player.name} due to FastUse.`);
                } else if (action === "customCommand") {
                    let command = fastUseConfig.customCommand;
                    command = command.replace(/{playerName}/g, player.name)
                                     .replace(/{itemName}/g, itemStack.typeId.replace("minecraft:", ""));
                    try {
                        world.overworld.runCommandAsync(command);
                        logDebug(`[FastUseCheck] Executed custom command for ${player.name}: ${command}`);
                    } catch(e) {
                        logDebug(`[FastUseCheck] Error executing custom command for ${player.name}: ${e}`);
                    }
                }
            }
            // If action is cancelEvent and threshold is met, we've already cancelled.
            // If not cancelling, or threshold not met, we should still update the timestamp
            // to prevent spamming violations for a single 'too fast' action if it wasn't cancelled.
            // However, if cancelled, they didn't 'use' it, so don't update.
            if (!event.cancel) {
                playerItemCooldowns.set(itemId, currentTime);
            }
        } else {
            // Valid use, update timestamp
            playerItemCooldowns.set(itemId, currentTime);
            // Optional: Reset violation count for this specific item if you want more granular violation tracking.
            // For now, using a single global fastUseViolations counter.
        }
    });
}
