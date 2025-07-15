/**
 * @file Defines common JSDoc typedefs for the AntiCheat system.
 * @module types
 */

// --- Core Minecraft Server & UI Types ---
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
 * @typedef {object} CommandDefinition
 * @property {string} name The primary name of the command.
 * @property {string} syntax A brief description of how to use the command.
 * @property {string} description A detailed explanation of the command.
 * @property {number} permissionLevel The minimum permission level required.
 * @property {string[]} [aliases] Optional alternative names for the command.
 * @property {boolean} [enabled=true] Whether the command is enabled.
 * @property {boolean} [requiresCheats=false] Whether Minecraft cheats must be enabled.
 * @property {Array<{name: string, type: string, description?: string, optional?: boolean}>} [parameters] Detailed parameter definitions.
 */

/**
 * Represents a module containing a command's definition and execution logic.
 * @typedef {object} CommandModule
 * @property {CommandDefinition} definition The definition of the command.
 * @property {function(Player, string[], Dependencies): Promise<void>} execute The function to run when the command is executed.
 */

/**
 * @typedef {object} PlayerFlagDetail
 * @property {number} count The number of times this flag has been triggered.
 * @property {number} lastDetectionTime Timestamp of the last detection.
 * @property {string} [lastDetails] Optional context for the last detection.
 */

/**
 * Represents the collection of all flags a player has accumulated.
 * Keys are typically `checkType` strings (e.g., "fly", "speed", "chatSpamFastMessage").
 * @typedef {{ totalFlags: number } & Record<string, PlayerFlagDetail | undefined>} PlayerFlagData
 */

/**
 * @typedef {object} PlayerMuteInfo
 * @property {number|Infinity} unmuteTime Timestamp when the mute expires.
 * @property {string} reason The reason for the mute.
 * @property {string} mutedBy The name of the muter.
 * @property {boolean} [isAutoMod=false] If the mute was from AutoMod.
 * @property {string|null} [triggeringCheckType] The check that triggered an AutoMod mute.
 */

/**
 * @typedef {object} PlayerBanInfo
 * @property {string} [xuid] The XUID of the banned player.
 * @property {string} [playerName] The last known nameTag of the player.
 * @property {number} banTime Timestamp when the ban was applied.
 * @property {number|Infinity} unbanTime Timestamp when the ban expires.
 * @property {string} reason The reason for the ban.
 * @property {string} bannedBy The name of the banner.
 * @property {boolean} [isAutoMod=false] If the ban was from AutoMod.
 * @property {string|null} [triggeringCheckType] The check that triggered an AutoMod ban.
 */

/**
 * @typedef {object} PlayerAntiCheatData
 * @description Core data structure for tracking player-specific AntiCheat state.
 * @property {string} id Player's unique ID.
 * @property {string} playerNameTag Current nameTag.
 * @property {Vector3} lastPosition Last known location.
 * @property {boolean} [isOnline=false] Whether the player is online.
 * @property {boolean} [isDirtyForSave=false] If data needs to be saved.
 * @property {boolean} [isWatched=false] If detailed logging is active.
 * @property {PlayerMuteInfo|null} [muteInfo] Current mute status.
 * @property {PlayerBanInfo|null} [banInfo] Current ban status.
 * @property {PlayerFlagData} flags Accumulated violation flags.
 * @property {string} [lastFlagType] The type of the most recent flag.
 * @property {object} [lastViolationDetailsMap] Details of the last violation for specific checks.
 * @property {object} [automodState] State information for the AutoMod system.
 * @property {number} [joinCount=0] Total number of times the player has joined.
 * @property {number} [joinTime] Timestamp of the current session start.
 * @property {number} [lastCombatInteractionTime] Timestamp of last combat event.
 * @property {number[]} [attackEvents] Timestamps of recent attack actions.
 * @property {Array<{x: number, y: number, z: number, blockTypeId: string, tick: number}>} [recentBlockPlacements] History of recent block placements.
 * @property {number} [lastItemUseTick=0] Game tick of the last item use.
 * @property {number} [lastTookDamageTick=0] Game tick when player last took damage.
 */

/**
 * @typedef {object} TpaRequest
 * @property {string} requestId Unique ID for the request.
 * @property {string} requesterName Name of the requester.
 * @property {Vector3} requesterLocation Location of the requester.
 * @property {string} requesterDimensionId Dimension of the requester.
 * @property {string} targetName Name of the target.
 * @property {Vector3} targetLocation Location of the target.
 * @property {string} targetDimensionId Dimension of the target.
 * @property {'tpa'|'tpahere'} requestType Type of TPA request.
 * @property {number} creationTimestamp Timestamp of creation.
 * @property {number} expiryTimestamp Timestamp of expiration.
 * @property {string} [status='pending_acceptance'] Current status of the request.
 * @property {number} [warmupExpiryTimestamp] Timestamp for warmup completion.
 * @property {Vector3} [teleportingPlayerInitialLocation] Initial location of the teleporting player.
 */

