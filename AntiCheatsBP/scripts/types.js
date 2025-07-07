/**
 * @file Defines common JSDoc typedefs used throughout the AntiCheat system.
 * These types provide static analysis benefits and improve code readability.
 */

// --- Core Minecraft Server & UI Types (for reference, often imported directly) ---
/**
 * @typedef {import('@minecraft/server').Player} Player Player object from Minecraft server.
 * @typedef {import('@minecraft/server').Dimension} Dimension Dimension object.
 * @typedef {import('@minecraft/server').Entity} Entity General entity object.
 * @typedef {import('@minecraft/server').ItemStack} ItemStack ItemStack object.
 * @typedef {import('@minecraft/server').Block} Block Block object.
 * @typedef {import('@minecraft/server').Vector3} Vector3 Minecraft's Vector3 type.
 * @typedef {import('@minecraft/server-ui').ActionFormData} ActionFormData UI form.
 * @typedef {import('@minecraft/server-ui').MessageFormData} MessageFormData UI form.
 * @typedef {import('@minecraft/server-ui').ModalFormData} ModalFormData UI form.
 * @typedef {import('@minecraft/server').ItemComponentTypes} ItemComponentTypes Enum for item components.
 */

// --- AntiCheat System Specific Types ---

/**
 * @typedef {import('./config.js').editableConfigValues} ConfigEditable Current editable configuration values.
 * @typedef {import('./core/actionProfiles.js').checkActionProfiles} CheckActionProfiles All defined action profiles.
 * @typedef {import('./core/automodConfig.js').automodConfig} AutoModConfig The AutoMod rules and toggles.
 *
 * Typedefs for full modules (primarily for JSDoc linking and clarity):
 * @typedef {typeof import('./utils/playerUtils.js')} PlayerUtilsFull Module for player utility functions.
 * @typedef {typeof import('./core/playerDataManager.js')} PlayerDataManagerFull Module for player-specific AC data.
 * @typedef {typeof import('./core/logManager.js')} LogManagerFull Module for logging AC events.
 * @typedef {typeof import('./core/actionManager.js')} ActionManagerFull Module for executing actions based on checks.
 * @typedef {typeof import('./core/uiManager.js')} UIManagerFull Module for creating and showing UI forms.
 * @typedef {typeof import('./core/reportManager.js')} ReportManagerFull Module for player reports.
 * @typedef {typeof import('./core/tpaManager.js')} TpaManagerFull Module for TPA system.
 * @typedef {typeof import('./core/commandManager.js')} CommandManagerFull Module for command management.
 * @typedef {typeof import('./core/rankManager.js')} RankManagerFull Module for rank management.
 * @typedef {typeof import('./core/chatProcessor.js')} ChatProcessorFull Module for processing chat messages.
 * @typedef {typeof import('./utils/worldBorderManager.js')} WorldBorderManagerFull Module for world border.
 * @typedef {typeof import('./checks/index.js')} AllChecksFull Object containing all check functions.
 */

/**
 * Represents the definition of a command.
 *
 * @typedef {object} CommandDefinition
 * @property {string} name The primary name of the command (e.g., "kick").
 * @property {string} syntax A brief description of how to use the command (e.g., "!kick <player> [reason]").
 * @property {string} description A more detailed explanation of what the command does.
 * @property {number} permissionLevel The minimum permission level required to execute this command (from `rankManager.permissionLevels`).
 * @property {string[]} [aliases] Optional array of alternative names for the command (e.g., ["k"]).
 * @property {boolean} [enabled=true] Whether the command is currently enabled. Can be toggled in `config.js`.
 * @property {boolean} [requiresCheats=false] If true, Minecraft's "Cheats Enabled" must be active for this command (rarely used for script commands).
 * @property {Array<{name: string, type: string, description?: string, optional?: boolean}>} [parameters] Detailed parameter definitions for help generation or advanced parsing.
 */

/**
 * Represents a module containing a command's definition and execution logic.
 *
 * @typedef {object} CommandModule
 * @property {CommandDefinition} definition The definition of the command.
 * @property {function(Player, string[], Dependencies): Promise<void>} execute The function to run when the command is executed.
 */

