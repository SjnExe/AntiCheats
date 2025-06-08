/**
 * @file Defines common JSDoc typedefs used throughout the AntiCheat system.
 * This helps in providing better type hinting and code clarity.
 * @version 1.0.1
 */

/**
 * @typedef {object} CommandDefinition
 * @property {string} name - The name of the command (used for execution and help).
 * @property {string} syntax - How to use the command, e.g., "!command <required> [optional]".
 * @property {string} description - A short description of what the command does.
 * @property {number} permissionLevel - The permission level required to use this command (from rankManager.permissionLevels).
 * @property {string[]} [aliases] - Optional array of alternative names for the command.
 */

/**
 * @typedef {object} CommandDependencies
 * @property {import('@minecraft/server')} mc - The Minecraft server module.
 * @property {import('./config.js').editableConfigValues} config - The system configuration object.
 * @property {import('./utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @property {import('./core/playerDataManager.js')} playerDataManager - Manages player-specific anti-cheat data.
 * @property {import('./core/logManager.js').addLog} addLog - Function to add an entry to the admin action log.
 * @property {typeof import('./utils/playerUtils.js').findPlayer} findPlayer - Utility function to find a player.
 * @property {typeof import('./utils/playerUtils.js').parseDuration} parseDuration - Utility function to parse duration strings.
 * @property {typeof import('./core/rankManager.js').getPlayerPermissionLevel} getPlayerPermissionLevel - Function to get a player's permission level.
 * @property {typeof import('./core/rankManager.js').permissionLevels} permissionLevels - Enum-like object for permission levels.
 * @property {CommandDefinition[]} allCommands - Array of all command definitions, used by help command.
 * @property {Map<string, CommandDefinition>} commandDefinitionMap - Map of command names to definitions.
 * @property {Map<string, function(import('@minecraft/server').Player, string[], any): Promise<void>>} commandExecutionMap - Map of command names to execute functions.
 * @property {import('./core/uiManager.js')} uiManager - Manages UI forms.
 * @property {import('./core/reportManager.js')} reportManager - Manages player reports.
 * @property {typeof import('@minecraft/server-ui')} ActionFormData - UI Class.
 * @property {typeof import('@minecraft/server-ui')} MessageFormData - UI Class.
 * @property {typeof import('@minecraft/server-ui')} ModalFormData - UI Class.
 * @property {typeof import('@minecraft/server').ItemComponentTypes} ItemComponentTypes - Enum for item component types.
 */

/**
 * Represents a command module.
 * @typedef {object} CommandModule
 * @property {CommandDefinition} definition - The command's definition.
 * @property {function(import('@minecraft/server').Player, string[], CommandDependencies): Promise<void>} execute - The function to run when the command is called.
 */

/**
 * @typedef {object} Vector3
 * @property {number} x - X-coordinate.
 * @property {number} y - Y-coordinate.
 * @property {number} z - Z-coordinate.
 */

/**
 * @typedef {object} PlayerFlagDetail
 * @property {number} count - The number of times this specific flag has been triggered.
 * @property {number} lastDetectionTime - Unix timestamp (ms) of the last detection for this flag.
 */

