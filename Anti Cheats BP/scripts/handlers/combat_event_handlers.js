import { world, EntityDamageCause } from "@minecraft/server";
import configData from "../config.js";
import { sendMessageToAdmins } from "../assets/util.js";
import { ACModule } from "../classes/module.js";
import { Vector3utils } from "../classes/vector3.js"; // Ensure this path is correct

// Entity Hit Entity Event (Potential Reach/Attack Aura, Kill Aura)
world.afterEvents.entityHitEntity.subscribe((eventData) => {
    const { damagingEntity: attacker, hitEntity: victim } = eventData;

    if (!attacker || !victim || !(attacker.typeId === "minecraft:player")) return;
    if (victim.typeId !== "minecraft:player" && !configData.detect_entity_aura) return; // Only players or if entity aura is on

    const player = attacker; // player is the attacker

    // Kill Aura / NoSwing check (basic, more advanced checks might be in ACModule)
    if (ACModule.isActive("noswing") && player.getDynamicProperty("noswing_vl") > 0) {
        // This implies NoSwing module handles its own detection and logging.
        // If specific action on hit is needed, it can be added here.
    }

    // Reach Check
    if (ACModule.isActive("reach")) {
        const distance = Vector3utils.distance(player.location, victim.location);
        const maxReach = player.isSneaking ? configData.max_reach_sneaking : configData.max_reach;
        if (distance > maxReach) {
            let reachVl = (player.getDynamicProperty("reach_vl") || 0) + 1;
            player.setDynamicProperty("reach_vl", reachVl);

            if (reachVl >= configData.reach_detection_threshold) {
                sendMessageToAdmins(
                    "detection.reach_detected_admin", { player: player.name, distance: distance.toFixed(2), max_reach: maxReach }
                );
                if (configData.reach_punish) {
                    // Implement punishment (e.g., player.runCommandAsync("kick ..."))
                }
                player.setDynamicProperty("reach_vl", 0); // Reset after detection/punishment
            }
        }
    }
});

// Entity Hurt Event (Fall Damage, Velocity/Fly, Self-Hit, etc.)
world.afterEvents.entityHurt.subscribe((eventData) => {
    const { hurtEntity, damageSource, damage } = eventData;

    if (!(hurtEntity.typeId === "minecraft:player")) return;
    const player = hurtEntity;

    // NoFall Check (basic, assumes custom fall distance tracking)
    if (ACModule.isActive("nofall") && damageSource.cause === EntityDamageCause.fall) {
        const fallDistance = player.getDynamicProperty("fall_distance_custom") || 0;
        if (fallDistance > configData.nofall_min_fall_distance && damage < 1) { // Survived a lethal fall
            let nofallVl = (player.getDynamicProperty("nofall_vl") || 0) + 1;
            player.setDynamicProperty("nofall_vl", nofallVl);
            if (nofallVl >= configData.nofall_detection_threshold) {
                sendMessageToAdmins("detection.nofall_detected_admin", { player: player.name, fall_distance: fallDistance.toFixed(2) });
                if (configData.nofall_punish) {
                    // Implement punishment
                }
                player.setDynamicProperty("nofall_vl", 0);
            }
        }
        player.setDynamicProperty("fall_distance_custom", 0); // Reset after any fall
    }

    // Velocity/Knockback check (basic)
    // This is complex; a simple check might look for unexpected lack of knockback.
    // More advanced checks would be part of a dedicated Velocity module.
    if (ACModule.isActive("velocity") && (damageSource.cause === EntityDamageCause.entityAttack || damageSource.cause === EntityDamageCause.projectile)) {
        // const expectedKnockback = 0.4; // Highly dependent on many factors - Unused variable
        // This needs a robust way to predict and compare actual vs expected movement.
        // For now, this is a placeholder for where such logic would go.
        // Example: player.getDynamicProperty("last_velocity_vl") could be incremented if knockback is abnormal.
    }

    // Self-Hit Detection (if applicable, for some types of aura)
    if (damageSource.damagingEntity && damageSource.damagingEntity.id === player.id && damageSource.cause === EntityDamageCause.entityAttack) {
        // Player somehow hit themselves with a melee attack
        sendMessageToAdmins("detection.self_hit_detected_admin", { player: player.name });
        // Add VL or punishment as configured
    }
});

// Note: More sophisticated checks for modules like KillAura, Reach, NoFall, Velocity
// would typically involve more complex logic, potentially within their respective
// ACModule classes or by setting/reading more dynamic properties here.
// This refactoring focuses on moving existing event subscriptions.
// Exports are not strictly necessary if this file is imported for its side effects (event subscriptions).