/**
 * Represents detailed information about a specific flag type for a player.
 *
 * @typedef {object} PlayerFlagDetail
 * @property {number} count The number of times this flag has been triggered.
 * @property {number} lastDetectionTime Unix timestamp (in milliseconds) of the last detection.
 * @property {string} [lastDetails] Optional string providing context for the last detection.
 */

/**
 * Represents the collection of all flags a player has accumulated.
 * Keys are typically `checkType` strings (e.g., "fly", "speed", "chatSpamFastMessage").
 *
 * @typedef {{ totalFlags: number } & Record<string, PlayerFlagDetail | undefined>} PlayerFlagData
 */

/**
 * Information about a player's mute status.
 *
 * @typedef {object} PlayerMuteInfo
 * @property {number | Infinity} unmuteTime Unix timestamp (ms) when the mute expires, or Infinity for permanent.
 * @property {string} reason The reason for the mute.
 * @property {string} mutedBy The name of the admin or system component that issued the mute.
 * @property {boolean} [isAutoMod=false] True if the mute was applied by the AutoMod system.
 * @property {string|null} [triggeringCheckType] The specific check type that triggered an AutoMod mute.
 */

/**
 * Information about a player's ban status.
 *
 * @typedef {object} PlayerBanInfo
 * @property {string} [xuid] The Xbox User ID of the banned player, if available.
 * @property {string} [playerName] The last known nameTag of the banned player.
 * @property {number} banTime Unix timestamp (ms) when the ban was applied.
 * @property {number | Infinity} unbanTime Unix timestamp (ms) when the ban expires, or Infinity for permanent.
 * @property {string} reason The reason for the ban.
 * @property {string} bannedBy The name of the admin or system component that issued the ban.
 * @property {boolean} [isAutoMod=false] True if the ban was applied by the AutoMod system.
 * @property {string|null} [triggeringCheckType] The specific check type that triggered an AutoMod ban.
 */

