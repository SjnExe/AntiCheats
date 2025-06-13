// AntiCheatsBP/scripts/core/automodConfig.js
/**
 * @file Stores the configuration for the AutoMod system.
 * This includes rules for automated actions based on flag counts,
 * messages for those actions, and per-check type toggles for AutoMod.
 * @version 1.0.0
 */

/**
 * @typedef {object} AutoModRuleParameter
 * @property {string} reasonKey - Key to look up the message in `automodActionMessages`.
 * @property {string} [duration] - Duration for actions like TEMP_BAN or MUTE (e.g., "5m", "1h").
 * @property {string} [itemToRemoveTypeId] - Specific item TypeId for REMOVE_ILLEGAL_ITEM action.
 */

/**
 * @typedef {object} AutoModRule
 * @property {number} flagThreshold - Number of flags of a specific checkType to trigger this rule.
 * @property {string} actionType - Type of action (e.g., "WARN", "KICK", "TEMP_BAN", "MUTE", "REMOVE_ILLEGAL_ITEM", "FLAG_ONLY").
 * @property {AutoModRuleParameter} parameters - Parameters for the action.
 * @property {boolean} resetFlagsAfterAction - Whether to reset the flag count for this checkType after the action.
 */

/**
 * Configuration for the AutoMod system.
 * Defines rules for automated actions based on flag counts, messages for those actions,
 * and per-check type toggles for AutoMod.
 * @type {{
 *   automodRules: Object.<string, AutoModRule[]>,
 *   automodActionMessages: Object.<string, string>,
 *   automodPerCheckTypeToggles: Object.<string, boolean>
 * }}
 */
