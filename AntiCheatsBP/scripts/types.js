/**
 * Defines common JSDoc typedefs used throughout the AntiCheat system.
 */

/**
 * @typedef {object} CommandDefinition
 * @property {string} name
 * @property {string} syntax
 * @property {string} description
 * @property {number} permissionLevel
 * @property {string[]} [aliases]
 */

/**
 * @typedef {object} CommandDependencies
 * @property {import('@minecraft/server')} mc
 * @property {import('./config.js').editableConfigValues} config
 * @property {import('./utils/playerUtils.js')} playerUtils
 * @property {import('./core/playerDataManager.js')} playerDataManager
 * @property {import('./core/logManager.js').addLog} addLog
 * @property {typeof import('./utils/playerUtils.js').findPlayer} findPlayer
 * @property {typeof import('./utils/playerUtils.js').parseDuration} parseDuration
 * @property {typeof import('./core/rankManager.js').getPlayerPermissionLevel} getPlayerPermissionLevel
 * @property {typeof import('./core/rankManager.js').permissionLevels} permissionLevels
 * @property {CommandDefinition[]} allCommands
 * @property {Map<string, CommandDefinition>} commandDefinitionMap
 * @property {Map<string, function(import('@minecraft/server').Player, string[], any): Promise<void>>} commandExecutionMap
 * @property {import('./core/uiManager.js')} uiManager
 * @property {import('./core/reportManager.js')} reportManager
 * @property {typeof import('@minecraft/server-ui')} ActionFormData
 * @property {typeof import('@minecraft/server-ui')} MessageFormData
 * @property {typeof import('@minecraft/server-ui')} ModalFormData
 * @property {typeof import('@minecraft/server').ItemComponentTypes} ItemComponentTypes
 */

/**
 * @typedef {object} CommandModule
 * @property {CommandDefinition} definition
 * @property {function(import('@minecraft/server').Player, string[], CommandDependencies): Promise<void>} execute
 */

/**
 * @typedef {object} Vector3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {object} PlayerFlagDetail
 * @property {number} count
 * @property {number} lastDetectionTime - Unix timestamp (ms).
 */

/**
 * @typedef {object} PlayerFlagData
 * @property {number} totalFlags
 * @property {PlayerFlagDetail} [fly]
 * @property {PlayerFlagDetail} [speed]
 * @property {PlayerFlagDetail} [nofall]
 * @property {PlayerFlagDetail} [reach]
 * @property {PlayerFlagDetail} [cps]
 * @property {PlayerFlagDetail} [nuker]
 * @property {PlayerFlagDetail} [illegalItem]
 * @property {PlayerFlagDetail} [illegalCharInChat]
 * @property {PlayerFlagDetail} [longMessage]
 * @property {PlayerFlagDetail} [spamRepeat]
 * @property {PlayerFlagDetail} [combat_log]
 * @property {PlayerFlagDetail} [movement_high_y_velocity]
 * @property {PlayerFlagDetail} [movement_fly_sustained]
 * @property {PlayerFlagDetail} [movement_fly_hover]
 * @property {PlayerFlagDetail} [combat_invalid_pitch]
 * @property {PlayerFlagDetail} [combat_viewsnap_pitch]
 * @property {PlayerFlagDetail} [combat_viewsnap_yaw]
 * @property {PlayerFlagDetail} [combat_multitarget_aura]
 * @property {PlayerFlagDetail} [combat_attack_while_sleeping]
 * @property {PlayerFlagDetail} [combat_attack_while_consuming]
 * @property {PlayerFlagDetail} [combat_attack_while_bow_charging]
 * @property {PlayerFlagDetail} [combat_attack_while_shielding]
 * @property {PlayerFlagDetail} [world_illegal_item_place]
 * @property {PlayerFlagDetail} [world_illegal_item_use]
 * @property {PlayerFlagDetail} [world_tower_build]
 * @property {PlayerFlagDetail} [world_flat_rotation_building]
 * @property {PlayerFlagDetail} [world_downward_scaffold]
 * @property {PlayerFlagDetail} [world_air_place]
 * @property {PlayerFlagDetail} [action_fast_use]
 * @property {PlayerFlagDetail} [world_fast_place]
 * @property {PlayerFlagDetail} [movement_noslow]
 * @property {PlayerFlagDetail} [movement_invalid_sprint]
 * @property {PlayerFlagDetail} [world_autotool]
 * @property {PlayerFlagDetail} [world_instabreak_unbreakable]
 * @property {PlayerFlagDetail} [world_instabreak_speed]
 * @property {PlayerFlagDetail} [player_namespoof]
 * @property {PlayerFlagDetail} [player_antigmc]
 * @property {PlayerFlagDetail} [player_inventory_mod]
 * @property {PlayerFlagDetail} [player_self_hurt]
 * @property {PlayerFlagDetail} [antigrief_tnt]
 * @property {PlayerFlagDetail} [antigrief_wither]
 * @property {PlayerFlagDetail} [antigrief_fire]
 * @property {PlayerFlagDetail} [antigrief_lava]
 * @property {PlayerFlagDetail} [antigrief_water]
 * @property {PlayerFlagDetail} [antigrief_blockspam]
 * @property {PlayerFlagDetail} [antigrief_entityspam]
 * @property {PlayerFlagDetail} [antigrief_blockspam_density]
 */