/**
 * Core data structure for tracking player-specific AntiCheat state and violations.
 * This data is typically managed by `playerDataManager.js` and can be persisted.
 *
 * @typedef {object} PlayerAntiCheatData
 * @property {string} id Player's unique ID (e.g., `player.id`).
 * @property {string} playerNameTag Current nameTag of the player.
 * @property {Vector3} lastPosition Last known precise location.
 * @property {Vector3} [previousPosition] Previous known precise location (from the tick before `lastPosition`).
 * @property {Vector3} [velocity] Current calculated velocity.
 * @property {Vector3} [previousVelocity] Previous calculated velocity.
 * @property {number} [currentTick] The game tick when this data snapshot was last updated for checks.
 * @property {boolean} [isOnline=false] Whether the player is currently online.
 * @property {boolean} [isDirtyForSave=false] Flag indicating if this data needs to be saved to persistent storage. Not persisted itself.
 * @property {boolean} [isWatched=false] If true, more detailed logging or specific actions might apply to this player.
 * @property {string} [lastKnownNameTag] Persisted last known nameTag, useful for offline lookups.
 * @property {number} [lastNameTagChangeTick] Game tick of the last nameTag change.
 * @property {PlayerMuteInfo | null} [muteInfo] Current mute status. Persisted.
 * @property {PlayerBanInfo | null} [banInfo] Current ban status. Persisted.
 * @property {PlayerFlagData} flags Accumulated violation flags.
 * @property {string} [lastFlagType] The `checkType` of the most recent flag.
 * @property {{[key: string]: {itemTypeId?: string, quantityFound?: number, timestamp: number, details?: string, [key: string]: any}}} [lastViolationDetailsMap] Stores details of the last violation for specific check types. Persisted.
 * @property {{[key: string]: {lastActionThreshold?: number, lastActionTimestamp?: number, [key: string]: any}}} [automodState] State information for the AutoMod system related to this player. Persisted.
 * @property {number} [lastLoginTime] Timestamp of the last login.
 * @property {number} [lastLogoutTime] Timestamp of the last logout.
 * @property {number} [joinCount=0] Total number of times the player has joined.
 * @property {number} [joinTime] Timestamp (ms) of when the player last joined the server. Persisted.
 *
 * Movement Related State:
 * @property {number} [consecutiveOffGroundTicks=0] How many ticks the player has been airborne.
 * @property {number} [fallDistance=0] Accumulated fall distance since last on-ground or damage mitigating event.
 * @property {number} [lastOnGroundTick=0] Game tick when the player was last on solid ground.
 * @property {Vector3} [lastOnGroundPosition] Position when last on solid ground.
 * @property {boolean} [isTakingFallDamage=false] True if the player is currently in the process of taking fall damage (to prevent fallDistance reset too early).
 * @property {number} [jumpBoostAmplifier=0] Current jump boost effect amplifier.
 * @property {boolean} [hasSlowFalling=false] Current slow falling effect status.
 * @property {boolean} [hasLevitation=false] Current levitation effect status.
 * @property {number} [speedAmplifier=-1] Current speed effect amplifier (default -1 if no effect).
 * @property {number} [blindnessTicks=0] Remaining ticks of blindness effect.
 * @property {number} [lastUsedElytraTick=0] Game tick when elytra was last used.
 * @property {number} [lastUsedRiptideTick=0] Game tick when riptide trident was last used.
 * @property {number} [lastOnSlimeBlockTick=0] Game tick when last bounced on a slime block.
 * @property {number} [consecutiveOnGroundSpeedingTicks=0] For speed check: consecutive ticks exceeding speed limits while on ground.
 *
 * Combat Related State:
 * @property {number[]} [attackEventsTimestamps] Timestamps of recent attack actions (for CPS).
 * @property {number} [lastAttackTime=0] Timestamp of the last attack action (general).
 * @property {number} [lastAttackTick=0] Game tick of the last attack action.
 * @property {number} [lastTookDamageTick=0] Game tick when the player last took damage.
 * @property {number} [lastCombatInteractionTime=0] Timestamp of last combat event (dealt or received damage).
 * @property {Array<{entityId: string, timestamp: number, entityType?: string}>} [recentHits] History of entities hit by the player (for MultiTarget).
 * @property {number} [lastPitch=0] Player's pitch rotation at the last relevant moment (e.g., attack).
 * @property {number} [lastYaw=0] Player's yaw rotation at the last relevant moment.
 * @property {boolean} [isUsingConsumable=false] True if currently using a consumable item (food, potion).
 * @property {boolean} [isChargingBow=false] True if currently charging a bow/crossbow.
 * @property {boolean} [isUsingShield=false] True if currently holding up/using a shield.
 * @property {number} [lastItemUseTick=0] Game tick of the last significant item use start.
 * @property {{[key: string]: number}} [itemUseTimestamps] Timestamps of last use for specific items (for FastUse check).
 *
 * World Interaction / Building State:
 * @property {number[]} [blockBreakEventsTimestamps] Timestamps of recent block break actions (for Nuker).
 * @property {Array<{x: number, y: number, z: number, blockTypeId: string, pitch: number, yaw: number, tick: number, dimensionId: string}>} [recentBlockPlacements] History of recent block placements.
 * @property {number[]} [recentPlaceTimestamps] Timestamps of recent block placements (for FastPlace check).
 * @property {boolean} [isAttemptingBlockBreak=false] True if player is currently holding break on a block.
 * @property {string | null} [breakingBlockTypeId] Type ID of the block currently being broken.
 * @property {Vector3 | null} [breakingBlockLocation] Location of the block currently being broken.
 * @property {number} [slotAtBreakAttemptStart=-1] Inventory slot index when block breaking started.
 * @property {number} [breakAttemptTick=0] Game tick when current block breaking attempt started.
 * @property {string | null} [toolUsedForBreakAttempt] Item type ID of the tool used when break attempt started.
 * @property {boolean} [switchedToOptimalToolForBreak=false] For AutoTool: if player switched to optimal tool during current break.
 * @property {number | null} [optimalToolSlotForLastBreak] For AutoTool: slot of optimal tool if switched.
 * @property {number} [lastBreakCompleteTick=0] Game tick of the last completed block break.
 * @property {string | null} [blockBrokenWithOptimalTypeId] For AutoTool: type of block broken if optimal tool switch was detected.
 * @property {string | null} [optimalToolTypeIdForLastBreak] For AutoTool: type of optimal tool used.
 * @property {number} [breakStartTimeMs=0] System time (ms) when block breaking started (for InstaBreak).
 * @property {number} [breakStartTickGameTime=0] Game time (ticks) when block breaking started (for InstaBreak).
 * @property {number} [expectedBreakDurationTicks=0] Expected vanilla break duration for current block/tool (for InstaBreak).
 * @property {number} [lastPillarBaseY=0] For Tower check: Y-level of the base of the current pillar.
 * @property {number} [consecutivePillarBlocks=0] For Tower check: number of blocks in current pillar.
 * @property {number} [lastPillarTick=0] For Tower check: game tick of last pillar block placement.
 * @property {number | null} [currentPillarX] For Tower check: X-coord of current pillar.
 * @property {number | null} [currentPillarZ] For Tower check: Z-coord of current pillar.
 * @property {number} [consecutiveDownwardBlocks=0] For DownwardScaffold check.
 * @property {number} [lastDownwardScaffoldTick=0] For DownwardScaffold check.
 * @property {Vector3 | null} [lastDownwardScaffoldBlockLocation] For DownwardScaffold check.
 *
 * Chat Related State:
 * @property {Array<{timestamp: number, content: string, isCommand?: boolean}>} [recentMessages] History of recent chat messages.
 *
 * Inventory / Client State:
 * @property {number} [previousSelectedSlotIndex=-1] Previously selected hotbar slot.
 * @property {number} [lastSelectedSlotChangeTick=0] Game tick of last hotbar slot change.
 * @property {number} [lastReportedRenderDistance=0] Last render distance reported by client (if available).
 * @property {number} [lastRenderDistanceCheckTick=0] Game tick of last render distance check.
 *
 * Check-Specific Tick Timers (to control frequency of less critical checks):
 * @property {number} [lastCheckNameSpoofTick=0]
 * @property {number} [lastCheckAntiGmcTick=0]
 * @property {number} [lastCheckNetherRoofTick=0]
 * @property {number} [lastCheckAutoToolTick=0]
 * @property {number} [lastCheckFlatRotationBuildingTick=0]
 * @property {string} [lastGameMode] Last known GameMode of the player (transient, updated by tick).
 * @property {string} [lastDimensionId] Last known dimension ID of the player (transient, updated by tick).
 * @property {string | null} [deathMessageToShowOnSpawn] Message to show player on respawn (e.g., death coordinates). Persisted.
 * @property {boolean} [slimeCheckErrorLogged=false] Transient flag to prevent spamming slime block check errors.
 *
 * World Border State:
 * @property {number} [lastBorderVisualTick=0] Last tick world border visuals were updated for this player.
 * @property {number} [ticksOutsideBorder=0] Consecutive ticks spent outside the world border.
 * @property {number} [borderDamageApplications=0] Number of times damage has been applied by the border this session.
 */

