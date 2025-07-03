/**
 * @file Defines action profiles for various cheat/behavior detections.
 * These profiles determine the consequences (flagging, notifications, logging, etc.)
 * when a specific check is triggered. Used by the ActionManager.
 * All `checkType` keys and `actionType` string literals must be in `camelCase`.
 *
 * @typedef {object} ActionProfileFlag
 * @property {number} [increment=1] - How much to increment the flag count by.
 * @property {string} reason - Template for the flag reason. Placeholders: {playerName}, {checkType}, {detailsString}, and any keys from violationDetails.
 * @property {string} [type] - Specific flag type key (camelCase) for storage; defaults to the main checkType if not provided.
 *
 * @typedef {object} ActionProfileNotify
 * @property {string} message - Template for the admin notification message. Placeholders same as ActionProfileFlag.reason.
 *
 * @typedef {object} ActionProfileLog
 * @property {string} [actionType] - Specific actionType for logging (camelCase); defaults to `detected<CheckType>` (e.g., `detectedMovementFlyHover`).
 * @property {string} [detailsPrefix=''] - Prefix for the log details string.
 * @property {boolean} [includeViolationDetails=true] - Whether to include formatted violation details in the log.
 *
 * @typedef {object} ActionProfileEntry
 * @property {boolean} enabled - Whether this action profile is active.
 * @property {ActionProfileFlag} [flag] - Configuration for flagging the player.
 * @property {ActionProfileNotify} [notifyAdmins] - Configuration for notifying admins.
 * @property {ActionProfileLog} [log] - Configuration for logging the event.
 * @property {boolean} [cancelMessage] - If true, cancels the chat message (for chat-related checks).
 * @property {string} [customAction] - A custom action string (e.g., 'mutePlayer') for special handling by other modules.
 * @property {boolean} [cancelEvent] - If true, cancels the underlying game event (e.g., block placement).
 *
 * @type {Object.<string, ActionProfileEntry>}
 */
