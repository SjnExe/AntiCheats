/**
 * @file Defines action profiles for various cheat/behavior detections.
 * @module AntiCheatsBP/scripts/core/actionProfiles
 * These profiles determine the consequences (flagging, notifications, logging, etc.)
 * when a specific check is triggered. Used by the ActionManager.
 * All `checkType` keys and `actionType` string literals must be in `camelCase`.
 * @typedef {import('../types.js').ActionProfileFlag} ActionProfileFlag
 * @typedef {import('../types.js').ActionProfileNotify} ActionProfileNotify
 * @typedef {import('../types.js').ActionProfileLog} ActionProfileLog
 * @typedef {import('../types.js').ActionProfileEntry} ActionProfileEntry
 */
/** @type {{[key: string]: import('../types.js').ActionProfileEntry}} */
export const checkActionProfiles = {
    // Movement Checks
    movementFlyHover: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'System detected Fly (Hover). Details: {detailsString}',
            type: 'movementFlyHover',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bFly (Hover)§r. Details: {detailsString}',
        },
        log: {
            actionType: 'detectedFlyHover',
            detailsPrefix: 'Fly (Hover Violation): ',
        },
    },
    movementSpeedGround: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'System detected excessive ground speed. Speed: {speedBps} BPS (Max: {maxAllowedBps})',
            type: 'movementSpeed', // General type, specific check is 'movementSpeedGround'
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bSpeed (Ground)§r. Speed: §a{speedBps}§r BPS (Max: §a{maxAllowedBps}§r)',
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
            reason: 'System detected suspicious fall damage negation (NoFall). Fall Distance: {fallDistance}m. Details: {detailsString}',
            type: 'movementNoFall',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bNoFall§r. Fall Distance: §a{fallDistance}m§r. Details: {detailsString}',
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
            reason: 'System detected movement faster than allowed for current action ({action}). Speed: {speed}bps (Max: {maxAllowedSpeed}bps)',
            type: 'movementNoSlow',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bNoSlow§r. Action: §a{action}§r, Speed: §a{speed}bps§r (Max: §a{maxAllowedSpeed}bps§r)',
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
            reason: 'System detected sprinting under invalid conditions ({condition}).',
            type: 'movementInvalidSprint',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bInvalid Sprint§r. Condition: §a{condition}§r',
        },
        log: {
            actionType: 'detectedMovementInvalidSprint',
            detailsPrefix: 'Invalid Sprint Violation: ',
        },
    },
    movementNetherRoof: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Detected on Nether Roof at {x},{y},{z}.',
            type: 'movementNetherRoof',
        },
        notifyAdmins: {
            message: '§e{playerName}§r detected on §bNether Roof§r at §a{x},{y},{z}§r.',
        },
        log: {
            actionType: 'detectedNetherRoof',
            detailsPrefix: 'Nether Roof Violation: ',
        },
    },
    movementHighYVelocity: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Excessive vertical velocity detected: {yVelocity} m/s.',
            type: 'movementHighYVelocity',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bHigh Y-Velocity§r: §a{yVelocity} m/s§r.',
        },
        log: {
            actionType: 'detectedHighYVelocity',
            detailsPrefix: 'High Y-Velocity: ',
        },
    },
    movementSustainedFly: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Sustained flight detected for {duration} ticks.',
            type: 'movementSustainedFly',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bSustained Flight§r (§a{duration}§r ticks).',
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
            reason: 'System detected excessive reach during combat. Distance: {distance} (Max: {maxAllowed})',
            type: 'combatReach',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bReach§r. Distance: §a{distance}§r (Max: §a{maxAllowed}§r)',
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
            reason: 'System detected abnormally high CPS. Count: {cpsCount} in {windowSeconds}s. Max: {threshold}',
            type: 'combatCpsHigh',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bHigh CPS§r. Count: §a{cpsCount}§r in §a{windowSeconds}s§r. Max: §a{threshold}§r',
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
            reason: 'System detected suspicious pitch snap after attack. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)',
            type: 'combatViewSnap', // General type for view anomalies
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bPitch Snap§r. Change: §a{change}°§r, Limit: §a{limit}°§r (§a{postAttackTimeMs}ms§r after attack)',
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
            reason: 'System detected suspicious yaw snap after attack. Change: {change}°, Limit: {limit}° ({postAttackTimeMs}ms after attack)',
            type: 'combatViewSnap', // General type
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bYaw Snap§r. Change: §a{change}°§r, Limit: §a{limit}°§r (§a{postAttackTimeMs}ms§r after attack)',
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
            reason: 'System detected invalid view pitch. Pitch: {pitch}° (Limits: {minLimit}° to {maxLimit}°)',
            type: 'combatInvalidPitch',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bInvalid Pitch§r. Pitch: §a{pitch}°§r (Limits: §a{minLimit}°§r to §a{maxLimit}°§r)',
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
            reason: 'System detected Multi-Target Aura. Targets: {targetsHit} in {windowSeconds}s (Threshold: {threshold})',
            type: 'combatAura', // General aura type
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bMulti-Target Aura§r. Targets: §a{targetsHit}§r in §a{windowSeconds}s§r (Threshold: §a{threshold}§r)',
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
            reason: 'System detected player attacking while sleeping. Target: {targetEntityType}',
            type: 'combatStateConflict', // General state conflict type
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAttacking While Sleeping§r. Target: §a{targetEntityType}§r',
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
            reason: 'System detected player attacking while consuming an item ({itemCategory}). State: {state}',
            type: 'combatStateConflict',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAttacking While Consuming§r. State: §a{state}§r, Item Category: §a{itemCategory}§r',
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
            reason: 'System detected player attacking while charging a bow ({itemCategory}). State: {state}',
            type: 'combatStateConflict',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAttacking While Charging Bow§r. State: §a{state}§r, Item Category: §a{itemCategory}§r',
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
            reason: 'System detected player attacking while actively using a shield ({itemCategory}). State: {state}',
            type: 'combatStateConflict',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAttacking While Shielding§r. State: §a{state}§r, Item Category: §a{itemCategory}§r',
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
            reason: 'Player disconnected {timeSinceLastCombat}s after combat. Flags: +{incrementAmount}',
            type: 'combatLog',
        },
        notifyAdmins: {
            message: '§e{playerName}§c disconnected §a{timeSinceLastCombat}s§c after combat. Flags: §a+{incrementAmount}§c. Details: {detailsString}',
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
            reason: 'System detected Nuker activity. Blocks: {blocksBroken} in window. Details: {detailsString}',
            type: 'worldNuker',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bNuker§r. Blocks: §a{blocksBroken}§r in window. Details: {detailsString}',
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
            reason: 'System detected use of a banned item: {itemTypeId}. Details: {detailsString}',
            type: 'worldIllegalItemUse',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bIllegal Item Use§r. Item: §a{itemTypeId}§r. Details: {detailsString}',
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
            reason: 'System detected placement of a banned item: {itemTypeId} at {blockLocationX},{blockLocationY},{blockLocationZ}. Details: {detailsString}',
            type: 'worldIllegalItemPlace',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bIllegal Item Placement§r. Item: §a{itemTypeId}§r at §a{blockLocationX},{blockLocationY},{blockLocationZ}§r. Details: {detailsString}',
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
            reason: 'System detected suspicious tower-like building. Height: {height}, Look Pitch: {pitch}° (Threshold: {pitchThreshold}°)',
            type: 'worldTowerBuild',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bTower Building§r. Height: §a{height}§r, Look Pitch: §a{pitch}°§r (Threshold: §a{pitchThreshold}°§r)',
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
            reason: 'System detected unnatural head rotation while building. Pitch Var: {pitchVariance}, Yaw Var: {yawMaxDifferenceFromFirst}, Reason: {detectionReason}',
            type: 'worldFlatRotationBuilding',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bFlat/Static Rotation Building§r. Pitch Var: §a{pitchVariance}§r, Yaw Var: §a{yawMaxDifferenceFromFirst}§r, Reason: §a{detectionReason}§r',
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
            reason: 'System detected suspicious downward scaffolding. Blocks: {count}, Speed: {horizontalSpeedBPS}bps (MinSpeed: {minHorizontalSpeedBPS}bps)',
            type: 'worldDownwardScaffold',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bDownward Scaffold§r. Blocks: §a{count}§r, Speed: §a{horizontalSpeedBPS}bps§r (MinSpeed: §a{minHorizontalSpeedBPS}bps§r)',
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
            reason: 'System detected block placed against air/liquid. Block: {blockType} at {x},{y},{z} targeting {targetFaceType}.',
            type: 'worldAirPlace',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAir Placement§r. Block: §a{blockType}§r at §a{x},{y},{z}§r targeting §a{targetFaceType}§r.',
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
            reason: 'System detected blocks being placed too quickly. Blocks: {count} in {windowMs}ms (Max: {maxBlocks})',
            type: 'worldFastPlace',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bFast Place§r. Blocks: §a{count}§r in §a{windowMs}ms§r (Max: §a{maxBlocks}§r)',
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
            reason: 'System detected suspicious tool switching (AutoTool). Block: {blockType}, ToolUsed: {toolUsed}, Pattern: {switchPattern}',
            type: 'worldAutoTool',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bAutoTool§r. Block: §a{blockType}§r, ToolUsed: §a{toolUsed}§r, Pattern: §a{switchPattern}§r',
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
            reason: 'Attempted to break an unbreakable block: {blockType} at {x},{y},{z}.',
            type: 'worldInstaBreakUnbreakable',
        },
        notifyAdmins: {
            message: '§e{playerName}§c flagged for §bInstaBreak (Unbreakable)§c. Block: §a{blockType}§c at §a{x},{y},{z}§c. Event cancelled.',
        },
        log: {
            actionType: 'detectedInstaBreakUnbreakable',
            detailsPrefix: 'InstaBreak (Unbreakable) Violation: ',
        },
        cancelEvent: true, // Typically, this check would cancel the break event
    },
    worldInstaBreakSpeed: {
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected block broken too fast: {blockType}. Expected: {expectedTicks}t, Actual: {actualTicks}t',
            type: 'worldInstaBreakSpeed',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bInstaBreak (Speed)§r. Block: §a{blockType}§r. Expected: §a{expectedTicks}t§r, Actual: §a{actualTicks}t§r',
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
            reason: 'System detected an invalid player nameTag ({reasonDetail}). NameTag: \'{currentNameTagDisplay}\'',
            type: 'playerNameSpoof',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bNameSpoofing§r. Reason: §a{reasonDetail}§r. NameTag: \'§f{currentNameTagDisplay}§r\'',
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
            reason: 'System detected unauthorized Creative Mode. Switched to {switchToMode}: {autoSwitched}',
            type: 'playerAntiGmc',
        },
        notifyAdmins: {
            message: '§e{playerName}§c detected in unauthorized §bCreative Mode§c! Switched to §a{switchToMode}§c: §a{autoSwitched}§c',
        },
        log: {
            actionType: 'detectedPlayerAntiGmc',
            detailsPrefix: 'Anti-GMC Violation: ',
        },
    },
    playerInventoryModSwitchUse: { // Specific profile for switch-use pattern
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious inventory manipulation (Switch-Use). Detail: {reasonDetail}. Item: {itemType}, Slot: {slot}',
            type: 'playerInventoryMod', // General type
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bInventoryMod (Switch-Use)§r. Detail: §a{reasonDetail}§r. Item: §a{itemType}§r, Slot: §a{slot}§r',
        },
        log: {
            actionType: 'detectedPlayerInventoryModSwitchUse',
            detailsPrefix: 'InventoryMod (Switch-Use) Violation: ',
        },
    },
    playerInventoryModMoveLocked: { // Specific profile for moving items while UI should be locked
        enabled: true,
        flag: {
            increment: 3,
            reason: 'System detected suspicious inventory manipulation (Move-Locked). Detail: {reasonDetail}. Item: {itemTypeInvolved}, Slot: {slotChanged}, Action: {actionInProgress}',
            type: 'playerInventoryMod', // General type
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bInventoryMod (Move-Locked)§r. Detail: §a{reasonDetail}§r. Item: §a{itemTypeInvolved}§r, Slot: §a{slotChanged}§r, Action: §a{actionInProgress}§r',
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
            type: 'playerClientAnomaly', // General type for client-side anomalies
        },
        notifyAdmins: {
            message: '§e{playerName}§r reported render distance of §a{reportedDistance}§r chunks (Max: §a{maxAllowed}§r). Potential client modification.',
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
            reason: 'System detected suspicious self-inflicted damage. Cause: {damageCause}, Attacker: {damagingEntityType}, Health: {playerHealth}',
            type: 'playerSelfHurt',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bSelf-Hurt§r. Cause: §a{damageCause}§r, Attacker: §a{damagingEntityType}§r, Health: §a{playerHealth}§r',
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
            reason: 'System detected item being used too quickly: {itemType}. Cooldown: {cooldownMs}ms, Actual: {actualTimeMs}ms',
            type: 'actionFastUse',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bFast Use§r. Item: §a{itemType}§r, Cooldown: §a{cooldownMs}ms§r, Actual: §a{actualTimeMs}ms§r',
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
            reason: 'Sent messages too quickly ({timeSinceLastMsgMs}ms apart). Message: {messageContent}',
        },
        log: {
            actionType: 'detectedFastMessageSpam',
            detailsPrefix: 'Msg: \'{messageContent}\'. Interval: {timeSinceLastMsgMs}ms. Threshold: {thresholdMs}ms. ',
            includeViolationDetails: false, // Details are in reason/prefix
        },
        notifyAdmins: {
            message: '§e{playerName}§7 is sending messages too quickly (§a{timeSinceLastMsgMs}ms§7). Flagged. (Msg: §f{messageContent}§7)',
        },
        cancelMessage: true,
    },
    chatSpamMaxWords: {
        enabled: true,
        flag: {
            type: 'chatSpamMaxWords',
            increment: 1,
            reason: 'Message too long ({wordCount} words, max: {maxWords}). Message (truncated): {messageContent}',
        },
        log: {
            actionType: 'detectedMaxWordsSpam',
            detailsPrefix: 'Words: {wordCount}, Max: {maxWords}. Msg (truncated): \'{messageContent}\'. ',
            includeViolationDetails: false,
        },
        notifyAdmins: {
            message: '§e{playerName}§7 sent message with too many words (§a{wordCount}/{maxWords}§7). Flagged. (Msg: §f{messageContent}§7)',
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
            message: '§e{playerName}§r attempted to chat during combat cooldown (§a{timeSinceCombat}s§r ago). Message cancelled.',
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
            message: '§e{playerName}§r attempted to chat while §a{itemUseState}§r. Message cancelled.',
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
            reason: 'Swear word detected in message: {detectedSwear}. Message: {originalMessage}',
            type: 'chatLanguageViolation',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bSwear Word§r. Word: \'§f{detectedSwear}§r\'. Message: §f{originalMessage}',
        },
        log: {
            actionType: 'detectedSwearWord',
            detailsPrefix: 'Swear Word Violation: ',
        },
        cancelMessage: true,
        customAction: 'mutePlayer',
    },
    chatAdvertisingDetected: {
        enabled: true,
        flag: {
            type: 'chatAdvertising',
            reason: 'Potential advertisement detected: {detectedLink}. Message: {originalMessage}',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatAdvertising',
            detailsPrefix: 'Matched: ',
        },
        notifyAdmins: {
            message: '§e{playerName}§r may have advertised. Matched: \'§f{detectedLink}§r\'. Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatCapsAbuseDetected: {
        enabled: true,
        flag: {
            type: 'chatCapsAbuse',
            reason: 'Message contained excessive capitalization ({percentage}% CAPS). Message: {originalMessage}',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatCapsAbuse',
            detailsPrefix: 'CAPS Abuse: ',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bCAPS abuse§r (§a{percentage}%§r CAPS). Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatCharRepeatDetected: {
        enabled: true,
        flag: {
            type: 'chatCharRepeat',
            reason: 'Message contained repeated characters: \'{char}\' x{count}. Message: {originalMessage}',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatCharRepeat',
            detailsPrefix: 'Char Repeat: ',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bChar Repeat§r: \'§f{char}§r\' x§a{count}§r. Message: §f{originalMessage}',
        },
        cancelMessage: true,
    },
    chatSymbolSpamDetected: {
        enabled: true,
        flag: {
            type: 'chatSymbolSpam',
            reason: 'Sent a message with a high percentage of symbols ({percentage}%). Message: {originalMessage}',
            increment: 1,
        },
        log: {
            actionType: 'detectedChatSymbolSpam',
            detailsPrefix: 'Symbol Spam: ',
        },
        notifyAdmins: {
            message: '§e{playerName}§r triggered §bsymbol spam§r check (§a{percentage}%§r). Message: §f{originalMessage}§r',
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
            message: '§e{playerName}§r flagged for §bChat Content Repeat§r. Snippet: §f{repeatedMessageSnippet}§r',
        },
        log: {
            actionType: 'detectedChatContentRepeat',
            detailsPrefix: 'Chat Content Repeat: ',
        },
        cancelMessage: true,
    },
    chatUnicodeAbuse: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Unicode (e.g., Zalgo) abuse detected. Reason: {flagReason}. Message: {messageSnippet}',
            type: 'chatUnicodeAbuse',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bUnicode Abuse§r. Reason: §a{flagReason}§r. Message: §f{messageSnippet}§r',
        },
        log: {
            actionType: 'detectedChatUnicodeAbuse',
            detailsPrefix: 'Unicode Abuse: ',
        },
        cancelMessage: true,
    },
    chatGibberish: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Gibberish or unreadable message detected. Reasons: {triggerReasons}. Message: {messageSnippet}',
            type: 'chatGibberish',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bGibberish§r. Reasons: §a{triggerReasons}§r. Message: §f{messageSnippet}§r',
        },
        log: {
            actionType: 'detectedChatGibberish',
            detailsPrefix: 'Gibberish Chat: ',
        },
        cancelMessage: true,
    },
    chatExcessiveMentions: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Excessive user mentions in message. Reasons: {triggerReasons}. Message: {messageSnippet}',
            type: 'chatExcessiveMentions',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bExcessive Mentions§r. Reasons: §a{triggerReasons}§r. Message: §f{messageSnippet}§r',
        },
        log: {
            actionType: 'detectedChatExcessiveMentions',
            detailsPrefix: 'Excessive Mentions: ',
        },
        cancelMessage: true,
    },
    chatImpersonationAttempt: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Attempt to impersonate server/staff message. Matched: {matchedPattern}. Message: {messageSnippet}',
            type: 'chatImpersonationAttempt',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §bImpersonation Attempt§r. Matched: §f{matchedPattern}§r. Message: §f{messageSnippet}§r',
        },
        log: {
            actionType: 'detectedChatImpersonationAttempt',
            detailsPrefix: 'Impersonation Attempt: ',
        },
        cancelMessage: true,
    },
    chatNewline: {
        enabled: true,
        flag: {
            increment: 1,
            reason: 'Message contained newline characters. Message: {message}',
            type: 'chatFormattingViolation', // General type for formatting issues
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for using §bnewlines§r in chat. Message: §f{message}§r',
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
            reason: 'Message exceeded maximum length ({messageLength}/{maxLength}). Snippet: {messageSnippet}',
            type: 'chatFormattingViolation',
        },
        notifyAdmins: {
            message: '§e{playerName}§r flagged for §boverly long message§r (§a{messageLength}/{maxLength}§r). Snippet: §f{messageSnippet}§r',
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
            reason: 'Player attempted to place TNT without authorization at {x},{y},{z}. Action: {actionTaken}.',
            type: 'antiGriefTnt',
        },
        notifyAdmins: {
            message: '[AntiGrief] §e{playerName}§r attempted to place §bTNT§r at §a{x},{y},{z}§r. Action: §a{actionTaken}§r.',
        },
        log: {
            actionType: 'antiGriefTntPlacement',
            detailsPrefix: 'AntiGrief TNT: ',
        },
        cancelEvent: true, // Assuming default action from config is to cancel
    },
    worldAntiGriefWitherSpawn: {
        enabled: true,
        flag: {
            increment: 5,
            reason: 'Player involved in unauthorized Wither spawn or Wither killed by AntiGrief. Context: {playerNameOrContext}. Action: {actionTaken}.',
            type: 'antiGriefWither',
        },
        notifyAdmins: {
            message: '[AntiGrief] §cWither spawn event occurred§r. Context: §e{playerNameOrContext}§r. Action: §a{actionTaken}§r.',
        },
        log: {
            actionType: 'antiGriefWitherSpawn',
            detailsPrefix: 'AntiGrief Wither: ',
        },
        cancelEvent: true, // If action is 'prevent'
    },
    worldAntiGriefFire: {
        enabled: true,
        flag: {
            increment: 2,
            reason: 'Player involved in unauthorized fire incident. Context: {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
            type: 'antiGriefFire',
        },
        notifyAdmins: {
            message: '[AntiGrief] Fire event involving §e{playerNameOrContext}§r. Action: §a{actionTaken}§r. Details: {detailsString}',
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
            reason: 'Player involved in unauthorized lava placement. Context: {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
            type: 'antiGriefLava',
        },
        notifyAdmins: {
            message: '[AntiGrief] Lava placement involving §e{playerNameOrContext}§r. Action: §a{actionTaken}§r. Details: {detailsString}',
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
            reason: 'Player involved in unauthorized water placement. Context: {playerNameOrContext}. Action: {actionTaken}. Details: {detailsString}',
            type: 'antiGriefWater',
        },
        notifyAdmins: {
            message: '[AntiGrief] Water placement involving §e{playerNameOrContext}§r. Action: §a{actionTaken}§r. Details: {detailsString}',
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
            reason: 'Player suspected of block spamming. Blocks: {count}/{maxBlocks} in {windowMs}ms. Type: {blockType}. Action: {actionTaken}.',
            type: 'antiGriefBlockspam',
        },
        notifyAdmins: {
            message: '[AntiGrief] §e{playerName}§r suspected of §bBlock Spam§r. Blocks: §a{count}/{maxBlocks}§r in §a{windowMs}ms§r. Type: §a{blockType}§r. Action: §a{actionTaken}§r.',
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
            reason: 'Player suspected of entity spamming. Entity: {entityType}. Count: {count}/{maxSpawns} in {windowMs}ms. Action: {actionTaken}.',
            type: 'antiGriefEntityspam',
        },
        notifyAdmins: {
            message: '[AntiGrief] §e{playerName}§r suspected of §bEntity Spam§r. Entity: §a{entityType}§r. Count: §a{count}/{maxSpawns}§r in §a{windowMs}ms§r. Action: §a{actionTaken}§r.',
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
            reason: 'Player suspected of block spamming (high density). Density: {densityPercentage}% in {radius} radius. Block: {blockType}. Action: {actionTaken}.',
            type: 'antiGriefBlockspamDensity',
        },
        notifyAdmins: {
            message: '[AntiGrief] §e{playerName}§r suspected of §bBlock Spam (Density)§r. Density: §a{densityPercentage}%§r in §a{radius}§r radius. Block: §a{blockType}§r. Action: §a{actionTaken}§r.',
        },
        log: {
            actionType: 'antiGriefBlockspamDensityDetected',
            detailsPrefix: 'AntiGrief BlockSpam (Density): ',
        },
    },
    worldAntiGriefPistonLag: { // This is primarily a notification/log, not usually a player flag
        enabled: true,
        flag: null, // No direct player flag, it's a world event log
        notifyAdmins: {
            message: '[AntiGrief] Rapid §bpiston activity§r detected at §a{x},{y},{z}§r in §a{dimensionId}§r. Rate: §a{rate}/sec§r over §a{duration}s§r. (Potential Lag)',
        },
        log: {
            actionType: 'antiGriefPistonLagDetected',
            detailsPrefix: 'AntiGrief Piston Lag: ',
        },
    },
};