/**
 * Structure for a TPA (Teleport Ask) request.
 *
 * @typedef {object} TpaRequest
 * @property {string} requestId Unique ID for this TPA request.
 * @property {string} requesterName Name of the player who initiated the request.
 * @property {Vector3} requesterLocation Location of the requester when the request was made.
 * @property {string} requesterDimensionId Dimension ID of the requester.
 * @property {string} targetName Name of the player to whom the request was sent.
 * @property {Vector3} targetLocation Location of the target when the request was made.
 * @property {string} targetDimensionId Dimension ID of the target.
 * @property {'tpa' | 'tpahere'} requestType Type of TPA request.
 * @property {number} creationTimestamp Unix timestamp (ms) when the request was created.
 * @property {number} expiryTimestamp Unix timestamp (ms) when the request automatically expires.
 * @property {'pending_acceptance'|'pending_teleport_warmup'|'teleporting'|'cancelled_by_requester'|'cancelled_by_target'|'cancelled_by_system'|'cancelled_damage'|'completed'|'expired'} [status='pending_acceptance'] Current status of the TPA request.
 * @property {number} [warmupExpiryTimestamp] Unix timestamp (ms) when teleport warmup ends (if applicable).
 * @property {string} [cancellationReason] Reason if the request was cancelled.
 * @property {Vector3} [teleportingPlayerInitialLocation] Initial location of the player who will be teleported, captured at warmup start.
 */