/**
 * @typedef {object} PlayerTpaStatus
 * @property {string} playerName Name of the player.
 * @property {boolean} acceptsTpaRequests If the player accepts TPA requests.
 * @property {number} lastTpaToggleTimestamp Timestamp of the last toggle.
 * @property {number} [lastTpaSentTimestamp=0] Timestamp of the last sent TPA request.
 */

/**
 * @typedef {object} LogEntry
 * @property {number} [timestamp=Date.now()] Timestamp of the log event.
 * @property {string} actionType Type of action being logged.
 * @property {string} [adminName] Name of the admin performing the action.
 * @property {string} [targetName] Name of the player targeted.
 * @property {string} [targetId] ID of the target player.
 * @property {string} [checkType] AntiCheat check involved.
 * @property {string} [flagSeverity] Severity of the flag.
 * @property {object|string} [details] Additional details about the event.
 * @property {string} [context] Module where the log originated.
 * @property {Vector3} [location] Location of the event.
 * @property {string} [dimensionId] Dimension of the event.
 */

/**
 * @typedef {object} ReportEntry
 * @property {string} reportId Unique ID for the report.
 * @property {number} timestamp Timestamp when the report was filed.
 * @property {string} reporterName Name of the reporter.
 * @property {string} reporterId ID of the reporter.
 * @property {string} reportedPlayerName Name of the reported player.
 * @property {string} [reportedPlayerId] ID of the reported player.
 * @property {string} reason The reason for the report.
 * @property {string} status Current status of the report.
 * @property {string} [assignedAdmin] Admin handling the report.
 * @property {string} [resolutionDetails] Details on how the report was resolved.
 * @property {number} [lastUpdatedTimestamp] Timestamp of the last update.
 */

/**
 * @typedef {object} ActionProfile
 * @property {string} profileName Unique name for the profile.
 * @property {Array<object>} tiers Ordered list of action tiers based on flag count.
 */

/**
 * @typedef {object} AutoModRuleDef
 * @property {string} checkType The type of check this rule applies to.
 * @property {string} actionProfileName The name of the action profile to use.
 * @property {boolean} enabled Whether this rule is active.
 * @property {string} [description] Optional description of the rule.
 * @property {number} [resetFlagsAfterSeconds] Cooldown in seconds to reset flags for this check.
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id Unique identifier for the rank.
 * @property {string} name Display name of the rank.
 * @property {number} permissionLevel Numerical permission level.
 * @property {string} [chatPrefix=""] Chat prefix.
 * @property {string} [chatSuffix=""] Chat suffix.
 * @property {string} [nametagPrefix=""] Nametag prefix.
 * @property {string} [nametagSuffix=""] Nametag suffix.
 * @property {string} [defaultChatColor="§f"] Default chat color.
 * @property {Array<RankCondition>} conditions Conditions to obtain the rank.
 * @property {boolean} [isDefault=false] If this is the default rank.
 * @property {number} [assignableBy] Permission level required to assign/remove.
 */

/**
 * @typedef {object} Dependencies
 * @description The set of dependencies passed to most functions.
 * @property {ConfigEditable} config The current configuration settings.
 * @property {CheckActionProfiles} checkActionProfiles All defined action profiles.
 * @property {AutoModConfig} automodConfig The AutoMod rules.
 * @property {PlayerUtilsFull} playerUtils Player utility functions.
 * @property {PlayerDataManagerFull} playerDataManager Player data manager.
 * @property {LogManagerFull} logManager Log manager.
 * @property {ActionManagerFull} actionManager Action manager.
 * @property {UIManagerFull} uiManager UI manager.
 * @property {ReportManagerFull} reportManager Report manager.
 * @property {TpaManagerFull} tpaManager TPA manager.
 * @property {AllChecksFull} checks All check functions.
 * @property {typeof import('@minecraft/server')} mc The raw `@minecraft/server` module.
 * @property {number} currentTick The current game tick.
 * @property {object} permissionLevels Permission levels enum.
 * @property {typeof ActionFormData} ActionFormData ActionForm constructor.
 * @property {typeof MessageFormData} MessageFormData MessageForm constructor.
 * @property {typeof ModalFormData} ModalFormData ModalForm constructor.
 * @property {typeof ItemComponentTypes} ItemComponentTypes Item component types enum.
 * @property {ChatProcessorFull} chatProcessor Chat processor module.
 * @property {function(string, Record<string, string|number>?): string} getString Localization function.
 * @property {object} rankManager Rank manager functions.
 * @property {object} worldBorderManager World border manager functions.
 * @property {import('@minecraft/server').System} system The `system` object.
 * @property {object} commandManager Command manager functions.
 * @property {typeof import('./config.js')} editableConfig The full config module.
 */

// --- Action Profile Types (from actionProfiles.js) ---

