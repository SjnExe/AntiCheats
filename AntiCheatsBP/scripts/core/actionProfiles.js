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
            reason: "System detected Fly (Hover).",
            type: "movementFlyHover"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}"
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
            reason: "System detected excessive ground speed.",
            type: "speed"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})"
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
            reason: "System detected excessive reach during combat.",
            type: "reach"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Reach. Distance: {actualDistance} (Max: {allowedDistance})"
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
            reason: "System detected suspicious fall damage negation (NoFall).",
            type: "movement_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}"
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
            reason: "System detected Nuker activity (rapid/wide-area block breaking).",
            type: "world_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}"
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
            reason: "System detected abnormally high CPS (Clicks Per Second).",
            type: "combat_cps"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}"
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
            reason: "System detected suspicious pitch snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
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
            reason: "System detected suspicious yaw snap after attack.",
            type: "combat_viewsnap"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)"
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
            reason: "System detected invalid view pitch (e.g., looking straight up/down).",
            type: "combat_view_violation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)"
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
            reason: "System detected Multi-Target Aura (hitting multiple entities rapidly).",
            type: "combat_aura"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})"
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
            reason: "System detected player attacking while sleeping.",
            type: "combat_state_conflict"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntity}"
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
            reason: "System detected player attacking while consuming an item.",
            type: "combat_state_conflict_consuming"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemUsed}"
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
            reason: "System detected player attacking while charging a bow.",
            type: "combat_state_conflict_bow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemUsed}"
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
            reason: "System detected player attacking while actively using a shield.",
            type: "combat_state_conflict_shield"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemUsed}"
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
            reason: "System detected use of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}"
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
            reason: "System detected placement of a banned item: {itemTypeId}.",
            type: "world_illegal_item"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}"
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
            reason: "System detected suspicious tower-like building.",
            type: "world_scaffold_tower"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)"
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
            reason: "System detected unnatural (flat or static) head rotation while building.",
            type: "world_scaffold_rotation"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Variance: {pitchVariance}, Yaw Variance: {yawVariance}, Details: {details}"
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
            reason: "System detected suspicious downward scaffolding while airborne.",
            type: "world_scaffold_downward"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {hSpeed}bps (MinSpeed: {minHSpeed}bps)"
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
            reason: "System detected block placed against air/liquid without solid support.",
            type: "world_scaffold_airplace"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting air/liquid."
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
            reason: "System detected item being used too quickly: {itemType}.",
            type: "action_fast_use"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldown}ms, Actual: {actualTime}ms"
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
            reason: "System detected blocks being placed too quickly.",
            type: "world_fast_place"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {window}ms (Max: {maxBlocks})"
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
            reason: "System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).",
            type: "movement_noslow"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxSpeed}bps)"
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
            reason: "System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).",
            type: "movement_invalid_sprint"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}"
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
            reason: "System detected suspicious tool switching before/after breaking a block (AutoTool).",
            type: "world_autotool"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolType}, Switched: {switchPattern}"
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
            reason: "Attempted to break an unbreakable block: {blockType}.",
            type: "world_instabreak_unbreakable"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled."
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
            reason: "System detected block broken significantly faster than possible: {blockType}.",
            type: "world_instabreak_speed"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t"
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
            reason: "System detected an invalid or suspicious player nameTag ({reasonDetail}).",
            type: "player_namespoof"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: '{nameTag}'"
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
            reason: "System detected unauthorized Creative Mode.",
            type: "player_antigmc"
        },
        notifyAdmins: {
            message: "§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}"
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
            reason: "System detected suspicious inventory/hotbar manipulation ({reasonDetail}).",
            type: "player_inventory_mod"
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for InventoryMod. Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}"
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
            reason: "Sent messages too quickly ({timeSinceLastMsgMs}ms apart)"
        },
        log: {
            actionType: "detectedFastMessageSpam",
            detailsPrefix: "Msg: '{messageContent}'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)"
        },
        cancelMessage: true
    },
    "chatSpamMaxWords": {
        enabled: true,
        flag: {
            type: "chat_spam_max_words",
            increment: 1,
            reason: "Message too long ({wordCount} words, max: {maxWords})"
        },
        log: {
            actionType: "detectedMaxWordsSpam",
            detailsPrefix: "Words: {wordCount}, Max: {maxWords}. Msg (truncated): '{messageContent}'. ",
            includeViolationDetails: false
        },
        notifyAdmins: {
            message: "§c[AC] §e{playerName} §7sent message with too many words ({wordCount}/{maxWords}). Flagged. (Msg: §f{messageContent}§7)"
        },
        cancelMessage: true
    },
    "worldAntigriefTntPlace": {
        enabled: true, // This will be controlled by enableTntAntiGrief at a higher level
        flag: {
            increment: 1,
            reason: "Player attempted to place TNT without authorization.",
            type: "antigrief_tnt"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} attempted to place TNT at {x},{y},{z}. Action: {actionTaken}."
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
            reason: "Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.",
            type: "antigrief_wither"
        },
        notifyAdmins: {
            message: "§cAC [AntiGrief]: A Wither spawn event occurred. Context: {playerNameOrContext}. Action: {actionTaken}."
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
            reason: "Player involved in unauthorized or excessive fire incident.",
            type: "antigrief_fire"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Fire event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
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
            reason: "Player involved in unauthorized lava placement.",
            type: "antigrief_lava"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Lava placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
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
            reason: "Player involved in unauthorized water placement.",
            type: "antigrief_water"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: Water placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}"
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
            reason: "Player suspected of block spamming.",
            type: "antigrief_blockspam"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Block Spam. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}."
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
            reason: "Player suspected of entity spamming.",
            type: "antigrief_entityspam"
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Entity Spam. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}."
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
            reason: "Player suspected of block spamming (high density).",
            type: "antigrief_blockspam_density" // Distinct flag type
        },
        notifyAdmins: {
            message: "§eAC [AntiGrief]: {playerName} suspected of Block Spam (Density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}."
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
            "message": "§eAC [AntiGrief]: Rapid piston activity detected at {x},{y},{z} in {dimensionId}. Rate: {rate}/sec over {duration}s. (Potential Lag)"
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
            "reason": "Client reported an excessive render distance: {reportedDistance} chunks (Max: {maxAllowed} chunks).",
            "type": "player_client_anomaly"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} reported render distance of {reportedDistance} chunks (Max: {maxAllowed}). Potential client modification."
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
            "reason": "Attempted to chat too soon after combat ({timeSinceCombat}s ago).",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} attempted to chat during combat cooldown ({timeSinceCombat}s ago). Message cancelled."
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
            "reason": "Attempted to chat while actively using an item ({itemUseState}).",
            "type": "player_chat_state_violation"
        },
        "notifyAdmins": {
            "message": "§eAC: {playerName} attempted to chat while {itemUseState}. Message cancelled."
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
            reason: "Swear word detected in message: {detectedWord}",
            type: "chat_language_violation" // A more general type for language issues
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Swear Word. Word: '{detectedWord}'. Message: §f{messageContent}"
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
            reason: "Potential advertisement detected in chat: {matchedPattern}",
            increment: 1
        },
        log: {
            actionType: "detectedChatAdvertising",
            detailsPrefix: "Matched patterns: ", // Matched pattern will be in violationDetails
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "§eAC: {playerName} may have advertised. Matched: '{matchedPattern}'. Message: §f{originalMessage}"
        }
        // No cancelMessage or customAction by default
    },
    "chatCapsAbuseDetected": {
        enabled: true,
        flag: {
            type: "chat_caps_abuse",
            reason: "Message contained excessive capitalization ({percentage}% CAPS).",
            increment: 1
        },
        log: {
            actionType: "detectedChatCapsAbuse",
            detailsPrefix: "CAPS Abuse: ", // ViolationDetails will include percentage, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for CAPS abuse ({percentage}% CAPS). Message: §f{originalMessage}"
        }
        // No cancelMessage by default
    },
    "chatCharRepeatDetected": {
        enabled: true,
        flag: {
            type: "chat_char_repeat",
            reason: "Message contained repeated characters: '{char}' x{count}.",
            increment: 1
        },
        log: {
            actionType: "detectedChatCharRepeat",
            detailsPrefix: "Char Repeat: ", // ViolationDetails will include char, count, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Char Repeat: '{char}' x{count}. Message: §f{originalMessage}"
        }
        // No cancelMessage by default
    },
    "chatSymbolSpamDetected": {
        enabled: true,
        flag: {
            type: "chat_symbol_spam",
            reason: "Sent a message with a high percentage of symbols.",
            increment: 1
        },
        log: {
            actionType: "detectedChatSymbolSpam",
            detailsPrefix: "Symbol Spam: ", // ViolationDetails will include percentage, message
            includeViolationDetails: true
        },
        notifyAdmins: {
            message: "Player {playerName} triggered symbol spam check. Message: {originalMessage}"
        }
        // No cancelMessage by default
    },
    "chatContentRepeat": {
        enabled: true,
        flag: {
            increment: 1,
            reason: "Repeated message content detected.",
            type: "chat_content_repeat"
        },
        notifyAdmins: {
            message: "{playerName} flagged for Chat Content Repeat. Details: {detailsString}"
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
            reason: "Unicode (e.g., Zalgo) abuse detected.",
            type: "chat_unicode_abuse"
        },
        notifyAdmins: {
            message: "{playerName} flagged for Unicode Abuse. Details: {detailsString}"
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
            reason: "Gibberish or unreadable message detected.",
            type: "chat_gibberish"
        },
        notifyAdmins: {
            message: "{playerName} flagged for Gibberish. Details: {detailsString}"
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
            reason: "Excessive user mentions in message.",
            type: "chat_excessive_mentions"
        },
        notifyAdmins: {
            message: "{playerName} flagged for Excessive Mentions. Details: {detailsString}"
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
            reason: "Attempt to impersonate server/staff message.",
            type: "chat_impersonation_attempt"
        },
        notifyAdmins: {
            message: "{playerName} flagged for Impersonation Attempt. Details: {detailsString}"
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
            reason: "System detected suspicious self-inflicted damage.",
            type: "player_self_damage" // Specific type for this flag
        },
        notifyAdmins: {
            message: "§eAC: {playerName} flagged for Self-Hurt. Cause: {damageCause}, Attacker: {damagingEntityType}, Health: {playerHealth}"
        },
        log: {
            actionType: "detectedPlayerSelfHurt",
            detailsPrefix: "Self-Hurt Violation: "
        }
    }
};
