import { world, system } from "@minecraft/server"; // Removed ItemStack, BlockPermutation
import configData from "../config.js";
import { i18n } from "../assets/i18n.js"; // Assuming i18n is from assets
import { sendMessageToAdmins } from "../assets/util.js"; // Removed getScore, getPlayerRank
import { ACModule } from "../classes/module.js";
import { showAdminPanel } from "../forms/admin_panel.js"; // Ensure this path is correct
import { getPlayerState } from '../systems/periodic_checks.js'; // Import for player state

// Item Use Event (After) - Primarily for specific item actions like Trident or Admin Panel
world.afterEvents.itemUse.subscribe((eventData) => {
    const player = eventData.source; // Player who used the item
    const item = eventData.itemStack;

    // Trident High Damage / Fly Check (Module based)
    if (item.typeId === "minecraft:trident" && ACModule.isActive("trident")) {
        // Logic for trident high damage/fly would be here or called from here.
        // This might involve checking player velocity changes, if they are Riptide enchanted, etc.
        // Example: player.setDynamicProperty("last_used_trident_time", world.currentTick);
        // The actual detection might happen in a tick-based check in periodic_checks.js
        // or via more complex event analysis if the Trident module is sophisticated.
    }

    // Admin Panel Item
    if (item.typeId === configData.admin_panel_item_id && player.hasTag("admin")) {
        system.run(() => { // Use system.run to avoid issues with opening forms in events
            showAdminPanel(player);
        });
    }
});

// Item Use Event (Before) - Primarily for Anti-Grief checks
world.beforeEvents.itemUse.subscribe((eventData) => {
    const player = eventData.source;
    const item = eventData.itemStack;

    // Anti-Grief: Prevent use of certain items if module is active
    if (ACModule.isActive("antigrief") && configData.restricted_items_antigrief.includes(item.typeId)) {
        if (!player.hasAdmin()) { // Allow admins to use restricted items
            eventData.cancel = true;
            player.sendMessage(i18n("system.antigrief_item_restriction", { item: item.typeId }));
            sendMessageToAdmins("system.antigrief_item_attempt_admin", { player: player.name, item: item.typeId });
        }
    }
});

// Player Break Block Event - For Anti-Grief / Nuker checks
world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    const player = eventData.player;
    const blockPermutation = eventData.brokenBlockPermutation; // Full permutation
    const blockId = blockPermutation.type.id; // Block ID
    const dimension = player.dimension; // Get dimension from player

    const state = getPlayerState(player.id);
    if (!state) {
        console.warn(`[AntiCheats_WorldInteraction] No state found for player ${player.name} (${player.id}) in playerBreakBlock. Nuker check might be affected.`);
        // Depending on the desired behavior, you might return or proceed.
        // If proceeding, subsequent nuker checks relying on 'state' will effectively be skipped or might error.
    }

    const nukerConfig = configData.nuker_detection; // Assuming nuker config is structured like this
    const antiNukerActive = ACModule.isActive("nuker");
    const autoModOn = ACModule.isActive("automod"); // Assuming an automod module status

    // Anti-Grief: Log block breaks (moved before nuker for clarity, can be anywhere)
    if (ACModule.isActive("antigrief") && configData.log_block_breaks_antigrief) {
        // console.warn(`[AntiGrief] ${player.name} broke ${blockId}`);
    }

    // Nuker Detection Logic
    if (antiNukerActive && state) { // Ensure state exists before using it for nuker logic
        // General Nuker Check (incrementing state.nukerVLBreak)
        // This count is evaluated in periodic_checks.js
        if (!nukerConfig.block_exceptions.includes(blockId) && !player.hasEffect("haste")) {
            state.nukerVLBreak = (state.nukerVLBreak || 0) + 1;
        }

        // Deep Ore Nuker Check (incrementing state.deepValuableOresBrokenThisTick)
        // This count is also intended to be evaluated in periodic_checks.js OR could be checked here directly.
        // For this task, we are just incrementing it. The check for exceeding maxDeepOreBlocks remains in periodic_checks.js
        // or if it was here before, it will be adapted.
        // The original code had the check directly in playerBreakBlock. Let's adapt that to use state.
        if (nukerConfig.check_ore_depth && player.location.y < nukerConfig.deep_mine_y_level && nukerConfig.valuable_ores.includes(blockId)) {
            if (!(player.hasTag("admin") && nukerConfig.check_admins === false)) { // Simplified admin check from original
                state.deepValuableOresBrokenThisTick = (state.deepValuableOresBrokenThisTick || 0) + 1;
                
                // The check for maxDeepOreBlocks was here in the original provided index.js.
                // We'll keep it here for now, using the state variable.
                // Note: The reset for state.deepValuableOresBrokenThisTick is planned for periodic_checks.js.
                if (state.deepValuableOresBrokenThisTick > nukerConfig.max_deep_ore_blocks) {
                    const items = dimension.getEntities({ location: eventData.block.location, maxDistance: 2, type: "minecraft:item" });
                    for (const item of items) item.kill();
                    eventData.block.setPermutation(blockPermutation); // Restore the block

                    if (autoModOn && configData.nuker_punish_automod) { // Assuming a config for automod punishment
                        player.runCommandAsync("gamemode adventure @s"); // Ensure commands are run async
                        player.teleport({ x: player.location.x, y: 325, z: player.location.z }, { dimension: player.dimension, rotation: { x: 0, y: 0 }, keepVelocity: false });
                    }
                    sendMessageToAdmins("detection.nuker_deep_ore_admin", { player: player.name, blocks: state.deepValuableOresBrokenThisTick });
                    // Resetting here for this specific check, as per original logic flow.
                    // If the main reset is in periodic_checks, this might lead to double reset or different behavior.
                    // For now, replicating the immediate reset after detection from original logic.
                    state.deepValuableOresBrokenThisTick = 0; 
                }
            }
        }
        // Note: The general state.nukerVLBreak is typically checked and reset in periodic_checks.js
    }
});

// Entity Spawn Event - For Anti-Grief (e.g. TNT spam)
world.afterEvents.entitySpawn.subscribe((eventData) => {
    const entity = eventData.entity;

    // Anti-Grief: Prevent spawning of certain entities if module is active
    if (ACModule.isActive("antigrief") && configData.restricted_entities_antigrief.includes(entity.typeId)) {
        // Check if spawned by a player and if that player is not an admin
        // This requires knowing the spawner. If the entity is spawned by an explosion (e.g. TNT spawns items),
        // or by a player directly (e.g. spawn egg), the logic would differ.
        // For now, let's assume a general restriction. More specific checks (like who spawned it) are complex.
        // A placeholder for more advanced logic:
        if (entity.typeId === "minecraft:tnt" /* && spawnedByPlayerNotAdmin */) {
            // entity.triggerEvent("minecraft:explode"); // Or despawn, depending on desired outcome
            // console.warn(`[AntiGrief] Restricted entity ${entity.typeId} spawned.`);
            // sendMessageToAdmins(...)
        }
    }
});

// Note: Some interactions, like placing blocks (world.beforeEvents.playerPlaceBlock),
// could also be added here if needed for Anti-Grief or other modules.
// For now, focusing on the specified events.
// Exports are not strictly necessary if this file is imported for its side effects.