/**
 * @typedef {object} PlayerFlagData
 * @property {number} totalFlags - Total number of flags accumulated by the player.
 * @property {PlayerFlagDetail} [fly] - Fly hack detection data.
 * @property {PlayerFlagDetail} [speed] - Speed hack detection data.
 * @property {PlayerFlagDetail} [nofall] - No fall damage hack detection data.
 * @property {PlayerFlagDetail} [reach] - Reach hack detection data.
 * @property {PlayerFlagDetail} [cps] - Clicks per second hack detection data.
 * @property {PlayerFlagDetail} [nuker] - Nuker hack detection data.
 * @property {PlayerFlagDetail} [illegalItem] - Illegal item detection data.
 * @property {PlayerFlagDetail} [illegalCharInChat] - Illegal character (e.g. newline) in chat message.
 * @property {PlayerFlagDetail} [longMessage] - Message exceeded maximum configured length.
 * @property {PlayerFlagDetail} [spamRepeat] - Sent the same/similar message multiple times in a short period.
 * @property {PlayerFlagDetail} [combat_log] - Player disconnected shortly after combat.
 * @property {PlayerFlagDetail} [movement_high_y_velocity] - Player exhibited unusually high vertical velocity.
 * @property {PlayerFlagDetail} [movement_fly_sustained] - Player exhibited sustained upward flight.
 * @property {PlayerFlagDetail} [movement_fly_hover] - Player exhibited hovering behavior.
 * @property {PlayerFlagDetail} [combat_invalid_pitch] - Player's view pitch was outside valid limits.
 * @property {PlayerFlagDetail} [combat_viewsnap_pitch] - Player's view pitch changed too rapidly after an attack.
 * @property {PlayerFlagDetail} [combat_viewsnap_yaw] - Player's view yaw changed too rapidly after an attack.
 * @property {PlayerFlagDetail} [combat_multitarget_aura] - Player attacked multiple distinct targets too quickly.
 * @property {PlayerFlagDetail} [combat_attack_while_sleeping] - Player attacked while sleeping.
 * @property {PlayerFlagDetail} [combat_attack_while_consuming] - Player attacked while using a consumable.
 * @property {PlayerFlagDetail} [combat_attack_while_bow_charging] - Player attacked while charging a bow.
 * @property {PlayerFlagDetail} [combat_attack_while_shielding] - Player attacked while using a shield.
 * @property {PlayerFlagDetail} [world_illegal_item_place] - Player placed a banned item.
 * @property {PlayerFlagDetail} [world_illegal_item_use] - Player used a banned item.
 * @property {PlayerFlagDetail} [world_tower_build] - Player built a tower suspiciously.
 * @property {PlayerFlagDetail} [world_flat_rotation_building] - Player built with unnatural camera rotation.
 * @property {PlayerFlagDetail} [world_downward_scaffold] - Player scaffolded downwards suspiciously.
 * @property {PlayerFlagDetail} [world_air_place] - Player placed blocks against air/liquid without support.
 * @property {PlayerFlagDetail} [action_fast_use] - Player used an item faster than its cooldown.
 * @property {PlayerFlagDetail} [world_fast_place] - Player placed blocks too quickly.
 * @property {PlayerFlagDetail} [movement_noslow] - Player moved too fast during a slowing action.
 * @property {PlayerFlagDetail} [movement_invalid_sprint] - Player sprinted under invalid conditions.
 * @property {PlayerFlagDetail} [world_autotool] - Player switched tools suspiciously around block breaking.
 * @property {PlayerFlagDetail} [world_instabreak_unbreakable] - Player attempted to break an unbreakable block.
 * @property {PlayerFlagDetail} [world_instabreak_speed] - Player broke a block faster than possible.
 * @property {PlayerFlagDetail} [player_namespoof] - Player's nameTag was identified as spoofed or invalid.
 * @property {PlayerFlagDetail} [player_antigmc] - Player was detected in unauthorized Creative Mode.
 * @property {PlayerFlagDetail} [player_inventory_mod] - Player manipulated inventory/hotbar suspiciously.
 * @property {PlayerFlagDetail} [player_self_hurt] - Player damaged themselves via direct entity attack.
 */