/**
 * Represents a player's TPA system preferences.
 *
 * @typedef {object} PlayerTpaStatus
 * @property {string} playerName Name of the player.
 * @property {boolean} acceptsTpaRequests True if the player is currently accepting TPA requests.
 * @property {number} lastTpaToggleTimestamp Timestamp of the last time TPA acceptance was toggled.
 * @property {number} [lastTpaSentTimestamp=0] Timestamp of the last TPA request sent by this player (for cooldown).
 */

/**
 * Structure for a log entry.
 *
 * @typedef {object} LogEntry
 * @property {number} [timestamp=Date.now()] Unix timestamp (ms) of the log event.
 * @property {string} actionType Type of action being logged (e.g., "flag_added", "command_executed", "player_muted", "error").
 * @property {string} [adminName] Name of the admin performing an action, if applicable.
 * @property {string} [targetName] Name of the player targeted by an action, if applicable.
 * @property {string} [targetId] XUID or game ID of the target player, if applicable.
 * @property {string} [checkType] Specific AntiCheat check involved, if applicable (e.g., "fly", "speed").
 * @property {string} [flagSeverity] Severity of the flag (e.g., "low", "medium", "high"), if applicable.
 * @property {object | string} [details] Additional details or context about the logged event. Can be a structured object for errors or a string for simpler logs.
 * @property {string} [context] Broader context or module where the log originated (e.g., "SpeedCheck", "BanCommand").
 * @property {Vector3} [location] Location associated with the event, if applicable.
 * @property {string} [dimensionId] Dimension ID associated with the event's location.
 */

/**
 * Structure for a player report.
 *
 * @typedef {object} ReportEntry
 * @property {string} reportId Unique ID for the report.
 * @property {number} timestamp Unix timestamp (ms) when the report was filed.
 * @property {string} reporterName Name of the player who filed the report.
 * @property {string} reporterId ID of the reporter.
 * @property {string} reportedPlayerName Name of the player being reported.
 * @property {string} [reportedPlayerId] ID of the reported player, if known/online.
 * @property {string} reason Reason provided by the reporter.
 * @property {'open' | 'under_review' | 'resolved_no_action' | 'resolved_action_taken' | 'closed_invalid'} status Current status of the report.
 * @property {string} [assignedAdmin] Name of the admin currently handling the report.
 * @property {string} [resolutionDetails] Details about how the report was resolved.
 * @property {number} [lastUpdatedTimestamp] Timestamp of the last update to this report.
 */

/**
 * Structure for an action profile defined in `actionProfiles.js`.
 * Describes a sequence of actions to take based on flag counts for a `checkType`.
 *
 * @typedef {object} ActionProfile
 * @property {string} profileName Unique name for this action profile.
 * @property {Array<{threshold: number, actions: Array<string | {type: string, params: any}>, messageToPlayer?: string, messageToAdmins?: string, duration?: string, reason?: string, priority?: number}>} tiers Ordered list of tiers.
 * Each tier defines a flag `threshold` and `actions` to take when that threshold is met.
 * `actions` can be simple strings (e.g., "warn", "kick") or objects for complex actions.
 */

/**
 * Structure for an AutoMod configuration rule defined in `automodConfig.js`.
 * Links a `checkType` to an `actionProfileName` and enables/disables it.
 *
 * @typedef {object} AutoModRuleDef
 * @property {string} checkType The type of check this rule applies to (e.g., "chatSpamFastMessage", "movementFlySustained").
 * @property {string} actionProfileName The name of the action profile (from `actionProfiles.js`) to use for this check.
 * @property {boolean} enabled Whether this AutoMod rule is currently active.
 * @property {string} [description] Optional description of the rule.
 * @property {number} [resetFlagsAfterSeconds] Optional: Cooldown in seconds after which flags for this specific check type are reset for a player if no new violations occur.
 */