export const checkActionProfiles = {
    // Movement Checks
    movementFlyHover: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected Fly (Hover).',
            type: 'movementFlyHover', // camelCase
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Fly (Hover). Details: {detailsString}',
        },
        log: {
            actionType: 'detectedFlyHover', // camelCase
            detailsPrefix: 'Fly (Hover Violation): ',
        },
    },
    movementSpeedGround: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected excessive ground speed.',
            type: 'movementSpeed', // General type, specific check is 'movementSpeedGround'
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Speed (Ground). Speed: {speedBps} BPS (Max: {maxAllowedBps})',
        },
        log: {
            actionType: 'detectedSpeedGround',
            detailsPrefix: 'Speed (Ground Violation): ',
        },
    },
    movementNoFall: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious fall damage negation (NoFall).',
            type: 'movementNoFall',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for NoFall. Fall Distance: {fallDistance}m. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedMovementNoFall',
            detailsPrefix: 'NoFall Violation: ',
        },
    },
    movementNoSlow: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected movement faster than allowed for current action (e.g., eating, sneaking, using bow).',
            type: 'movementNoSlow',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for NoSlow. Action: {action}, Speed: {speed}bps (Max: {maxAllowedSpeed}bps)',
        },
        log: {
            actionType: 'detectedMovementNoSlow',
            detailsPrefix: 'NoSlow Violation: ',
        },
    },
    movementInvalidSprint: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected sprinting under invalid conditions (e.g., blind, sneaking, riding).',
            type: 'movementInvalidSprint',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Invalid Sprint. Condition: {condition}',
        },
        log: {
            actionType: 'detectedMovementInvalidSprint',
            detailsPrefix: 'Invalid Sprint Violation: ',
        },
    },
    movementNetherRoof: { // Added from automodConfig for consistency
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Detected on Nether Roof at {x},{y},{z}.',
            type: 'movementNetherRoof',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} detected on Nether Roof at {x},{y},{z}.',
        },
        log: {
            actionType: 'detectedNetherRoof',
            detailsPrefix: 'Nether Roof Violation: ',
        },
    },
    movementHighYVelocity: { // Added from automodConfig
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Excessive vertical velocity detected: {yVelocity} m/s.',
            type: 'movementHighYVelocity',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for High Y-Velocity: {yVelocity} m/s.',
        },
        log: {
            actionType: 'detectedHighYVelocity',
            detailsPrefix: 'High Y-Velocity: ',
        },
    },
    movementSustainedFly: { // Added from automodConfig
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Sustained flight detected for {duration} ticks.',
            type: 'movementSustainedFly',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Sustained Flight ({duration} ticks).',
        },
        log: {
            actionType: 'detectedSustainedFly',
            detailsPrefix: 'Sustained Flight: ',
        },
    },

    // Combat Checks
    combatReachAttack: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected excessive reach during combat.',
            type: 'combatReach', // General type
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Reach. Distance: {distance} (Max: {maxAllowed})',
        },
        log: {
            actionType: 'detectedReachAttack',
            detailsPrefix: 'Reach (Attack Violation): ',
        },
    },
    combatCpsHigh: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected abnormally high CPS (Clicks Per Second).',
            type: 'combatCpsHigh',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for High CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}',
        },
        log: {
            actionType: 'detectedCombatCpsHigh',
            detailsPrefix: 'High CPS Violation: ',
        },
    },
    combatViewSnapPitch: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected suspicious pitch snap after attack.',
            type: 'combatViewSnap',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Pitch Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)',
        },
        log: {
            actionType: 'detectedViewSnapPitch',
            detailsPrefix: 'Pitch Snap Violation: ',
        },
    },
    combatViewSnapYaw: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected suspicious yaw snap after attack.',
            type: 'combatViewSnap',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Yaw Snap. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)',
        },
        log: {
            actionType: 'detectedViewSnapYaw',
            detailsPrefix: 'Yaw Snap Violation: ',
        },
    },
    combatInvalidPitch: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected invalid view pitch (e.g., looking straight up/down).',
            type: 'combatInvalidPitch',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Invalid Pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)',
        },
        log: {
            actionType: 'detectedInvalidPitch',
            detailsPrefix: 'Invalid Pitch Violation: ',
        },
    },
    combatMultiTargetAura: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected Multi-Target Aura (hitting multiple entities rapidly).',
            type: 'combatAura',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})',
        },
        log: {
            actionType: 'detectedMultiTargetAura',
            detailsPrefix: 'Multi-Target Aura Violation: ',
        },
    },
    combatAttackWhileSleeping: {
        enabled: true,
        flag: {
            increment: 5,
            reason: 'System detected player attacking while sleeping.',
            type: 'combatAttackWhileSleeping',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Attacking While Sleeping. Target: {targetEntityType}',
        },
        log: {
            actionType: 'detectedAttackWhileSleeping',
            detailsPrefix: 'Attack While Sleeping Violation: ',
        },
    },
    combatAttackWhileConsuming: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected player attacking while consuming an item.',
            type: 'combatStateConflictConsuming',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Attacking While Consuming. State: {state}, Item Category: {itemCategory}',
        },
        log: {
            actionType: 'detectedAttackWhileConsuming',
            detailsPrefix: 'Attack While Consuming Violation: ',
        },
    },
    combatAttackWhileBowCharging: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected player attacking while charging a bow.',
            type: 'combatStateConflictBow',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Attacking While Charging Bow. State: {state}, Item Category: {itemCategory}',
        },
        log: {
            actionType: 'detectedAttackWhileBowCharging',
            detailsPrefix: 'Attack While Charging Bow Violation: ',
        },
    },
    combatAttackWhileShielding: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected player attacking while actively using a shield.',
            type: 'combatStateConflictShield',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Attacking While Shielding. State: {state}, Item Category: {itemCategory}',
        },
        log: {
            actionType: 'detectedAttackWhileShielding',
            detailsPrefix: 'Attack While Shielding Violation: ',
        },
    },
    combatLog: {
        enabled: true,
        flag: {
            increment: 0, // Actual increment handled by playerLeave event based on config
            reason: 'Player disconnected shortly after combat.',
            type: 'combatLog',
        },
        notifyAdmins: {
            message: '§c[AC-CombatLog] §e{playerName}§c disconnected {timeSinceLastCombat}s after combat. Flags: +{incrementAmount}. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedCombatLog',
            detailsPrefix: 'Combat Log Violation: ',
        },
    },

    // World Interaction Checks
    worldNuker: {
        enabled: true,
        flag: {
            increment: 5,
            reason: 'System detected Nuker activity (rapid/wide-area block breaking).',
            type: 'worldNuker',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Nuker. Blocks: {blocksBroken} in window. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedWorldNuker',
            detailsPrefix: 'Nuker Violation: ',
        },
    },
    worldIllegalItemUse: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected use of a banned item: {itemTypeId}.',
            type: 'worldIllegalItemUse',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Illegal Item Use. Item: {itemTypeId}. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedIllegalItemUse',
            detailsPrefix: 'Illegal Item Use Violation: ',
        },
    },
    worldIllegalItemPlace: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected placement of a banned item: {itemTypeId}.',
            type: 'worldIllegalItemPlace',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Illegal Item Placement. Item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedIllegalItemPlace',
            detailsPrefix: 'Illegal Item Placement Violation: ',
        },
    },
    worldTowerBuild: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected suspicious tower-like building.',
            type: 'worldTowerBuild',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Tower Building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)',
        },
        log: {
            actionType: 'detectedWorldTowerBuild',
            detailsPrefix: 'Tower Building Violation: ',
        },
    },
    worldFlatRotationBuilding: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected unnatural (flat or static) head rotation while building.',
            type: 'worldFlatRotationBuilding',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Flat/Static Rotation Building. Pitch Var: {pitchVariance}, Yaw Var: {yawMaxDifferenceFromFirst}, Reason: {detectionReason}',
        },
        log: {
            actionType: 'detectedWorldFlatRotationBuilding',
            detailsPrefix: 'Flat/Static Rotation Building Violation: ',
        },
    },
    worldDownwardScaffold: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious downward scaffolding while airborne.',
            type: 'worldDownwardScaffold',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Downward Scaffold. Blocks: {count}, Speed: {horizontalSpeedBPS}bps (MinSpeed: {minHorizontalSpeedBPS}bps)',
        },
        log: {
            actionType: 'detectedWorldDownwardScaffold',
            detailsPrefix: 'Downward Scaffold Violation: ',
        },
    },
    worldAirPlace: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected block placed against air/liquid without solid support.',
            type: 'worldAirPlace',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Air Placement. Block: {blockType} at {x},{y},{z} targeting {targetFaceType}.',
        },
        log: {
            actionType: 'detectedWorldAirPlace',
            detailsPrefix: 'Air Placement Violation: ',
        },
    },
    worldFastPlace: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected blocks being placed too quickly.',
            type: 'worldFastPlace',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Fast Place. Blocks: {count} in {windowMs}ms (Max: {maxBlocks})',
        },
        log: {
            actionType: 'detectedWorldFastPlace',
            detailsPrefix: 'Fast Place Violation: ',
        },
    },
    worldAutoTool: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected suspicious tool switching before/after breaking a block (AutoTool).',
            type: 'worldAutoTool',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for AutoTool. Block: {blockType}, ToolUsed: {toolUsed}, Pattern: {switchPattern}',
        },
        log: {
            actionType: 'detectedWorldAutoTool',
            detailsPrefix: 'AutoTool Violation: ',
        },
    },
    worldInstaBreakUnbreakable: {
        enabled: true,
        flag: {
            increment: 10,
            reason: 'Attempted to break an unbreakable block: {blockType}.',
            type: 'worldInstaBreakUnbreakable',
        },
        notifyAdmins: {
            message: '§cAC: {playerName} flagged for InstaBreak (Unbreakable). Block: {blockType} at {x},{y},{z}. Event cancelled.',
        },
        log: {
            actionType: 'detectedInstaBreakUnbreakable',
            detailsPrefix: 'InstaBreak (Unbreakable) Violation: ',
        },
    },
    worldInstaBreakSpeed: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected block broken significantly faster than possible: {blockType}.',
            type: 'worldInstaBreakSpeed',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for InstaBreak (Speed). Block: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t',
        },
        log: {
            actionType: 'detectedInstaBreakSpeed',
            detailsPrefix: 'InstaBreak (Speed) Violation: ',
        },
    },

    // Player State/Data Checks
    playerNameSpoof: {
        enabled: true,
        flag: {
            increment: 5,
            reason: 'System detected an invalid or suspicious player nameTag ({reasonDetail}).',
            type: 'playerNameSpoof',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for NameSpoofing. Reason: {reasonDetail}. NameTag: \'{currentNameTagDisplay}\'',
        },
        log: {
            actionType: 'detectedPlayerNameSpoof',
            detailsPrefix: 'NameSpoof Violation: ',
        },
    },
    playerAntiGmc: {
        enabled: true,
        flag: {
            increment: 10,
            reason: 'System detected unauthorized Creative Mode.',
            type: 'playerAntiGmc',
        },
        notifyAdmins: {
            message: '§cAC: {playerName} detected in unauthorized Creative Mode! Switched to {switchToMode}: {autoSwitched}',
        },
        log: {
            actionType: 'detectedPlayerAntiGmc',
            detailsPrefix: 'Anti-GMC Violation: ',
        },
    },
    playerInventoryModSwitchUse: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious inventory/hotbar manipulation ({reasonDetail}).',
            type: 'playerInventoryMod',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for InventoryMod (Switch-Use). Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}',
        },
        log: {
            actionType: 'detectedPlayerInventoryModSwitchUse',
            detailsPrefix: 'InventoryMod (Switch-Use) Violation: ',
        },
    },
    playerInventoryModMoveLocked: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious inventory/hotbar manipulation ({reasonDetail}).',
            type: 'playerInventoryMod',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for InventoryMod (Move-Locked). Detail: {reasonDetail}. Item: {itemTypeInvolved}, Slot: {slotChanged}, Action: {actionInProgress}',
        },
        log: {
            actionType: 'detectedPlayerInventoryModMoveLocked',
            detailsPrefix: 'InventoryMod (Move-Locked) Violation: ',
        },
    },
    playerInvalidRenderDistance: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Client reported an excessive render distance: {reportedDistance} chunks (Max: {maxAllowed} chunks).',
            type: 'playerClientAnomaly',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} reported render distance of {reportedDistance} chunks (Max: {maxAllowed}). Potential client modification.',
        },
        log: {
            actionType: 'detectedInvalidRenderDistance',
            detailsPrefix: 'Invalid Render Distance: ',
        },
    },
    playerSelfHurt: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected suspicious self-inflicted damage.',
            type: 'playerSelfHurt',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Self-Hurt. Cause: {damageCause}, Attacker: {damagingEntityType}, Health: {playerHealth}',
        },
        log: {
            actionType: 'detectedPlayerSelfHurt',
            detailsPrefix: 'Self-Hurt Violation: ',
        },
    },

    // Action Checks
    actionFastUse: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected item being used too quickly: {itemType}.',
            type: 'actionFastUse',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Fast Use. Item: {itemType}, Cooldown: {cooldownMs}ms, Actual: {actualTimeMs}ms',
        },
        log: {
            actionType: 'detectedFastUse',
            detailsPrefix: 'Fast Use Violation: ',
        },
    },

    // Chat Checks
    chatSpamFastMessage: {
        enabled: true,
        flag: {
            type: 'chatSpamFast',
            increment: 1,
            reason: 'Sent messages too quickly ({timeSinceLastMsgMs}ms apart)',
        },
        log: {
            actionType: 'detectedFastMessageSpam',
            detailsPrefix: 'Msg: \'{messageContent}\'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ',
            includeViolationDetails: false,
        },
        notifyAdmins: {
            message: '§c[AC] §e{playerName} §7is sending messages too quickly ({timeSinceLastMsgMs}ms). Flagged. (Msg: §f{messageContent}§7)',
        },
        cancelMessage: true,
    },
    chatSpamMaxWords: {
        enabled: true,
        flag: {
            type: 'chatSpamMaxWords',
            increment: 1,
            reason: 'Message too long ({wordCount} words, max: {maxWords})',
        },
        log: {
            actionType: 'detectedMaxWordsSpam',
            detailsPrefix: 'Words: {wordCount}, Max: {maxWords}. Msg (truncated): \'{messageContent}\'. ',
            includeViolationDetails: false,
        },
        notifyAdmins: {
            message: '§c[AC] §e{playerName} §7sent message with too many words ({wordCount}/{maxWords}). Flagged. (Msg: §f{messageContent}§7)',
        },
        cancelMessage: true,
    },
    playerChatDuringCombat: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Attempted to chat too soon after combat ({timeSinceCombat}s ago).',
            type: 'playerChatStateViolation',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} attempted to chat during combat cooldown ({timeSinceCombat}s ago). Message cancelled.',
        },
        cancelMessage: true,
        log: {
            actionType: 'detectedChatDuringCombat',
            detailsPrefix: 'Chat During Combat: ',
        },
    },
    playerChatDuringItemUse: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Attempted to chat while actively using an item ({itemUseState}).',
            type: 'playerChatStateViolation',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} attempted to chat while {itemUseState}. Message cancelled.',
        },
        cancelMessage: true,
        log: {
            actionType: 'detectedChatDuringItemUse',
            detailsPrefix: 'Chat During Item Use: ',
        },
    },
    chatSwearViolation: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Swear word detected in message: {detectedSwear}',
            type: 'chatLanguageViolation',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Swear Word. Word: \'{detectedSwear}\'. Message: §f{originalMessage}',
        },
        log: {
            actionType: 'detectedSwearWord',
            detailsPrefix: 'Swear Word Violation: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
        customAction: 'mutePlayer', // Example of a custom action string
    },
    chatAdvertisingDetected: {
        enabled: true,
        flag: {
            type: 'chatAdvertising',
            reason: 'Potential advertisement detected in chat: {detectedLink}',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatAdvertising',
            detailsPrefix: 'Matched: ',
            includeViolationDetails: true,
        },
        notifyAdmins: {
            message: '§eAC: {playerName} may have advertised. Matched: \'{detectedLink}\'. Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatCapsAbuseDetected: {
        enabled: true,
        flag: {
            type: 'chatCapsAbuse',
            reason: 'Message contained excessive capitalization ({percentage}% CAPS).',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatCapsAbuse',
            detailsPrefix: 'CAPS Abuse: ',
            includeViolationDetails: true,
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for CAPS abuse ({percentage}% CAPS). Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatCharRepeatDetected: {
        enabled: true,
        flag: {
            type: 'chatCharRepeat',
            reason: 'Message contained repeated characters: \'{char}\' x{count}.',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatCharRepeat',
            detailsPrefix: 'Char Repeat: ',
            includeViolationDetails: true,
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for Char Repeat: \'{char}\' x{count}. Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatSymbolSpamDetected: {
        enabled: true,
        flag: {
            type: 'chatSymbolSpam',
            reason: 'Sent a message with a high percentage of symbols ({percentage}%).',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatSymbolSpam',
            detailsPrefix: 'Symbol Spam: ',
            includeViolationDetails: true,
        },
        notifyAdmins: {
            message: 'Player {playerName} triggered symbol spam check ({percentage}%). Message: {originalMessage}',
        },
        cancelMessage: true,
    },
    chatContentRepeat: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Repeated message content detected: {repeatedMessageSnippet}',
            type: 'chatContentRepeat',
        },
        notifyAdmins: {
            message: '{playerName} flagged for Chat Content Repeat. Snippet: {repeatedMessageSnippet}',
        },
        log: {
            actionType: 'detectedChatContentRepeat',
            detailsPrefix: 'Chat Content Repeat: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
    },
    chatUnicodeAbuse: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Unicode (e.g., Zalgo) abuse detected. Reason: {flagReason}',
            type: 'chatUnicodeAbuse',
        },
        notifyAdmins: {
            message: '{playerName} flagged for Unicode Abuse. Reason: {flagReason}. Message: {messageSnippet}',
        },
        log: {
            actionType: 'detectedChatUnicodeAbuse',
            detailsPrefix: 'Unicode Abuse: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
    },
    chatGibberish: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Gibberish or unreadable message detected. Reasons: {triggerReasons}',
            type: 'chatGibberish',
        },
        notifyAdmins: {
            message: '{playerName} flagged for Gibberish. Reasons: {triggerReasons}. Message: {messageSnippet}',
        },
        log: {
            actionType: 'detectedChatGibberish',
            detailsPrefix: 'Gibberish Chat: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
    },
    chatExcessiveMentions: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Excessive user mentions in message. Reasons: {triggerReasons}',
            type: 'chatExcessiveMentions',
        },
        notifyAdmins: {
            message: '{playerName} flagged for Excessive Mentions. Reasons: {triggerReasons}. Message: {messageSnippet}',
        },
        log: {
            actionType: 'detectedChatExcessiveMentions',
            detailsPrefix: 'Excessive Mentions: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
    },
    chatImpersonationAttempt: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Attempt to impersonate server/staff message. Matched: {matchedPattern}',
            type: 'chatImpersonationAttempt',
        },
        notifyAdmins: {
            message: '{playerName} flagged for Impersonation Attempt. Matched: {matchedPattern}. Message: {messageSnippet}',
        },
        log: {
            actionType: 'detectedChatImpersonationAttempt',
            detailsPrefix: 'Impersonation Attempt: ',
            includeViolationDetails: true,
        },
        cancelMessage: true,
    },
    chatNewline: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Message contained newline characters.',
            type: 'chatFormatting',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for using newlines in chat. Message: §f{message}',
        },
        log: {
            actionType: 'detectedChatNewline',
            detailsPrefix: 'Newline in chat: ',
        },
        cancelMessage: true,
    },
    chatMaxLength: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Message exceeded maximum length ({messageLength}/{maxLength}).',
            type: 'chatFormatting',
        },
        notifyAdmins: {
            message: '§eAC: {playerName} flagged for overly long message ({messageLength}/{maxLength}). Snippet: §f{messageSnippet}',
        },
        log: {
            actionType: 'detectedChatMaxLength',
            detailsPrefix: 'Message too long: ',
        },
        cancelMessage: true,
    },

    // AntiGrief Checks
    worldAntiGriefTntPlace: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Player attempted to place TNT without authorization.',
            type: 'antiGriefTnt',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: {playerName} attempted to place TNT at {x},{y},{z}. Action: {actionTaken}.',
        },
        log: {
            actionType: 'antiGriefTntPlacement',
            detailsPrefix: 'AntiGrief TNT: ',
        },
        cancelEvent: true,
    },
    worldAntiGriefWitherSpawn: {
        enabled: true,
        flag: {
            increment: 5,
            reason: 'Player involved in unauthorized Wither spawn or Wither killed by AntiGrief.',
            type: 'antiGriefWither',
        },
        notifyAdmins: {
            message: '§cAC [AntiGrief]: A Wither spawn event occurred. Context: {playerNameOrContext}. Action: {actionTaken}.',
        },
        log: {
            actionType: 'antiGriefWitherSpawn',
            detailsPrefix: 'AntiGrief Wither: ',
        },
    },
    worldAntiGriefFire: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Player involved in unauthorized or excessive fire incident.',
            type: 'antiGriefFire',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: Fire event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
        },
        log: {
            actionType: 'antiGriefFireIncident',
            detailsPrefix: 'AntiGrief Fire: ',
        },
        cancelEvent: true,
    },
    worldAntiGriefLava: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Player involved in unauthorized lava placement.',
            type: 'antiGriefLava',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: Lava placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
        },
        log: {
            actionType: 'antiGriefLavaPlacement',
            detailsPrefix: 'AntiGrief Lava: ',
        },
        cancelEvent: true,
    },
    worldAntiGriefWater: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Player involved in unauthorized water placement.',
            type: 'antiGriefWater',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: Water placement event involving {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
        },
        log: {
            actionType: 'antiGriefWaterPlacement',
            detailsPrefix: 'AntiGrief Water: ',
        },
        cancelEvent: true,
    },
    worldAntiGriefBlockspam: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Player suspected of block spamming.',
            type: 'antiGriefBlockspam',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: {playerName} suspected of Block Spam. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}.',
        },
        log: {
            actionType: 'antiGriefBlockspamDetected',
            detailsPrefix: 'AntiGrief BlockSpam: ',
        },
    },
    worldAntiGriefEntityspam: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Player suspected of entity spamming.',
            type: 'antiGriefEntityspam',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: {playerName} suspected of Entity Spam. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}.',
        },
        log: {
            actionType: 'antiGriefEntityspamDetected',
            detailsPrefix: 'AntiGrief EntitySpam: ',
        },
    },
    worldAntiGriefBlockspamDensity: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Player suspected of block spamming (high density).',
            type: 'antiGriefBlockspamDensity',
        },
        notifyAdmins: {
            message: '§eAC [AntiGrief]: {playerName} suspected of Block Spam (Density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}.',
        },
        log: {
            actionType: 'antiGriefBlockspamDensityDetected',
            detailsPrefix: 'AntiGrief BlockSpam (Density): ',
        },
    },
    worldAntiGriefPistonLag: {
        enabled: true,
        flag: null,
        notifyAdmins: {
            message: '§eAC [AntiGrief]: Rapid piston activity detected at {x},{y},{z} in {dimensionId}. Rate: {rate}/sec over {duration}s. (Potential Lag)',
        },
        log: {
            actionType: 'antiGriefPistonLagDetected',
            detailsPrefix: 'AntiGrief Piston Lag: ',
        },
    },
};