/**
 * Core data structure for tracking player state and violations.
 * @typedef {object} PlayerAntiCheatData
 * @property {string} playerNameTag
 * @property {Vector3} lastPosition
 * @property {Vector3} previousPosition
 * @property {Vector3} velocity
 * @property {Vector3} previousVelocity
 * @property {number} consecutiveOffGroundTicks
 * @property {number} fallDistance
 * @property {number} lastOnGroundTick
 * @property {Vector3} lastOnGroundPosition
 * @property {number} consecutiveOnGroundSpeedingTicks
 * @property {boolean} isTakingFallDamage
 * @property {number[]} attackEvents
 * @property {number} lastAttackTime
 * @property {number} lastCombatInteractionTime
 * @property {number[]} blockBreakEvents
 * @property {Array<{timestamp: number, content: string}>} recentMessages
 * @property {PlayerFlagData} flags
 * @property {string} lastFlagType
 * @property {boolean} isWatched
 * @property {number} lastPitch
 * @property {number} lastYaw
 * @property {number} lastAttackTick
 * @property {Array<{entityId: string, timestamp: number}>} recentHits
 * @property {boolean} isUsingConsumable
 * @property {boolean} isChargingBow
 * @property {boolean} isUsingShield
 * @property {number} lastItemUseTick
 * @property {Array<{x: number, y: number, z: number, pitch: number, yaw: number, tick: number}>} recentBlockPlacements
 * @property {number} lastPillarBaseY
 * @property {number} consecutivePillarBlocks
 * @property {number} lastPillarTick
 * @property {number | null} currentPillarX
 * @property {number | null} currentPillarZ
 * @property {number} consecutiveDownwardBlocks
 * @property {number} lastDownwardScaffoldTick
 * @property {{x: number, y: number, z: number} | null} lastDownwardScaffoldBlockLocation
 * @property {Record<string, number>} itemUseTimestamps
 * @property {number[]} recentPlaceTimestamps
 * @property {number} jumpBoostAmplifier
 * @property {boolean} hasSlowFalling
 * @property {boolean} hasLevitation
 * @property {number} speedAmplifier
 * @property {number} blindnessTicks
 * @property {number} lastTookDamageTick
 * @property {number} lastUsedElytraTick
 * @property {number} lastUsedRiptideTick
 * @property {number} lastOnSlimeBlockTick
 * @property {number} previousSelectedSlotIndex
 * @property {number} lastSelectedSlotChangeTick
 * @property {boolean} isAttemptingBlockBreak
 * @property {string | null} breakingBlockTypeId
 * @property {number} slotAtBreakAttemptStart
 * @property {number} breakAttemptTick
 * @property {boolean} switchedToOptimalToolForBreak
 * @property {number | null} optimalToolSlotForLastBreak
 * @property {number} lastBreakCompleteTick
 * @property {{x: number, y: number, z: number} | null} breakingBlockLocation
 * @property {string | null} blockBrokenWithOptimalTypeId
 * @property {string | null} optimalToolTypeIdForLastBreak
 * @property {number} breakStartTimeMs
 * @property {number} breakStartTickGameTime
 * @property {number} expectedBreakDurationTicks
 * @property {string | null} toolUsedForBreakAttempt
 * @property {string} lastKnownNameTag
 * @property {number} lastNameTagChangeTick
 * @property {PlayerMuteInfo | null} [muteInfo] - Persisted.
 * @property {PlayerBanInfo | null} [banInfo] - Persisted.
 * @property {boolean} isDirtyForSave - Not persisted itself.
 * @property {Object.<string, {itemTypeId: string, quantityFound?: number, timestamp: number}>} [lastViolationDetailsMap] - Persisted.
 * @property {Object.<string, {lastActionThreshold: number, lastActionTimestamp: number}>} [automodState] - Persisted.
 * @property {number} lastCheckNameSpoofTick
 * @property {number} lastCheckAntiGMCTick
 * @property {number} lastCheckNetherRoofTick
 * @property {number} lastCheckAutoToolTick
 * @property {number} lastCheckFlatRotationBuildingTick
 */

