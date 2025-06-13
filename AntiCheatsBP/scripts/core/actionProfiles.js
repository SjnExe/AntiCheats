// AntiCheatsBP/scripts/core/action_profiles.js
/**
 * @file Defines action profiles for various cheat/behavior detections.
 * These profiles determine the consequences (flagging, notifications, logging, etc.)
 * when a specific check is triggered. Used by the ActionManager.
 * @version 1.0.0
 */

export const checkActionProfiles = {
    "example_fly_hover": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.example_fly_hover.flagReason",
            type: "fly"
        },
        notifyAdmins: {
            message: "profile.example_fly_hover.notifyMessage"
        },
        log: {
            actionType: "detected_fly_hover",
            detailsPrefix: "Fly (Hover Violation): "
        }
    },
    "example_speed_ground": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.example_speed_ground.flagReason",
            type: "speed"
        },
        notifyAdmins: {
            message: "profile.example_speed_ground.notifyMessage"
        },
        log: {
            actionType: "detected_speed_ground",
            detailsPrefix: "Speed (Ground Violation): "
        }
    },
    "example_reach_attack": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.example_reach_attack.flagReason",
            type: "reach"
        },
        notifyAdmins: {
            message: "profile.example_reach_attack.notifyMessage"
        },
        log: {
            actionType: "detected_reach_attack",
            detailsPrefix: "Reach (Attack Violation): "
        }
    },
    "movement_nofall": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.movement_nofall.flagReason",
            type: "movement_violation"
        },
        notifyAdmins: {
            message: "profile.movement_nofall.notifyMessage"
        },
        log: {
            actionType: "detected_movement_nofall",
            detailsPrefix: "NoFall Violation: "
        }
    },
    "world_nuker": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "profile.world_nuker.flagReason",
            type: "world_violation"
        },
        notifyAdmins: {
            message: "profile.world_nuker.notifyMessage"
        },
        log: {
            actionType: "detected_world_nuker",
            detailsPrefix: "Nuker Violation: "
        }
    },
    "combat_cps_high": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.combat_cps_high.flagReason",
            type: "combat_cps"
        },
        notifyAdmins: {
            message: "profile.combat_cps_high.notifyMessage"
        },
        log: {
            actionType: "detected_combat_cps_high",
            detailsPrefix: "High CPS Violation: "
        }
    },
    "combat_viewsnap_pitch": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.combat_viewsnap_pitch.flagReason",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "profile.combat_viewsnap_pitch.notifyMessage"
        },
        log: {
            actionType: "detected_viewsnap_pitch",
            detailsPrefix: "Pitch Snap Violation: "
        }
    },
    "combat_viewsnap_yaw": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.combat_viewsnap_yaw.flagReason",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "profile.combat_viewsnap_yaw.notifyMessage"
        },
        log: {
            actionType: "detected_viewsnap_yaw",
            detailsPrefix: "Yaw Snap Violation: "
        }
    },
    "combat_invalid_pitch": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.combat_invalid_pitch.flagReason",
            type: "combat_view_violation"
        },
        notifyAdmins: {
            message: "profile.combat_invalid_pitch.notifyMessage"
        },
        log: {
            actionType: "detected_invalid_pitch",
            detailsPrefix: "Invalid Pitch Violation: "
        }
    },
    "combat_multitarget_aura": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.combat_multitarget_aura.flagReason",
            type: "combat_aura"
        },
        notifyAdmins: {
            message: "profile.combat_multitarget_aura.notifyMessage"
        },
        log: {
            actionType: "detected_multitarget_aura",
            detailsPrefix: "Multi-Target Aura Violation: "
        }
    },
    "combat_attack_while_sleeping": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "profile.combat_attack_while_sleeping.flagReason",
            type: "combat_state_conflict"
        },
        notifyAdmins: {
            message: "profile.combat_attack_while_sleeping.notifyMessage"
        },
        log: {
            actionType: "detected_attack_while_sleeping",
            detailsPrefix: "Attack While Sleeping Violation: "
        }
    },
    "combat_attack_while_consuming": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.combat_attack_while_consuming.flagReason",
            type: "combat_state_conflict_consuming"
        },
        notifyAdmins: {
            message: "profile.combat_attack_while_consuming.notifyMessage"
        },
        log: {
            actionType: "detected_attack_while_consuming",
            detailsPrefix: "Attack While Consuming Violation: "
        }
    },
    "combat_attack_while_bow_charging": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.combat_attack_while_bow_charging.flagReason",
            type: "combat_state_conflict_bow"
        },
        notifyAdmins: {
            message: "profile.combat_attack_while_bow_charging.notifyMessage"
        },
        log: {
            actionType: "detected_attack_while_bow_charging",
            detailsPrefix: "Attack While Charging Bow Violation: "
        }
    },
    "combat_attack_while_shielding": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.combat_attack_while_shielding.flagReason",
            type: "combat_state_conflict_shield"
        },
        notifyAdmins: {
            message: "profile.combat_attack_while_shielding.notifyMessage"
        },
        log: {
            actionType: "detected_attack_while_shielding",
            detailsPrefix: "Attack While Shielding Violation: "
        }
    },
    "world_illegal_item_use": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.world_illegal_item_use.flagReason",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "profile.world_illegal_item_use.notifyMessage"
        },
        log: {
            actionType: "detected_illegal_item_use",
            detailsPrefix: "Illegal Item Use Violation: "
        }
    },
    "world_illegal_item_place": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.world_illegal_item_place.flagReason",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "profile.world_illegal_item_place.notifyMessage"
        },
        log: {
            actionType: "detected_illegal_item_place",
            detailsPrefix: "Illegal Item Placement Violation: "
        }
    },
    "world_tower_build": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.world_tower_build.flagReason",
            type: "world_scaffold_tower"
        },
        notifyAdmins: {
            message: "profile.world_tower_build.notifyMessage"
        },
        log: {
            actionType: "detected_world_tower_build",
            detailsPrefix: "Tower Building Violation: "
        }
    },
    "world_flat_rotation_building": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.world_flat_rotation_building.flagReason",
            type: "world_scaffold_rotation"
        },
        notifyAdmins: {
            message: "profile.world_flat_rotation_building.notifyMessage"
        },
        log: {
            actionType: "detected_world_flat_rotation_building",
            detailsPrefix: "Flat/Static Rotation Building Violation: "
        }
    },
    "world_downward_scaffold": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.world_downward_scaffold.flagReason",
            type: "world_scaffold_downward"
        },
        notifyAdmins: {
            message: "profile.world_downward_scaffold.notifyMessage"
        },
        log: {
            actionType: "detected_world_downward_scaffold",
            detailsPrefix: "Downward Scaffold Violation: "
        }
    },
    "world_air_place": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.world_air_place.flagReason",
            type: "world_scaffold_airplace"
        },
        notifyAdmins: {
            message: "profile.world_air_place.notifyMessage"
        },
        log: {
            actionType: "detected_world_air_place",
            detailsPrefix: "Air Placement Violation: "
        }
    },
    "action_fast_use": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.action_fast_use.flagReason",
            type: "action_fast_use"
        },
        notifyAdmins: {
            message: "profile.action_fast_use.notifyMessage"
        },
        log: {
            actionType: "detected_fast_use",
            detailsPrefix: "Fast Use Violation: "
        }
    },
    "world_fast_place": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.world_fast_place.flagReason",
            type: "world_fast_place"
        },
        notifyAdmins: {
            message: "profile.world_fast_place.notifyMessage"
        },
        log: {
            actionType: "detected_world_fast_place",
            detailsPrefix: "Fast Place Violation: "
        }
    },
    "movement_noslow": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.movement_noslow.flagReason",
            type: "movement_noslow"
        },
        notifyAdmins: {
            message: "profile.movement_noslow.notifyMessage"
        },
        log: {
            actionType: "detected_movement_noslow",
            detailsPrefix: "NoSlow Violation: "
        }
    },
    "movement_invalid_sprint": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.movement_invalid_sprint.flagReason",
            type: "movement_invalid_sprint"
        },
        notifyAdmins: {
            message: "profile.movement_invalid_sprint.notifyMessage"
        },
        log: {
            actionType: "detected_movement_invalid_sprint",
            detailsPrefix: "Invalid Sprint Violation: "
        }
    },
    "world_autotool": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.world_autotool.flagReason",
            type: "world_autotool"
        },
        notifyAdmins: {
            message: "profile.world_autotool.notifyMessage"
        },
        log: {
            actionType: "detected_world_autotool",
            detailsPrefix: "AutoTool Violation: "
        }
    },
    "world_instabreak_unbreakable": {
        enabled: true,
        flag: {
            increment: 10,
            reason: "profile.world_instabreak_unbreakable.flagReason",
            type: "world_instabreak_unbreakable"
        },
        notifyAdmins: {
            message: "profile.world_instabreak_unbreakable.notifyMessage"
        },
        log: {
            actionType: "detected_instabreak_unbreakable",
            detailsPrefix: "InstaBreak (Unbreakable) Violation: "
        }
    },
    "world_instabreak_speed": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.world_instabreak_speed.flagReason",
            type: "world_instabreak_speed"
        },
        notifyAdmins: {
            message: "profile.world_instabreak_speed.notifyMessage"
        },
        log: {
            actionType: "detected_instabreak_speed",
            detailsPrefix: "InstaBreak (Speed) Violation: "
        }
    },
    "player_namespoof": {
        enabled: true,
        flag: {
            increment: 5,
            reason: "profile.player_namespoof.flagReason",
            type: "player_namespoof"
        },
        notifyAdmins: {
            message: "profile.player_namespoof.notifyMessage"
        },
        log: {
            actionType: "detected_player_namespoof",
            detailsPrefix: "NameSpoof Violation: "
        }
    },
    "player_antigmc": {
        enabled: true,
        flag: {
            increment: 10,
            reason: "profile.player_antigmc.flagReason",
            type: "player_antigmc"
        },
        notifyAdmins: {
            message: "profile.player_antigmc.notifyMessage"
        },
        log: {
            actionType: "detected_player_antigmc",
            detailsPrefix: "Anti-GMC Violation: "
        }
    },
    "player_inventory_mod": {
        enabled: true,
        flag: {
            increment: 3,
            reason: "profile.player_inventory_mod.flagReason",
            type: "player_inventory_mod"
        },
        notifyAdmins: {
            message: "profile.player_inventory_mod.notifyMessage"
        },
        log: {
            actionType: "detected_player_inventory_mod",
            detailsPrefix: "InventoryMod Violation: "
        }
    },
    "chat_spam_fast_message": {
        enabled: true,
        flag: {
            type: "chat_spam_fast",
            increment: 1,
            reason: "profile.chat_spam_fast_message.flagReason"
        },
        log: {
            actionType: "detected_fast_message_spam",
            detailsPrefix: "Msg: '{messageContent}'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "profile.chat_spam_fast_message.notifyMessage"
        },
        cancelMessage: true
    },
    "chat_spam_max_words": {
        enabled: true,
        flag: {
            type: "chat_spam_max_words",
            increment: 1,
            reason: "profile.chat_spam_max_words.flagReason"
        },
        log: {
            actionType: "detected_max_words_spam",
            detailsPrefix: "Words: {wordCount}, Max: {maxWords}. Msg (truncated): '{messageContent}'. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "profile.chat_spam_max_words.notifyMessage"
        },
        cancelMessage: true
    },
    "world_antigrief_tnt_place": {
        enabled: true, // This will be controlled by enableTntAntiGrief at a higher level
        flag: {
            increment: 1,
            reason: "profile.world_antigrief_tnt_place.flagReason",
            type: "antigrief_tnt"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_tnt_place.notifyMessage"
        },
        log: {
            actionType: "antigrief_tnt_placement",
            detailsPrefix: "AntiGrief TNT: "
        }
    },
    "world_antigrief_wither_spawn": {
        enabled: true, // This will be effectively controlled by enableWitherAntiGrief at a higher level
        flag: {
            increment: 5, // Wither griefing is severe
            reason: "profile.world_antigrief_wither_spawn.flagReason",
            type: "antigrief_wither"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_wither_spawn.notifyMessage"
        },
        log: {
            actionType: "antigrief_wither_spawn",
            detailsPrefix: "AntiGrief Wither: "
        }
    },
    "world_antigrief_fire": {
        enabled: true, // Effectively controlled by enableFireAntiGrief
        flag: {
            increment: 2,
            reason: "profile.world_antigrief_fire.flagReason",
            type: "antigrief_fire"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_fire.notifyMessage"
        },
        log: {
            actionType: "antigrief_fire_incident",
            detailsPrefix: "AntiGrief Fire: "
        }
    },
    "world_antigrief_lava": {
        enabled: true, // Effectively controlled by enableLavaAntiGrief
        flag: {
            increment: 2,
            reason: "profile.world_antigrief_lava.flagReason",
            type: "antigrief_lava"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_lava.notifyMessage"
        },
        log: {
            actionType: "antigrief_lava_placement",
            detailsPrefix: "AntiGrief Lava: "
        }
    },
    "world_antigrief_water": {
        enabled: true, // Effectively controlled by enableWaterAntiGrief
        flag: {
            increment: 1, // Water grief is often less permanent than lava/TNT
            reason: "profile.world_antigrief_water.flagReason",
            type: "antigrief_water"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_water.notifyMessage"
        },
        log: {
            actionType: "antigrief_water_placement",
            detailsPrefix: "AntiGrief Water: "
        }
    },
    "world_antigrief_blockspam": {
        enabled: true, // Effectively controlled by enableBlockSpamAntiGrief
        flag: {
            increment: 1,
            reason: "profile.world_antigrief_blockspam.flagReason",
            type: "antigrief_blockspam"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_blockspam.notifyMessage"
        },
        log: {
            actionType: "antigrief_blockspam_detected",
            detailsPrefix: "AntiGrief BlockSpam: "
        }
    },
    "world_antigrief_entityspam": {
        enabled: true, // Effectively controlled by enableEntitySpamAntiGrief
        flag: {
            increment: 1,
            reason: "profile.world_antigrief_entityspam.flagReason",
            type: "antigrief_entityspam"
        },
        notifyAdmins: {
            message: "profile.world_antigrief_entityspam.notifyMessage"
        },
        log: {
            actionType: "antigrief_entityspam_detected",
            detailsPrefix: "AntiGrief EntitySpam: "
        }
    },
    "world_antigrief_blockspam_density": {
        enabled: true, // Effectively controlled by enableBlockSpamDensityCheck
        flag: {
            increment: 2, // Potentially more severe than just rate
            reason: "profile.world_antigrief_blockspam_density.flagReason",
            type: "antigrief_blockspam_density" // Distinct flag type
        },
        notifyAdmins: {
            message: "profile.world_antigrief_blockspam_density.notifyMessage"
        },
        log: {
            actionType: "antigrief_blockspam_density_detected",
            detailsPrefix: "AntiGrief BlockSpam (Density): "
        }
    },
    "world_antigrief_piston_lag": {
        "enabled": true,
        "flag": null,
        "notifyAdmins": {
            "message": "profile.world_antigrief_piston_lag.notifyMessage"
        },
        "log": {
            "actionType": "antigrief_piston_lag_detected",
            "detailsPrefix": "AntiGrief Piston Lag: "
        }
    },
    "player_invalid_render_distance": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "profile.player_invalid_render_distance.flagReason",
            "type": "player_client_anomaly"
        },
        "notifyAdmins": {
            "message": "profile.player_invalid_render_distance.notifyMessage"
        },
        "log": {
            "actionType": "detected_invalid_render_distance",
            "detailsPrefix": "Invalid Render Distance: "
        }
    },
    "player_chat_during_combat": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "profile.player_chat_during_combat.flagReason",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "profile.player_chat_during_combat.notifyMessage"
        },
        "cancelMessage": true,
        "log": {
            "actionType": "detected_chat_during_combat",
            "detailsPrefix": "Chat During Combat: "
        }
    },
    "player_chat_during_item_use": {
        "enabled": true,
        "flag": {
            "increment": 1,
            "reason": "profile.player_chat_during_item_use.flagReason",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "profile.player_chat_during_item_use.notifyMessage"
        },
        "cancelMessage": true,
        "log": {
            "actionType": "detected_chat_during_item_use",
            "detailsPrefix": "Chat During Item Use: "
        }
    },
    "chat_swear_violation": {
        enabled: true, // The check itself is controlled by enableSwearCheck
        flag: {
            increment: 1,
            reason: "profile.chat_swear_violation.flagReason",
            type: "chat_language_violation" // A more general type for language issues
        },
        notifyAdmins: {
            message: "profile.chat_swear_violation.notifyMessage"
        },
        log: {
            actionType: "detected_swear_word",
            detailsPrefix: "Swear Word Violation: ",
            includeViolationDetails: true // To include detectedWord and messageContent
        },
        cancelMessage: true, // Cancel the message containing the swear word
        customAction: "MUTE" // Signal to handleBeforeChatSend to apply mute using swearCheckMuteDuration
    },
    chat_advertising_detected: {
        enabled: true,
        flag: {
            type: "chat_advertising",
            reason: "profile.chat_advertising_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detected_chat_advertising",
            detailsPrefix: "Matched patterns: ", // Matched pattern will be in violationDetails
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_advertising_detected.notifyMessage" // Localization key
        }
        // No cancelMessage or customAction by default
    },
    chat_caps_abuse_detected: {
        enabled: true,
        flag: {
            type: "chat_caps_abuse",
            reason: "profile.chat_caps_abuse_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detected_chat_caps_abuse",
            detailsPrefix: "CAPS Abuse: ", // ViolationDetails will include percentage, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_caps_abuse_detected.notifyMessage" // Localization key
        }
        // No cancelMessage by default
    },
    "player_self_hurt": {
        enabled: true,
        flag: {
            increment: 2, // Moderate flagging
            reason: "profile.player_self_hurt.flagReason",
            type: "player_self_damage" // Specific type for this flag
        },
        notifyAdmins: {
            message: "profile.player_self_hurt.notifyMessage"
        },
        log: {
            actionType: "detected_player_self_hurt",
            detailsPrefix: "Self-Hurt Violation: "
        }
    }
};