/**
 * Rank definition structure from `ranksConfig.js`.
 *
 * @typedef {object} RankDefinition
 * @property {string} id Unique identifier for the rank (e.g., "member", "moderator", "admin").
 * @property {string} name Display name of the rank (e.g., "Member", "Moderator").
 * @property {number} permissionLevel Numerical permission level associated with this rank. Lower is higher privilege.
 * @property {string} [chatPrefix=""] Prefix displayed before the player's name in chat.
 * @property {string} [chatSuffix=""] Suffix displayed after the player's name in chat.
 * @property {string} [nametagPrefix=""] Prefix displayed in the player's nametag (above head).
 * @property {string} [nametagSuffix=""] Suffix displayed in the player's nametag.
 * @property {string} [defaultChatColor="§f"] Default Minecraft color code for chat messages from players with this rank.
 * @property {Array<RankCondition>} conditions Conditions for a player to obtain this rank.
 * @property {boolean} [isDefault=false] If true, this is the default rank for new players or those not meeting other rank conditions.
 * @property {number} [assignableBy] Permission level required to manually assign/remove this rank (if applicable).
 */

/**
 * Represents the set of dependencies passed to most functions, particularly event handlers and checks.
 * This provides a consistent way to access shared modules and data.
 *
 * @typedef {object} Dependencies
 * @property {ConfigEditable} config The current editable configuration settings.
 * @property {CheckActionProfiles} checkActionProfiles All defined action profiles.
 * @property {AutoModConfig} automodConfig The AutoMod rules and toggles.
 * @property {PlayerUtilsFull} playerUtils Utility functions for player interactions.
 * @property {PlayerDataManagerFull} playerDataManager Manager for player-specific AntiCheat data.
 * @property {LogManagerFull} logManager Manager for logging events.
 * @property {ActionManagerFull} actionManager Manager for executing check actions.
 * @property {UIManagerFull} uiManager Manager for handling user interface forms.
 * @property {ReportManagerFull} reportManager Manager for player reports.
 * @property {TpaManagerFull} tpaManager Manager for the TPA system.
 * @property {AllChecksFull} checks An object containing all check functions, keyed by check name.
 * @property {typeof import('@minecraft/server')} mc The raw `@minecraft/server` module.
 * @property {number} currentTick The current game tick count from the main loop.
 * @property {typeof import('./core/rankManager.js').permissionLevels} permissionLevels Enum-like object for permission levels.
 * @property {typeof ActionFormData} ActionFormData Constructor for ActionForm.
 * @property {typeof MessageFormData} MessageFormData Constructor for MessageForm.
 * @property {typeof ModalFormData} ModalFormData Constructor for ModalForm.
 * @property {typeof ItemComponentTypes} ItemComponentTypes Enum for item component types.
 * @property {ChatProcessorFull} chatProcessor Module for processing and validating chat messages.
 * @property {function(string, Record<string, string | number>?): string} getString Localization function.
 * @property {{getPlayerPermissionLevel: RankManagerFull['getPlayerPermissionLevel'], updatePlayerNametag: RankManagerFull['updatePlayerNametag'], getPlayerRankFormattedChatElements: RankManagerFull['getPlayerRankFormattedChatElements'], getRankById: RankManagerFull['getRankById']}} rankManager Subset of RankManager functions for convenience.
 * @property {{getBorderSettings: WorldBorderManagerFull['getBorderSettings'], saveBorderSettings: WorldBorderManagerFull['saveBorderSettings'], processWorldBorderResizing: WorldBorderManagerFull['processWorldBorderResizing'], enforceWorldBorderForPlayer: WorldBorderManagerFull['enforceWorldBorderForPlayer'], isPlayerOutsideBorder: WorldBorderManagerFull['isPlayerOutsideBorder'], clearBorderSettings: WorldBorderManagerFull['clearBorderSettings']}} worldBorderManager Subset of WorldBorderManager functions for convenience.
 * @property {import('@minecraft/server').System} system The `system` object from `@minecraft/server`.
 * @property {{registerCommand: CommandManagerFull['registerCommandInternal'], unregisterCommand: CommandManagerFull['unregisterCommandInternal'], reloadCommands: CommandManagerFull['initializeCommands']}} commandManager Subset of CommandManager functions (for internal use by main.js etc.).
 * @property {typeof import('./config.js')} editableConfig The full config module, allowing access to `updateConfigValue`.
 */