export const automodConfig = {
    /**
     * Defines sets of rules for different checkTypes.
     * Each key is a checkType (e.g., "fly_hover", "combat_cps_high"),
     * and its value is an array of AutoModRule objects, ordered by escalating severity.
     * Example: "fly_hover": [ { flagThreshold: 5, actionType: "WARN", ... }, { flagThreshold: 10, actionType: "KICK", ... } ]
     */
    automodRules: {
        "example_fly_hover": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.fly.hover.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.fly.hover.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fly.hover.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "example_speed_ground": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.speed.ground.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.speed.ground.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 35, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.speed.ground.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "combat_cps_high": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.cps.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.cps.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.cps.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "movement_nofall": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.nofall.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.nofall.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.nofall.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_illegal_item_use": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.illegalitem.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.illegalitem.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.illegalitem.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "player_namespoof": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.namespoof.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "KICK", parameters: { reasonKey: "automod.namespoof.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.namespoof.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "example_reach_attack": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.reach.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.reach.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.reach.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movement_noslow": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.noslow.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.noslow.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.noslow.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "action_fast_use": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.fastuse.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "KICK", parameters: { reasonKey: "automod.fastuse.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 40, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fastuse.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "player_antigmc": [
            { flagThreshold: 10, actionType: "KICK", parameters: { reasonKey: "automod.antigmc.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.antigmc.tempban1", duration: "6h" }, resetFlagsAfterAction: true }
        ],
        "combat_multitarget_aura": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.multitarget.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.multitarget.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.multitarget.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_illegal_item_place": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.illegalplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.illegalplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.illegalplace.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "movement_invalid_sprint": [
            { flagThreshold: 8, actionType: "WARN", parameters: { reasonKey: "automod.invalidsprint.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 16, actionType: "KICK", parameters: { reasonKey: "automod.invalidsprint.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 24, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.invalidsprint.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chat_spam_fast_message": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatfast.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatfast.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatfast.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_invalid_pitch": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.invalidpitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.invalidpitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.invalidpitch.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_sleeping": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.attacksleep.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "KICK", parameters: { reasonKey: "automod.attacksleep.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 25, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attacksleep.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_instabreak_speed": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.instabreak.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.instabreak.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.instabreak.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "chat_spam_max_words": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatmaxwords.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatmaxwords.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatmaxwords.mute2", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_viewsnap_pitch": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.viewsnap.pitch.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.viewsnap.pitch.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.viewsnap.pitch.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combat_viewsnap_yaw": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.viewsnap.yaw.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.viewsnap.yaw.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.viewsnap.yaw.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_consuming": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.attackconsume.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.attackconsume.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attackconsume.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "player_invalid_render_distance": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.renderdistance.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "KICK", parameters: { reasonKey: "automod.renderdistance.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.renderdistance.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_bow_charging": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.attackbow.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.attackbow.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attackbow.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "combat_attack_while_shielding": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.attackshield.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.attackshield.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.attackshield.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "player_chat_during_combat": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatcombat.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatcombat.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatcombat.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "player_chat_during_item_use": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.chatitemuse.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.chatitemuse.mute1", duration: "5m" }, resetFlagsAfterAction: true },
            { flagThreshold: 15, actionType: "MUTE", parameters: { reasonKey: "automod.chatitemuse.mute2", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_nuker": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.nuker.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.nuker.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.nuker.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "world_autotool": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.autotool.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.autotool.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.autotool.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_instabreak_unbreakable": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.instabreakunbreakable.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.instabreakunbreakable.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.instabreakunbreakable.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "player_inventory_mod": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.inventorymod.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.inventorymod.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.inventorymod.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_tower_build": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.tower.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.tower.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.tower.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "world_flat_rotation_building": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.flatrotation.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.flatrotation.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.flatrotation.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_downward_scaffold": [
            { flagThreshold: 9, actionType: "WARN", parameters: { reasonKey: "automod.downscaffold.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 18, actionType: "KICK", parameters: { reasonKey: "automod.downscaffold.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 27, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.downscaffold.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_air_place": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.airplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "KICK", parameters: { reasonKey: "automod.airplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.airplace.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "world_fast_place": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.fastplace.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "KICK", parameters: { reasonKey: "automod.fastplace.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fastplace.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "chat_swear_violation": [
            { flagThreshold: 3, actionType: "WARN", parameters: { reasonKey: "automod.swear.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 5, actionType: "MUTE", parameters: { reasonKey: "automod.swear.mute1", duration: "10m" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "MUTE", parameters: { reasonKey: "automod.swear.mute2", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_tnt_place": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.tnt.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "KICK", parameters: { reasonKey: "automod.tnt.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.tnt.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_wither_spawn": [
            { flagThreshold: 5, actionType: "WARN", parameters: { reasonKey: "automod.wither.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 10, actionType: "KICK", parameters: { reasonKey: "automod.wither.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 15, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.wither.tempban1", duration: "1h" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_fire": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.fire.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.fire.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.fire.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_lava": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.lava.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.lava.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.lava.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_water": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.water.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "KICK", parameters: { reasonKey: "automod.water.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.water.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_blockspam": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.blockspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "KICK", parameters: { reasonKey: "automod.blockspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.blockspam.tempban1", duration: "5m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_entityspam": [
            { flagThreshold: 15, actionType: "WARN", parameters: { reasonKey: "automod.entityspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "KICK", parameters: { reasonKey: "automod.entityspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 45, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.entityspam.tempban1", duration: "10m" }, resetFlagsAfterAction: true }
        ],
        "world_antigrief_blockspam_density": [
            { flagThreshold: 10, actionType: "WARN", parameters: { reasonKey: "automod.densityspam.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "KICK", parameters: { reasonKey: "automod.densityspam.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 30, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.densityspam.tempban1", duration: "15m" }, resetFlagsAfterAction: true }
        ],
        "player_self_hurt": [
            { flagThreshold: 6, actionType: "WARN", parameters: { reasonKey: "automod.selfhurt.warn1" }, resetFlagsAfterAction: false },
            { flagThreshold: 12, actionType: "KICK", parameters: { reasonKey: "automod.selfhurt.kick1" }, resetFlagsAfterAction: false },
            { flagThreshold: 20, actionType: "TEMP_BAN", parameters: { reasonKey: "automod.selfhurt.tempban1", duration: "30m" }, resetFlagsAfterAction: true }
        ]
        // Add more checkTypes here in the future
    },

    /**
     * Stores user-facing messages for AutoMod actions.
     * Keys are `reasonKey` strings (e.g., "automod.fly.hover.warn") used in `AutoModRule.parameters`.
     * Values are the message strings.
     * Example: "automod.fly.hover.warn": "AutoMod: Flying (hover) detected. Please return to the ground."
     */
    automodActionMessages: {
        "automod.fly.hover.warn1": "AutoMod: Persistent hovering detected. Please adhere to server rules.",
        "automod.fly.hover.kick1": "AutoMod: Kicked for continued hovering violations.",
        "automod.fly.hover.tempban1": "AutoMod: Temporarily banned for excessive hovering violations.",
        "automod.speed.ground.warn1": "AutoMod: Excessive ground speed detected. Please play fairly.",
        "automod.speed.ground.kick1": "AutoMod: Kicked for repeated ground speed violations.",
        "automod.speed.ground.tempban1": "AutoMod: Temporarily banned for repeated ground speed violations.",
        "automod.cps.warn1": "AutoMod: High click speed detected multiple times.",
        "automod.cps.kick1": "AutoMod: Kicked for repeated high click speed violations.",
        "automod.cps.tempban1": "AutoMod: Temporarily banned for excessive click speed violations.",
        "automod.nofall.warn1": "AutoMod: NoFall (fall damage negation) detected multiple times.",
        "automod.nofall.kick1": "AutoMod: Kicked for repeated NoFall violations.",
        "automod.nofall.tempban1": "AutoMod: Temporarily banned for excessive NoFall violations.",
        "automod.illegalitem.warn1": "AutoMod: Use of illegal items detected. Items may be removed if behavior persists.",
        "automod.illegalitem.kick1": "AutoMod: Kicked for repeated use of illegal items.",
        "automod.illegalitem.tempban1": "AutoMod: Temporarily banned for excessive use of illegal items.",
        "automod.namespoof.warn1": "AutoMod: Name spoofing detected. Please change your name.",
        "automod.namespoof.kick1": "AutoMod: Kicked for repeated name spoofing violations.",
        "automod.namespoof.tempban1": "AutoMod: Temporarily banned for excessive name spoofing violations.",
        "automod.reach.warn1": "AutoMod: Excessive reach detected.",
        "automod.reach.kick1": "AutoMod: Kicked for repeated reach violations.",
        "automod.reach.tempban1": "AutoMod: Temporarily banned for excessive reach violations.",
        "automod.noslow.warn1": "AutoMod: NoSlow (movement exploit) detected.",
        "automod.noslow.kick1": "AutoMod: Kicked for repeated NoSlow violations.",
        "automod.noslow.tempban1": "AutoMod: Temporarily banned for excessive NoSlow violations.",
        "automod.fastuse.warn1": "AutoMod: Fast item usage detected.",
        "automod.fastuse.kick1": "AutoMod: Kicked for repeated fast item usage.",
        "automod.fastuse.tempban1": "AutoMod: Temporarily banned for excessive fast item usage.",
        "automod.antigmc.kick1": "AutoMod: Kicked for unauthorized Creative Mode usage.",
        "automod.antigmc.tempban1": "AutoMod: Temporarily banned for repeated unauthorized Creative Mode usage.",
        "automod.antigmc.permban1": "AutoMod: Permanently banned for repeated unauthorized Creative Mode usage.",
        "automod.multitarget.warn1": "AutoMod: Attacking multiple targets too quickly. Please play fairly.",
        "automod.multitarget.kick1": "AutoMod: Kicked for repeated multi-target aura violations.",
        "automod.multitarget.tempban1": "AutoMod: Temporarily banned for excessive multi-target aura violations.",
        "automod.illegalplace.warn1": "AutoMod: Placing illegal or restricted items detected.",
        "automod.illegalplace.kick1": "AutoMod: Kicked for repeatedly placing illegal items.",
        "automod.illegalplace.tempban1": "AutoMod: Temporarily banned for excessively placing illegal items.",
        "automod.invalidsprint.warn1": "AutoMod: Sprinting under invalid conditions detected multiple times.",
        "automod.invalidsprint.kick1": "AutoMod: Kicked for repeated invalid sprint violations.",
        "automod.invalidsprint.tempban1": "AutoMod: Temporarily banned for excessive invalid sprint violations.",
        "automod.chatfast.warn1": "AutoMod: Please do not send messages so quickly.",
        "automod.chatfast.mute1": "AutoMod: Muted for 5 minutes for sending messages too quickly.",
        "automod.chatfast.mute2": "AutoMod: Muted for 30 minutes for persistent fast message spam.",
        "automod.invalidpitch.warn1": "AutoMod: Invalid viewing angles detected multiple times.",
        "automod.invalidpitch.kick1": "AutoMod: Kicked for repeated invalid viewing angles.",
        "automod.invalidpitch.tempban1": "AutoMod: Temporarily banned for excessive invalid viewing angles.",
        "automod.attacksleep.warn1": "AutoMod: Attacking while sleeping detected.",
        "automod.attacksleep.kick1": "AutoMod: Kicked for repeatedly attacking while sleeping.",
        "automod.attacksleep.tempban1": "AutoMod: Temporarily banned for excessively attacking while sleeping.",
        "automod.instabreak.warn1": "AutoMod: Breaking blocks too quickly detected multiple times.",
        "automod.instabreak.kick1": "AutoMod: Kicked for repeated instabreak violations.",
        "automod.instabreak.tempban1": "AutoMod: Temporarily banned for excessive instabreak violations.",
        "automod.chatmaxwords.warn1": "AutoMod: Please avoid sending messages with excessive words.",
        "automod.chatmaxwords.mute1": "AutoMod: Muted for 5 minutes for sending messages with too many words.",
        "automod.chatmaxwords.mute2": "AutoMod: Muted for 30 minutes for persistent overly long messages.",
        "automod.viewsnap.pitch.warn1": "AutoMod: Suspicious vertical camera movements detected.",
        "automod.viewsnap.pitch.kick1": "AutoMod: Kicked for repeated suspicious vertical camera movements.",
        "automod.viewsnap.pitch.tempban1": "AutoMod: Temporarily banned for excessive suspicious vertical camera movements.",
        "automod.viewsnap.yaw.warn1": "AutoMod: Suspicious horizontal camera movements detected.",
        "automod.viewsnap.yaw.kick1": "AutoMod: Kicked for repeated suspicious horizontal camera movements.",
        "automod.viewsnap.yaw.tempban1": "AutoMod: Temporarily banned for excessive suspicious horizontal camera movements.",
        "automod.attackconsume.warn1": "AutoMod: Attacking while consuming items detected.",
        "automod.attackconsume.kick1": "AutoMod: Kicked for repeatedly attacking while consuming items.",
        "automod.attackconsume.tempban1": "AutoMod: Temporarily banned for excessively attacking while consuming items.",
        "automod.renderdistance.warn1": "AutoMod: Invalid client render distance reported.",
        "automod.renderdistance.kick1": "AutoMod: Kicked for repeatedly reporting invalid render distance.",
        "automod.renderdistance.tempban1": "AutoMod: Temporarily banned for persistently reporting invalid render distance.",
        "automod.attackbow.warn1": "AutoMod: Attacking while charging a bow detected.",
        "automod.attackbow.kick1": "AutoMod: Kicked for repeatedly attacking while charging a bow.",
        "automod.attackbow.tempban1": "AutoMod: Temporarily banned for excessively attacking while charging a bow.",
        "automod.attackshield.warn1": "AutoMod: Attacking while shielding detected.",
        "automod.attackshield.kick1": "AutoMod: Kicked for repeatedly attacking while shielding.",
        "automod.attackshield.tempban1": "AutoMod: Temporarily banned for excessively attacking while shielding.",
        "automod.chatcombat.warn1": "AutoMod: Please avoid chatting during combat cooldown.",
        "automod.chatcombat.mute1": "AutoMod: Muted for 5 minutes for chatting during combat cooldown.",
        "automod.chatcombat.mute2": "AutoMod: Muted for 15 minutes for persistently chatting during combat cooldown.",
        "automod.chatitemuse.warn1": "AutoMod: Please avoid chatting while using items.",
        "automod.chatitemuse.mute1": "AutoMod: Muted for 5 minutes for chatting while using items.",
        "automod.chatitemuse.mute2": "AutoMod: Muted for 15 minutes for persistently chatting while using items.",
        "automod.nuker.warn1": "AutoMod: Nuker (rapid/wide-area block breaking) activity detected.",
        "automod.nuker.kick1": "AutoMod: Kicked for persistent Nuker activity.",
        "automod.nuker.tempban1": "AutoMod: Temporarily banned for excessive Nuker activity.",
        "automod.autotool.warn1": "AutoMod: Suspicious tool switching (AutoTool) detected.",
        "automod.autotool.kick1": "AutoMod: Kicked for persistent AutoTool activity.",
        "automod.autotool.tempban1": "AutoMod: Temporarily banned for excessive AutoTool activity.",
        "automod.instabreakunbreakable.warn1": "AutoMod: Attempted to break an unbreakable block.",
        "automod.instabreakunbreakable.kick1": "AutoMod: Kicked for attempting to break unbreakable blocks.",
        "automod.instabreakunbreakable.tempban1": "AutoMod: Temporarily banned for persistent attempts to break unbreakable blocks.",
        "automod.inventorymod.warn1": "AutoMod: Suspicious inventory manipulation detected.",
        "automod.inventorymod.kick1": "AutoMod: Kicked for persistent inventory manipulation.",
        "automod.inventorymod.tempban1": "AutoMod: Temporarily banned for excessive inventory manipulation.",
        "automod.tower.warn1": "AutoMod: Rapid tower building detected.",
        "automod.tower.kick1": "AutoMod: Kicked for persistent tower building.",
        "automod.tower.tempban1": "AutoMod: Temporarily banned for excessive tower building.",
        "automod.flatrotation.warn1": "AutoMod: Unnatural building rotation detected.",
        "automod.flatrotation.kick1": "AutoMod: Kicked for persistent unnatural building rotation.",
        "automod.flatrotation.tempban1": "AutoMod: Temporarily banned for excessive unnatural building rotation.",
        "automod.downscaffold.warn1": "AutoMod: Downward scaffolding detected.",
        "automod.downscaffold.kick1": "AutoMod: Kicked for persistent downward scaffolding.",
        "automod.downscaffold.tempban1": "AutoMod: Temporarily banned for excessive downward scaffolding.",
        "automod.airplace.warn1": "AutoMod: Placing blocks in air detected.",
        "automod.airplace.kick1": "AutoMod: Kicked for persistent air placement.",
        "automod.airplace.tempban1": "AutoMod: Temporarily banned for excessive air placement.",
        "automod.fastplace.warn1": "AutoMod: Placing blocks too quickly detected.",
        "automod.fastplace.kick1": "AutoMod: Kicked for persistent fast placement.",
        "automod.fastplace.tempban1": "AutoMod: Temporarily banned for excessive fast placement.",
        "automod.swear.warn1": "AutoMod: Swear word detected in chat. Please be respectful.",
        "automod.swear.mute1": "AutoMod: Muted for 10 minutes for using inappropriate language.",
        "automod.swear.mute2": "AutoMod: Muted for 1 hour for persistent use of inappropriate language.",
        "automod.tnt.warn1": "AutoMod: Unauthorized TNT placement detected.",
        "automod.tnt.kick1": "AutoMod: Kicked for persistent unauthorized TNT placement.",
        "automod.tnt.tempban1": "AutoMod: Temporarily banned for excessive unauthorized TNT placement.",
        "automod.wither.warn1": "AutoMod: Unauthorized Wither spawning activity detected.",
        "automod.wither.kick1": "AutoMod: Kicked for persistent unauthorized Wither spawning.",
        "automod.wither.tempban1": "AutoMod: Temporarily banned for excessive unauthorized Wither spawning.",
        "automod.fire.warn1": "AutoMod: Unauthorized fire placement detected.",
        "automod.fire.kick1": "AutoMod: Kicked for persistent unauthorized fire placement.",
        "automod.fire.tempban1": "AutoMod: Temporarily banned for excessive unauthorized fire placement.",
        "automod.lava.warn1": "AutoMod: Unauthorized lava placement detected.",
        "automod.lava.kick1": "AutoMod: Kicked for persistent unauthorized lava placement.",
        "automod.lava.tempban1": "AutoMod: Temporarily banned for excessive unauthorized lava placement.",
        "automod.water.warn1": "AutoMod: Unauthorized water placement detected.",
        "automod.water.kick1": "AutoMod: Kicked for persistent unauthorized water placement.",
        "automod.water.tempban1": "AutoMod: Temporarily banned for excessive unauthorized water placement.",
        "automod.blockspam.warn1": "AutoMod: Block spamming detected.",
        "automod.blockspam.kick1": "AutoMod: Kicked for persistent block spamming.",
        "automod.blockspam.tempban1": "AutoMod: Temporarily banned for excessive block spamming.",
        "automod.entityspam.warn1": "AutoMod: Entity spamming detected.",
        "automod.entityspam.kick1": "AutoMod: Kicked for persistent entity spamming.",
        "automod.entityspam.tempban1": "AutoMod: Temporarily banned for excessive entity spamming.",
        "automod.densityspam.warn1": "AutoMod: High-density block spamming detected.",
        "automod.densityspam.kick1": "AutoMod: Kicked for persistent high-density block spamming.",
        "automod.densityspam.tempban1": "AutoMod: Temporarily banned for excessive high-density block spamming.",
        "automod.selfhurt.warn1": "AutoMod: Suspicious self-inflicted damage detected.",
        "automod.selfhurt.kick1": "AutoMod: Kicked for repeated suspicious self-inflicted damage.",
        "automod.selfhurt.tempban1": "AutoMod: Temporarily banned for excessive self-inflicted damage."
        // Add more messages here
    },

    /**
     * Allows enabling or disabling AutoMod for specific checkTypes.
     * Keys are checkType strings (e.g., "fly_hover").
     * Values are booleans (true to enable AutoMod for this check, false to disable).
     * If a checkType is not listed here, AutoMod processing for it might be skipped or default to enabled,
     * depending on `automodManager.js` logic (current logic implies it would skip if not found or if no rules).
     */
    automodPerCheckTypeToggles: {
        "example_fly_hover": true, // Renamed from fly_hover
        "example_speed_ground": true, // Renamed from speed_ground
        "combat_cps_high": true,
        "movement_nofall": true,
        "world_illegal_item_use": true,
        "player_namespoof": true,
        "player_antigmc": true,
        "combat_multitarget_aura": true,
        "world_illegal_item_place": true,
        "movement_invalid_sprint": true,
        "chat_spam_fast_message": true,
        "combat_invalid_pitch": true,
        "combat_attack_while_sleeping": true,
        "world_instabreak_speed": true,
        "chat_spam_max_words": true,
        "combat_viewsnap_pitch": true,
        "combat_viewsnap_yaw": true,
        "combat_attack_while_consuming": true,
        "player_invalid_render_distance": true,
        "combat_attack_while_bow_charging": true,
        "combat_attack_while_shielding": true,
        "player_chat_during_combat": true,
        "player_chat_during_item_use": true,
        "world_nuker": true,
        "world_autotool": true,
        "world_instabreak_unbreakable": true,
        "player_inventory_mod": true,
        "world_tower_build": true,
        "world_flat_rotation_building": true,
        "world_downward_scaffold": true,
        "world_air_place": true,
        "world_fast_place": true,
        "chat_swear_violation": true,
        "world_antigrief_tnt_place": true,
        "world_antigrief_wither_spawn": true,
        "world_antigrief_fire": true,
        "world_antigrief_lava": true,
        "world_antigrief_water": true,
        "world_antigrief_blockspam": true,
        "world_antigrief_entityspam": true,
        "world_antigrief_blockspam_density": true,
        "player_self_hurt": true
        // Add more checkTypes here
    }
};
