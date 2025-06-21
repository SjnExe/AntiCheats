// AntiCheatsBP/scripts/core/action_profiles.js
/**
 * @file Defines action profiles for various cheat/behavior detections.
 * These profiles determine the consequences (flagging, notifications, logging, etc.)
 * when a specific check is triggered. Used by the ActionManager.
 * @version 1.0.0
 */

export const checkActionProfiles = {
    "movementFlyHover": {
        enabled: true,
        flag: {
            increment: 2,
            reason: "profile.movementFlyHover.flagReason", // Updated key
            type: "movementFlyHover"
        },
        notifyAdmins: {
            message: "profile.movementFlyHover.notifyMessage" // Updated key
        },
        log: {
            actionType: "detectedFlyHover",
            detailsPrefix: "Fly (Hover Violation): "
        }
    },
    "movementSpeedGround": {
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
            actionType: "detectedSpeedGround",
            detailsPrefix: "Speed (Ground Violation): "
        }
    },
    "combatReachAttack": {
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
            actionType: "detectedReachAttack",
            detailsPrefix: "Reach (Attack Violation): "
        }
    },
    "movementNofall": {
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
            actionType: "detectedMovementNofall",
            detailsPrefix: "NoFall Violation: "
        }
    },
    "worldNuker": {
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
            actionType: "detectedWorldNuker",
            detailsPrefix: "Nuker Violation: "
        }
    },
    "combatCpsHigh": {
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
            actionType: "detectedCombatCpsHigh",
            detailsPrefix: "High CPS Violation: "
        }
    },
    "combatViewsnapPitch": {
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
            actionType: "detectedViewsnapPitch",
            detailsPrefix: "Pitch Snap Violation: "
        }
    },
    "combatViewsnapYaw": {
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
            actionType: "detectedViewsnapYaw",
            detailsPrefix: "Yaw Snap Violation: "
        }
    },
    "combatInvalidPitch": {
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
            actionType: "detectedInvalidPitch",
            detailsPrefix: "Invalid Pitch Violation: "
        }
    },
    "combatMultitargetAura": {
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
            actionType: "detectedMultitargetAura",
            detailsPrefix: "Multi-Target Aura Violation: "
        }
    },
    "combatAttackWhileSleeping": {
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
            actionType: "detectedAttackWhileSleeping",
            detailsPrefix: "Attack While Sleeping Violation: "
        }
    },
    "combatAttackWhileConsuming": {
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
            actionType: "detectedAttackWhileConsuming",
            detailsPrefix: "Attack While Consuming Violation: "
        }
    },
    "combatAttackWhileBowCharging": {
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
            actionType: "detectedAttackWhileBowCharging",
            detailsPrefix: "Attack While Charging Bow Violation: "
        }
    },
    "combatAttackWhileShielding": {
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
            actionType: "detectedAttackWhileShielding",
            detailsPrefix: "Attack While Shielding Violation: "
        }
    },
    "worldIllegalItemUse": {
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
            actionType: "detectedIllegalItemUse",
            detailsPrefix: "Illegal Item Use Violation: "
        }
    },
    "worldIllegalItemPlace": {
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
            actionType: "detectedIllegalItemPlace",
            detailsPrefix: "Illegal Item Placement Violation: "
        }
    },
    "worldTowerBuild": {
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
            actionType: "detectedWorldTowerBuild",
            detailsPrefix: "Tower Building Violation: "
        }
    },
    "worldFlatRotationBuilding": {
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
            actionType: "detectedWorldFlatRotationBuilding",
            detailsPrefix: "Flat/Static Rotation Building Violation: "
        }
    },
    "worldDownwardScaffold": {
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
            actionType: "detectedWorldDownwardScaffold",
            detailsPrefix: "Downward Scaffold Violation: "
        }
    },
    "worldAirPlace": {
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
            actionType: "detectedWorldAirPlace",
            detailsPrefix: "Air Placement Violation: "
        }
    },
    "actionFastUse": {
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
            actionType: "detectedFastUse",
            detailsPrefix: "Fast Use Violation: "
        }
    },
    "worldFastPlace": {
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
            actionType: "detectedWorldFastPlace",
            detailsPrefix: "Fast Place Violation: "
        }
    },
    "movementNoslow": {
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
            actionType: "detectedMovementNoslow",
            detailsPrefix: "NoSlow Violation: "
        }
    },
    "movementInvalidSprint": {
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
            actionType: "detectedMovementInvalidSprint",
            detailsPrefix: "Invalid Sprint Violation: "
        }
    },
    "worldAutotool": {
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
            actionType: "detectedWorldAutotool",
            detailsPrefix: "AutoTool Violation: "
        }
    },
    "worldInstabreakUnbreakable": {
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
            actionType: "detectedInstabreakUnbreakable",
            detailsPrefix: "InstaBreak (Unbreakable) Violation: "
        }
    },
    "worldInstabreakSpeed": {
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
            actionType: "detectedInstabreakSpeed",
            detailsPrefix: "InstaBreak (Speed) Violation: "
        }
    },
    "playerNamespoof": {
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
            actionType: "detectedPlayerNamespoof",
            detailsPrefix: "NameSpoof Violation: "
        }
    },
    "playerAntiGMC": {
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
            actionType: "detectedPlayerAntiGMC", // Corrected case
            detailsPrefix: "Anti-GMC Violation: "
        }
    },
    "playerInventoryMod": {
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
            actionType: "detectedPlayerInventoryMod",
            detailsPrefix: "InventoryMod Violation: "
        }
    },
    "chatSpamFastMessage": {
        enabled: true,
        flag: {
            type: "chat_spam_fast",
            increment: 1,
            reason: "profile.chat_spam_fast_message.flagReason"
        },
        log: {
            actionType: "detectedFastMessageSpam",
            detailsPrefix: "Msg: '{messageContent}'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "profile.chat_spam_fast_message.notifyMessage"
        },
        cancelMessage: true
    },
    "chatSpamMaxWords": {
        enabled: true,
        flag: {
            type: "chat_spam_max_words",
            increment: 1,
            reason: "profile.chat_spam_max_words.flagReason"
        },
        log: {
            actionType: "detectedMaxWordsSpam",
            detailsPrefix: "Words: {wordCount}, Max: {maxWords}. Msg (truncated): '{messageContent}'. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "profile.chat_spam_max_words.notifyMessage"
        },
        cancelMessage: true
    },
    "worldAntigriefTntPlace": {
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
            actionType: "antigriefTntPlacement",
            detailsPrefix: "AntiGrief TNT: "
        }
    },
    "worldAntigriefWitherSpawn": {
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
            actionType: "antigriefWitherSpawn",
            detailsPrefix: "AntiGrief Wither: "
        }
    },
    "worldAntigriefFire": {
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
            actionType: "antigriefFireIncident",
            detailsPrefix: "AntiGrief Fire: "
        }
    },
    "worldAntigriefLava": {
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
            actionType: "antigriefLavaPlacement",
            detailsPrefix: "AntiGrief Lava: "
        }
    },
    "worldAntigriefWater": {
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
            actionType: "antigriefWaterPlacement",
            detailsPrefix: "AntiGrief Water: "
        }
    },
    "worldAntigriefBlockspam": {
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
            actionType: "antigriefBlockspamDetected",
            detailsPrefix: "AntiGrief BlockSpam: "
        }
    },
    "worldAntigriefEntityspam": {
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
            actionType: "antigriefEntityspamDetected",
            detailsPrefix: "AntiGrief EntitySpam: "
        }
    },
    "worldAntigriefBlockspamDensity": {
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
            actionType: "antigriefBlockspamDensityDetected",
            detailsPrefix: "AntiGrief BlockSpam (Density): "
        }
    },
    "worldAntigriefPistonLag": {
        "enabled": true,
        "flag": null,
        "notifyAdmins": {
            "message": "profile.world_antigrief_piston_lag.notifyMessage"
        },
        "log": {
            "actionType": "antigriefPistonLagDetected",
            "detailsPrefix": "AntiGrief Piston Lag: "
        }
    },
    "playerInvalidRenderDistance": {
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
            "actionType": "detectedInvalidRenderDistance",
            "detailsPrefix": "Invalid Render Distance: "
        }
    },
    "playerChatDuringCombat": {
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
            "actionType": "detectedChatDuringCombat",
            "detailsPrefix": "Chat During Combat: "
        }
    },
    "playerChatDuringItemUse": {
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
            "actionType": "detectedChatDuringItemUse",
            "detailsPrefix": "Chat During Item Use: "
        }
    },
    "chatSwearViolation": {
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
            actionType: "detectedSwearWord",
            detailsPrefix: "Swear Word Violation: ",
            includeViolationDetails: true // To include detectedWord and messageContent
        },
        cancelMessage: true, // Cancel the message containing the swear word
        customAction: "MUTE" // Signal to handleBeforeChatSend to apply mute using swearCheckMuteDuration
    },
    "chatAdvertisingDetected": {
        enabled: true,
        flag: {
            type: "chat_advertising",
            reason: "profile.chat_advertising_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detectedChatAdvertising",
            detailsPrefix: "Matched patterns: ", // Matched pattern will be in violationDetails
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_advertising_detected.notifyMessage" // Localization key
        }
        // No cancelMessage or customAction by default
    },
    "chatCapsAbuseDetected": {
        enabled: true,
        flag: {
            type: "chat_caps_abuse",
            reason: "profile.chat_caps_abuse_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detectedChatCapsAbuse",
            detailsPrefix: "CAPS Abuse: ", // ViolationDetails will include percentage, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_caps_abuse_detected.notifyMessage" // Localization key
        }
        // No cancelMessage by default
    },
    "chatCharRepeatDetected": {
        enabled: true,
        flag: {
            type: "chat_char_repeat",
            reason: "profile.chat_char_repeat_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detectedChatCharRepeat",
            detailsPrefix: "Char Repeat: ", // ViolationDetails will include char, count, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_char_repeat_detected.notifyMessage" // Localization key
        }
        // No cancelMessage by default
    },
    "chatSymbolSpamDetected": {
        enabled: true,
        flag: {
            type: "chat_symbol_spam",
            reason: "profile.chat_symbol_spam_detected.flagReason", // Localization key
            increment: 1
        },
        log: {
            actionType: "detectedChatSymbolSpam",
            detailsPrefix: "Symbol Spam: ", // ViolationDetails will include percentage, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "profile.chat_symbol_spam_detected.notifyMessage" // Localization key
        }
        // No cancelMessage by default
    },
    "chatContentRepeat": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.chatContentRepeat.flagReason",
            type: "chat_content_repeat"
        },
        notifyAdmins: {
            message: "profile.chatContentRepeat.notifyMessage"
        },
        log: {
            actionType: "detectedChatContentRepeat",
            detailsPrefix: "Chat Content Repeat: ",
            includeViolationDetails: true
        }
    },
    "chatUnicodeAbuse": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.chatUnicodeAbuse.flagReason",
            type: "chat_unicode_abuse"
        },
        notifyAdmins: {
            message: "profile.chatUnicodeAbuse.notifyMessage"
        },
        log: {
            actionType: "detectedChatUnicodeAbuse",
            detailsPrefix: "Unicode Abuse: ",
            includeViolationDetails: true
        }
    },
    "chatGibberish": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.chatGibberish.flagReason",
            type: "chat_gibberish"
        },
        notifyAdmins: {
            message: "profile.chatGibberish.notifyMessage"
        },
        log: {
            actionType: "detectedChatGibberish",
            detailsPrefix: "Gibberish Chat: ",
            includeViolationDetails: true
        }
    },
    "chatExcessiveMentions": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "profile.chatExcessiveMentions.flagReason",
            type: "chat_excessive_mentions"
        },
        notifyAdmins: {
            message: "profile.chatExcessiveMentions.notifyMessage"
        },
        log: {
            actionType: "detectedChatExcessiveMentions",
            detailsPrefix: "Excessive Mentions: ",
            includeViolationDetails: true
        }
    },
    "chatImpersonationAttempt": {
        enabled: true,
        flag: {
            increment: 2, // Slightly higher increment due to potential severity
            reason: "profile.chatImpersonationAttempt.flagReason",
            type: "chat_impersonation_attempt"
        },
        notifyAdmins: {
            message: "profile.chatImpersonationAttempt.notifyMessage"
        },
        log: {
            actionType: "detectedChatImpersonationAttempt",
            detailsPrefix: "Impersonation Attempt: ",
            includeViolationDetails: true
        }
    },
    "playerSelfHurt": {
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
            actionType: "detectedPlayerSelfHurt",
            detailsPrefix: "Self-Hurt Violation: "
        }
    }
};