// --- Action Profile Types (from actionProfiles.js) ---

/**
 * Defines flagging behavior within an ActionProfile.
 *
 * @typedef {object} ActionProfileFlag
 * @property {number} [increment=1] - How much to increment the flag count by.
 * @property {string} reason - Template for the flag reason. Placeholders: {playerName}, {checkType}, {detailsString}, and any keys from violationDetails.
 * @property {string} [type] - Specific flag type key (camelCase) for storage; defaults to the main checkType if not provided.
 */

/**
 * Defines admin notification behavior within an ActionProfile.
 *
 * @typedef {object} ActionProfileNotify
 * @property {string} message - Template for the admin notification message. Placeholders same as ActionProfileFlag.reason.
 */

/**
 * Defines logging behavior within an ActionProfile.
 *
 * @typedef {object} ActionProfileLog
 * @property {string} [actionType] - Specific actionType for logging (camelCase); defaults to `detected<CheckType>` (e.g., `detectedMovementFlyHover`).
 * @property {string} [detailsPrefix=''] - Prefix for the log details string.
 * @property {boolean} [includeViolationDetails=true] - Whether to include formatted violation details in the log.
 */

/**
 * Defines an entry in `checkActionProfiles`. It determines the immediate consequences
 * when a specific `checkType` is triggered.
 *
 * @typedef {object} ActionProfileEntry
 * @property {boolean} enabled - Whether this action profile is active.
 * @property {ActionProfileFlag} [flag] - Configuration for flagging the player.
 * @property {ActionProfileNotify} [notifyAdmins] - Configuration for notifying admins.
 * @property {ActionProfileLog} [log] - Configuration for logging the event.
 * @property {boolean} [cancelMessage] - If true, cancels the chat message (for chat-related checks).
 * @property {string} [customAction] - A custom action string (camelCase) for special handling by other modules or for informational purposes.
 * @property {boolean} [cancelEvent] - If true, cancels the underlying game event (e.g., block placement).
 */

// --- AutoMod Configuration Types (from automodConfig.js) ---

/**
 * Defines parameters for a specific AutoMod action.
 *
 * @typedef {object} AutoModActionParameters
 * @property {string} [messageTemplate] - Template for messages to players or admins. Placeholders: {playerName}, {actionType}, {checkType}, {flagCount}, {flagThreshold}, {duration}, {itemTypeId}, {itemQuantity}, {teleportCoordinates}.
 * @property {string} [adminMessageTemplate] - Optional separate template for admin notifications. Same placeholders.
 * @property {string} [duration] - Duration string for tempBan or mute (e.g., '5m', '1h', 'perm'). Parsed by `playerUtils.parseDuration`.
 * @property {{x?: number, y: number, z?: number}} [coordinates] - Coordinates for `teleportSafe` action. Y is mandatory. X/Z default to player's current X/Z.
 * @property {string} [itemToRemoveTypeId] - Type ID of item to remove for `removeIllegalItem` action.
 */

/**
 * Defines a rule within an AutoMod tier for a specific `checkType`.
 *
 * @typedef {object} AutoModTierRule
 * @property {number} flagThreshold - The number of flags of a specific `checkType` (camelCase) to trigger this rule.
 * @property {('warn'|'kick'|'tempBan'|'permBan'|'mute'|'freezePlayer'|'removeIllegalItem'|'teleportSafe'|'flagOnly')} actionType - The type of action to take (camelCase).
 * @property {AutoModActionParameters} parameters - Parameters specific to the actionType.
 * @property {boolean} resetFlagsAfterAction - Whether to reset the specific `checkType` flags for the player after this action is taken.
 */

// --- Rank Configuration Types (from ranksConfig.js) ---

/**
 * Defines chat formatting for a rank.
 *
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] - The text part of the rank prefix (e.g., "[Admin] ").
 * @property {string} [prefixColor='§7'] - Minecraft color code for the prefix text (e.g., "§c").
 * @property {string} [nameColor='§7'] - Minecraft color code for the player's name (e.g., "§b").
 * @property {string} [messageColor='§f'] - Minecraft color code for the player's chat message (e.g., "§f").
 */