/**
 * @typedef {object} PlayerAntiCheatData Core data structure for tracking player state and violations.
 * @property {string} playerNameTag - The player's name tag at the time of data creation/last update.
 * @property {Vector3} lastPosition - Player's location in the previous tick.
 * @property {Vector3} previousPosition - Player's location two ticks ago.
 * @property {Vector3} velocity - Player's velocity calculated in the current tick.
 * @property {Vector3} previousVelocity - Player's velocity in the previous tick.
 * @property {number} consecutiveOffGroundTicks - How many ticks the player has been airborne.
 * @property {number} fallDistance - Accumulated fall distance since last on ground.
 * @property {number} lastOnGroundTick - Game tick when player was last on a solid surface.
 * @property {Vector3} lastOnGroundPosition - Player's location when last on a solid surface.
 * @property {number} consecutiveOnGroundSpeedingTicks - How many ticks player has been speeding while on ground.
 * @property {boolean} isTakingFallDamage - True if player took fall damage in the current tick's damage event processing.
 * @property {number[]} attackEvents - Timestamps of recent attack actions (for CPS).
 * @property {number} lastAttackTime - Timestamp of the last attack action (for MultiTarget).
 * @property {number[]} blockBreakEvents - Timestamps of recent block break actions (for Nuker).
 * @property {Array<{timestamp: number, content: string}>} recentMessages - Stores recent messages for spam detection.
 * @property {PlayerFlagData} flags - Container for all specific cheat flags and their counts.
 * @property {string} lastFlagType - The type of the last flag triggered (key from PlayerFlagData).
 * @property {boolean} isWatched - If true, emits more detailed debug logs for this player.
 * @property {number} lastPitch - Player's camera pitch (rotation.x) in the last tick.
 * @property {number} lastYaw - Player's camera yaw (rotation.y) in the last tick.
 * @property {number} lastAttackTick - Game tick of the last attack action initiated by the player.
 * @property {Array<{entityId: string, timestamp: number}>} recentHits - Array of recent hit entity IDs and timestamps (for MultiTarget).
 * @property {boolean} isUsingConsumable - True if player is currently using a consumable (food, potion).
 * @property {boolean} isChargingBow - True if player is currently charging a bow.
 * @property {boolean} isUsingShield - True if player is currently actively using (raising) a shield.
 * @property {number} lastItemUseTick - Game tick when player last initiated an item use action relevant to state conflicts.
 * @property {Array<{x: number, y: number, z: number, pitch: number, yaw: number, tick: number}>} recentBlockPlacements - Records recent block placements.
 * @property {number} lastPillarBaseY - Y-coordinate of the base of the current pillar being built.
 * @property {number} consecutivePillarBlocks - Number of consecutive blocks placed in the current pillar.
 * @property {number} lastPillarTick - Game tick of the last block placed in the current pillar.
 * @property {number | null} currentPillarX - X-coordinate of the current pillar.
 * @property {number | null} currentPillarZ - Z-coordinate of the current pillar.
 * @property {number} consecutiveDownwardBlocks - Number of consecutive blocks placed downwards while airborne.
 * @property {number} lastDownwardScaffoldTick - Game tick of the last downward scaffold block placement.
 * @property {{x: number, y: number, z: number} | null} lastDownwardScaffoldBlockLocation - Location of the last downward scaffold block.
 * @property {Record<string, number>} itemUseTimestamps - Stores last use timestamp for specific items (FastUse). Key: itemTypeId, Value: timestamp.
 * @property {number[]} recentPlaceTimestamps - Timestamps of recent block placements (FastPlace).
 * @property {number} jumpBoostAmplifier - Last known Jump Boost effect amplifier (-1 or 0 if no effect, 0 for level I, 1 for II, etc.).
 * @property {boolean} hasSlowFalling - True if player currently has Slow Falling effect.
 * @property {boolean} hasLevitation - True if player currently has Levitation effect.
 * @property {number} speedAmplifier - Last known Speed effect amplifier (-1 or 0 if no effect).
 * @property {number} blindnessTicks - Remaining ticks of Blindness effect (0 if none).
 * @property {number} lastTookDamageTick - Game tick when player last took damage.
 * @property {number} lastUsedElytraTick - Game tick when player last used elytra (started gliding).
 * @property {number} lastUsedRiptideTick - Game tick when player last used riptide trident.
 * @property {number} lastOnSlimeBlockTick - Game tick when player was last on a slime block.
 * @property {number} previousSelectedSlotIndex - Player's selected hotbar slot in the previous tick.
 * @property {number} lastSelectedSlotChangeTick - Game tick when selected hotbar slot last changed.
 * @property {boolean} isAttemptingBlockBreak - True if a PlayerBreakBlockBeforeEvent was recently caught.
 * @property {string | null} breakingBlockTypeId - Type ID of the block for the current break attempt.
 * @property {number} slotAtBreakAttemptStart - Selected slot when PlayerBreakBlockBeforeEvent fired.
 * @property {number} breakAttemptTick - Game tick of the PlayerBreakBlockBeforeEvent.
 * @property {boolean} switchedToOptimalToolForBreak - Flag for AutoTool: player switched to an optimal tool.
 * @property {number | null} optimalToolSlotForLastBreak - For AutoTool: slot index of the optimal tool used for the last break.
 * @property {number} lastBreakCompleteTick - For AutoTool: game tick when a block break was completed.
 * @property {{x: number, y: number, z: number} | null} breakingBlockLocation - Location of the block for current break attempt.
 * @property {string | null} blockBrokenWithOptimalTypeId - For AutoTool: Type ID of block broken with the optimal tool.
 * @property {string | null} optimalToolTypeIdForLastBreak - For AutoTool: Type ID of the optimal tool used.
 * @property {number} breakStartTimeMs - Timestamp (Date.now()) when current block break attempt started (for InstaBreak).
 * @property {number} breakStartTickGameTime - Game tick when current block break attempt started (for InstaBreak).
 * @property {number} expectedBreakDurationTicks - Calculated minimum ticks to break current block (for InstaBreak).
 * @property {string | null} toolUsedForBreakAttempt - Type ID of item used for current break attempt (for InstaBreak).
 * @property {string} lastKnownNameTag - Player's nameTag recorded in the previous tick/check (for NameSpoof).
 * @property {number} lastNameTagChangeTick - Game tick when player's nameTag last changed (for NameSpoof).
 * @property {{unmuteTime: number | Infinity, reason: string} | null} [muteInfo] - Information about player's mute status. Persisted.
 * @property {{unbanTime: number | Infinity, reason: string} | null} [banInfo] - Information about player's ban status. Persisted.
 * @property {boolean} isDirtyForSave - Flag indicating if this player's data needs to be saved to persistent storage. Not persisted itself.
 */