/**
 * @typedef {object} ActionProfileFlag
 * @property {number} [increment=1] The amount to increment the flag count.
 * @property {string} reason Template for the flag reason.
 * @property {string} [type] Specific flag type key.
 */

/**
 * @typedef {object} ActionProfileNotify
 * @property {string} message Template for the admin notification message.
 */

/**
 * @typedef {object} ActionProfileLog
 * @property {string} [actionType] Specific actionType for logging.
 * @property {string} [detailsPrefix=''] Prefix for the log details.
 * @property {boolean} [includeViolationDetails=true] Whether to include violation details.
 */

/**
 * @typedef {object} ActionProfileEntry
 * @property {boolean} enabled Whether this action profile is active.
 * @property {ActionProfileFlag} [flag] Configuration for flagging the player.
 * @property {ActionProfileNotify} [notifyAdmins] Configuration for notifying admins.
 * @property {ActionProfileLog} [log] Configuration for logging the event.
 * @property {boolean} [cancelMessage] If true, cancels the chat message.
 * @property {string} [customAction] A custom action string for special handling.
 * @property {boolean} [cancelEvent] If true, cancels the underlying game event.
 */

// --- AutoMod Configuration Types (from automodConfig.js) ---

/**
 * @typedef {object} AutoModActionParameters
 * @property {string} [messageTemplate] Template for messages.
 * @property {string} [adminMessageTemplate] Optional template for admin notifications.
 * @property {string} [duration] Duration string for tempBan or mute.
 * @property {object} [coordinates] Coordinates for `teleportSafe` action.
 * @property {string} [itemToRemoveTypeId] Type ID of item to remove.
 */

/**
 * @typedef {object} AutoModTierRule
 * @property {number} flagThreshold The number of flags to trigger this rule.
 * @property {string} actionType The type of action to take.
 * @property {AutoModActionParameters} parameters Parameters for the action.
 * @property {boolean} resetFlagsAfterAction Whether to reset flags after this action.
 */

// --- Rank Configuration Types (from ranksConfig.js) ---

/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] The text part of the rank prefix.
 * @property {string} [prefixColor='§7'] The color code for the prefix text.
 * @property {string} [nameColor='§7'] The color code for the player's name.
 * @property {string} [messageColor='§f'] The color code for the player's chat message.
 */

/**
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'manualTagPrefix'|'tag'|'default')} type The type of condition.
 * @property {string} [prefix] The prefix for the rank tag (for 'manualTagPrefix').
 * @property {string} [tag] The specific tag to check for (for 'tag').
 */

// --- World Border System Types ---

/**
 * @typedef {object} WorldBorderSettings
 * @property {string} dimensionId The ID of the dimension.
 * @property {boolean} enabled Whether the border is active.
 * @property {'square'|'circle'} shape The shape of the border.
 * @property {number} centerX The X-coordinate of the center.
 * @property {number} centerZ The Z-coordinate of the center.
 * @property {number} [halfSize] For 'square' shape, half the side length.
 * @property {number} [radius] For 'circle' shape, the radius.
 * @property {boolean} [enableDamage=false] Whether players take damage outside.
 * @property {number} [damageAmount=0.5] Damage amount per interval.
 * @property {number} [damageIntervalTicks=20] Interval in ticks for damage.
 * @property {number} [teleportAfterNumDamageEvents=30] Damage events before teleport.
 * @property {string} [particleNameOverride] Particle name override for this dimension.
 * @property {boolean} [isResizing=false] If the border is currently resizing.
 * @property {number} [originalSize] The size before resizing.
 * @property {number} [targetSize] The target size for resizing.
 * @property {number} [resizeStartTimeMs] Timestamp when resize began.
 * @property {number} [resizeDurationMs] Total duration for resizing.
 * @property {boolean} [isPaused=false] If the resize is paused.
 * @property {number} [resizePausedTimeMs=0] Total accumulated pause time.
 * @property {number} [resizeLastPauseStartTimeMs] Timestamp when pause began.
 * @property {string} [resizeInterpolationType='linear'] Interpolation method for resizing.
 */

// --- Miscellaneous Generic Types ---

/**
 * @typedef {Object<string, any>} ViolationDetails
 * @description Generic type for `violationDetails` objects passed by checks.
 */

/**
 * @typedef {object} EventSpecificData
 * @description Generic type for event-specific data passed to checks.
 */

/**
 * @typedef {object} SoundOptions
 * @property {number} volume
 * @property {number} pitch
 */

/**
 * @typedef {object} UpdateConfigValueResult
 * @property {boolean} success Whether the update was successful.
 * @property {string} message A message describing the result.
 * @property {unknown} [oldValue] The old value.
 * @property {unknown} [newValue] The new value.
 */

/**
 * Custom error class for command-related errors.
 * @augments Error
 */
export class CommandError extends Error {
    /**
     * @param {string} message The error message.
     */
    constructor(message) {
        super(message);
        this.name = 'CommandError';
    }
}

/**
 * @ignore
 */
export {};