/**
 * Defines a condition for a player to be assigned a rank.
 *
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'manualTagPrefix'|'tag'|'default')} type - The type of condition (camelCase).
 *      - `ownerName`: Matches if player's nameTag equals `config.ownerPlayerName`.
 *      - `adminTag`: Matches if player has the tag specified in `config.adminTag`.
 *      - `manualTagPrefix`: Matches if player has a tag like `prefix` + `rankId` (e.g., 'rank_vip'). The `rankId` part is the ID of the rank definition this condition belongs to.
 *      - `tag`: Matches if player has the specified `tag` string.
 *      - `default`: A fallback condition, usually for the 'member' rank.
 * @property {string} [prefix] - Required if type is `manualTagPrefix`. The prefix for the rank tag (e.g., "rank_").
 * @property {string} [tag] - Required if type is `tag`. The specific tag to check for.
 */

// --- World Border System Types ---

/**
 * Defines the settings for a world border in a specific dimension.
 *
 * @typedef {object} WorldBorderSettings
 * @property {string} dimensionId - The ID of the dimension these settings apply to (e.g., "minecraft:overworld").
 * @property {boolean} enabled - Whether the border is active in this dimension.
 * @property {'square' | 'circle'} shape - The shape of the world border.
 * @property {number} centerX - The X-coordinate of the border's center.
 * @property {number} centerZ - The Z-coordinate of the border's center.
 * @property {number} [halfSize] - For 'square' shape: half the length of a side (e.g., 500 for a 1000x1000 border).
 * @property {number} [radius] - For 'circle' shape: the radius of the border.
 * @property {boolean} [enableDamage=false] - Whether players take damage when outside the border.
 * @property {number} [damageAmount=0.5] - Damage amount per interval for players outside (0.5 heart = 1 damage).
 * @property {number} [damageIntervalTicks=20] - Interval in game ticks at which damage is applied (20 ticks = 1 second).
 * @property {number} [teleportAfterNumDamageEvents=30] - Number of damage events after which a player is teleported back inside. 0 or negative to disable.
 * @property {string} [particleNameOverride] - Specific particle name to use for this dimension's border, overrides global. 'reset' or 'default' to use global.
 * @property {boolean} [isResizing=false] - True if the border is currently undergoing a resize operation.
 * @property {number} [originalSize] - The size (halfSize/radius) before the resize started.
 * @property {number} [targetSize] - The target size (halfSize/radius) for the resize operation.
 * @property {number} [resizeStartTimeMs] - Timestamp (ms) when the current resize operation began.
 * @property {number} [resizeDurationMs] - Total duration (ms) for the current resize operation.
 * @property {boolean} [isPaused=false] - True if the current resize operation is paused.
 * @property {number} [resizePausedTimeMs=0] - Total accumulated time (ms) this resize has been paused.
 * @property {number} [resizeLastPauseStartTimeMs] - Timestamp (ms) when the current pause began (if `isPaused` is true).
 * @property {'linear' | 'easeOutQuad' | 'easeInOutQuad'} [resizeInterpolationType='linear'] - The interpolation method for resizing.
 */

// --- Miscellaneous Generic Types ---

/**
 * Generic type for `violationDetails` objects passed by check scripts.
 * Specific keys depend on the `checkType`. Common examples: `{value: number, threshold: number, itemTypeId: string}`.
 * Refer to individual check implementations or `actionProfiles.js` for expected placeholders.
 *
 * @typedef {Object<string, any>} ViolationDetails
 */

/**
 * Generic type for `eventSpecificData` objects passed to some check functions.
 * Contains context from the game event that triggered the check.
 * Specific keys depend on the event and check. Example: `{ targetEntity: Entity, gameMode: GameMode }` for `reachCheck`.
 *
 * @typedef {object} EventSpecificData
 */

/**
 * @typedef {object} SoundOptions
 * @property {number} volume
 * @property {number} pitch
 */

// This line is important to make this file a module and allow JSDoc types to be imported globally by other files.
/**
 *
 */
export {};