/**
 * @typedef {object} PlayerMuteInfo
 * @property {number | Infinity} unmuteTime - Timestamp when mute expires, or Infinity for permanent.
 * @property {string} reason - Reason for the mute.
 */

/**
 * @typedef {object} PlayerBanInfo
 * @property {number | Infinity} unbanTime - Timestamp when ban expires, or Infinity for permanent.
 * @property {string} reason - Reason for the ban.
 */

/**
 * @typedef {import('./config.js').editableConfigValues} Config
 * Contains all configurable values for the AntiCheat system.
 */

/**
 * @typedef {import('./utils/playerUtils.js')} PlayerUtils
 * Utility functions for player-related operations.
 */

/**
 * @typedef {import('./core/playerDataManager.js')} PlayerDataManager
 * Manages player-specific anti-cheat data.
 */

/**
 * @typedef {import('./core/logManager.js')} LogManager
 * Manages logging of admin actions and significant system events.
 */

/**
 * @typedef {import('./core/actionManager.js').executeCheckAction} ExecuteCheckAction
 * Function to execute defined actions (flag, log, notify) for a check.
 */

/**
 * @typedef {import('./core/uiManager.js')} UIManager
 * Manages admin UI forms.
 */

/**
 * @typedef {import('./core/reportManager.js')} ReportManager
 * Manages player reports.
 */

/**
 * @typedef {object} ActionManagerDependencies
 * @property {Config} config
 * @property {PlayerDataManager} playerDataManager
 * @property {PlayerUtils} playerUtils
 * @property {LogManager} logManager
 */

/**
 * Represents an active teleport request between two players.
 * @typedef {object} TpaRequest
 * @property {string} requestId - A unique identifier for the request (e.g., a UUID).
 * @property {string} requesterName - The name of the player who initiated the request.
 * @property {import('@minecraft/server').Vector3} requesterLocation - The location of the requester when the request was made.
 * @property {string} requesterDimensionId - The dimension ID of the requester when the request was made.
 * @property {string} targetName - The name of the player to whom the request was sent.
 * @property {import('@minecraft/server').Vector3} targetLocation - The location of the target when the request was made.
 * @property {string} targetDimensionId - The dimension ID of the target when the request was made.
 * @property {'tpa' | 'tpahere'} requestType - The type of request:
 *                                            'tpa' = requester wants to teleport to the target.
 *                                            'tpahere' = requester wants the target to teleport to them.
 * @property {number} creationTimestamp - The server time (e.g., from Date.now()) when the request was created.
 * @property {number} expiryTimestamp - The server time when the request will automatically expire.
 */

/**
 * Represents a player's TPA preference.
 * @typedef {object} PlayerTpaStatus
 * @property {string} playerName - The name of the player.
 * @property {boolean} acceptsTpaRequests - Whether the player is currently accepting TPA requests. Defaults to true.
 * @property {number} lastTpaToggleTimestamp - Timestamp of when the status was last changed.
 */

// This line is important to make this file a module and allow JSDoc types to be imported.
export {};