/**
 * @typedef {object} PlayerMuteInfo
 * @property {number | Infinity} unmuteTime
 * @property {string} reason
 * @property {string} mutedBy
 * @property {boolean} isAutoMod
 * @property {string|null} triggeringCheckType
 */

/**
 * @typedef {object} PlayerBanInfo
 * @property {string} [xuid]
 * @property {string} [playerName]
 * @property {number} banTime
 * @property {number | Infinity} unmuteTime
 * @property {string} reason
 * @property {string} bannedBy
 * @property {boolean} isAutoMod
 * @property {string|null} triggeringCheckType
 */

/** @typedef {import('./config.js').editableConfigValues} Config */
/** @typedef {import('./utils/playerUtils.js')} PlayerUtils */
/** @typedef {import('./core/playerDataManager.js')} PlayerDataManager */
/** @typedef {import('./core/logManager.js')} LogManager */
/** @typedef {import('./core/actionManager.js').executeCheckAction} ExecuteCheckAction */
/** @typedef {import('./core/uiManager.js')} UIManager */
/** @typedef {import('./core/reportManager.js')} ReportManager */

/**
 * @typedef {object} ActionManagerDependencies
 * @property {Config} config
 * @property {PlayerDataManager} playerDataManager
 * @property {PlayerUtils} playerUtils
 * @property {LogManager} logManager
 */

/**
 * @typedef {object} TpaRequest
 * @property {string} requestId
 * @property {string} requesterName
 * @property {import('@minecraft/server').Vector3} requesterLocation
 * @property {string} requesterDimensionId
 * @property {string} targetName
 * @property {import('@minecraft/server').Vector3} targetLocation
 * @property {string} targetDimensionId
 * @property {'tpa' | 'tpahere'} requestType
 * @property {number} creationTimestamp
 * @property {number} expiryTimestamp
 * @property {('pending_acceptance'|'pending_teleport_warmup'|'teleporting'|'cancelled'|'completed')} [status='pending_acceptance']
 * @property {number} [warmupExpiryTimestamp]
 */

/**
 * @typedef {object} PlayerTpaStatus
 * @property {string} playerName
 * @property {boolean} acceptsTpaRequests
 * @property {number} lastTpaToggleTimestamp
 */

// This line is important to make this file a module and allow JSDoc types to be imported.
export {};
