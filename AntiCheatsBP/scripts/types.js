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
 * @property {object} config - The system configuration object (from config.js).
 * @property {object} playerUtils - Utility functions for player interactions.
 * @property {function(import('@minecraft/server').Player, string, string, object, function): Promise<void>} [playerUtils.setPlayerGameMode] - Sets a player's gamemode.
 * @property {function(string, import('@minecraft/server').Player, string | null): void} [playerUtils.notifyAdmins] - Notifies admin players.
 * @property {function(string, string | null ): void} [playerUtils.debugLog] - Logs a debug message.
 * @property {function(string, object): (import('@minecraft/server').Player | undefined)} [playerUtils.findPlayer] - Finds a player.
 * @property {function(string): (number | null)} [playerUtils.parseDuration] - Parses a duration string.
 * @property {object} [playerDataManager] - Manages player-specific anti-cheat data.
 * @property {function(object): void} [addLog] - Function to add an entry to the admin action log (from logManager).
 * @property {function(string, object): (import('@minecraft/server').Player | undefined)} [findPlayer] - Utility function to find a player (often a reference to playerUtils.findPlayer).
 * @property {function(string): (number | null)} [parseDuration] - Utility function to parse duration strings (often a reference to playerUtils.parseDuration).
 * @property {function(import('@minecraft/server').Player): number} [getPlayerPermissionLevel] - Function to get a player's permission level (from rankManager).
 * @property {CommandDefinition[]} [allCommands] - Array of all command definitions, used by help command.
 * @property {object} [uiManager] - Manages UI forms.
 * @property {object} [commandModules] - Reference to all command modules for transitive command execution.
 * @property {object} [logManager] - Manages logging.
 * @property {object} [reportManager] - Manages player reports.
 */

/**
 * Represents a command module.
 * @typedef {object} CommandModule
 * @property {CommandDefinition} definition - The command's definition.
 * @property {function(import('@minecraft/server').Player, string[], CommandDependencies): Promise<void>} execute - The function to run when the command is called.
 */

/**
 * @typedef {object} Vector3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {object} PlayerFlagDetail
 * @property {number} count - The number of times this specific flag has been triggered.
 * @property {number} lastDetectionTime - Timestamp of the last detection for this flag.
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
 * // Add other specific flags here as they are defined, e.g., killaura, aimbot, scaffold
 */

/**
 * @typedef {object} PlayerAntiCheatData
 * @property {string} playerNameTag - The player's name tag.
 * @property {Vector3} lastPosition - The player's last known position.
 * @property {Vector3} previousPosition - The player's position in the previous tick.
 * @property {Vector3} velocity - The player's current velocity.
 * @property {Vector3} previousVelocity - The player's velocity in the previous tick.
 * @property {number} consecutiveOffGroundTicks - Number of consecutive ticks the player has been off the ground.
 * @property {number} fallDistance - Accumulated fall distance.
 * @property {number} lastOnGroundTick - The game tick when the player was last on the ground.
 * @property {Vector3} lastOnGroundPosition - The player's position when last on the ground.
 * @property {number} consecutiveOnGroundSpeedingTicks - Number of consecutive ticks the player has been speeding while on ground.
 * @property {boolean} isTakingFallDamage - Whether the player is currently taking fall damage.
 * @property {number[]} attackEvents - Timestamps of recent attack events.
 * @property {number} lastAttackTime - Timestamp of the last attack.
 * @property {number[]} blockBreakEvents - Timestamps of recent block break events.
 * @property {Array<{timestamp: number, content: string}>} recentMessages - Stores recent messages for spam detection.
 * @property {PlayerFlagData} flags - Container for all specific cheat flags and their counts.
 * @property {string} lastFlagType - The type of the last flag triggered.
 * @property {boolean} isWatched - Whether the player is currently being watched by admins.
 * @property {number} lastPitch - Player's camera pitch (rotation.x) in the last tick (session-only).
 * @property {number} lastYaw - Player's camera yaw (rotation.y) in the last tick (session-only).
 * @property {number} lastAttackTick - The game tick of the last attack action (session-only).
 * @property {any[]} recentHits - Array of recent hit targets or related data (session-only).
 * @property {boolean} isUsingConsumable - True if the player is currently using a consumable item (e.g., food, potion). Session-only. */
        isUsingConsumable: boolean;
        /** @property {boolean} isChargingBow - True if the player is currently charging a bow. Session-only. */
        isChargingBow: boolean;
        /** @property {boolean} isUsingShield - True if the player is currently actively using a shield. Session-only. */
        isUsingShield: boolean;
        /** @property {number} lastItemUseTick - The game tick when the player last initiated an item use action relevant to state conflicts. Session-only. */
        lastItemUseTick: number;
        /** @property {Array<{x: number, y: number, z: number, pitch: number, yaw: number, tick: number}>} recentBlockPlacements - Records recent block placements by the player for scaffold/tower detection. Session-only. */
        recentBlockPlacements: Array<{x: number, y: number, z: number, pitch: number, yaw: number, tick: number}>;
        /** @property {number} lastPillarBaseY - Y-coordinate of the base of the current pillar being built. Session-only. */
        lastPillarBaseY: number;
        /** @property {number} consecutivePillarBlocks - Number of consecutive blocks placed in the current pillar. Session-only. */
        consecutivePillarBlocks: number;
        /** @property {number} lastPillarTick - Game tick of the last block placed in the current pillar. Session-only. */
        lastPillarTick: number;
        /** @property {number | null} currentPillarX - X-coordinate of the current pillar being tracked. Session-only. */
        currentPillarX: number | null;
        /** @property {number | null} currentPillarZ - Z-coordinate of the current pillar being tracked. Session-only. */
        currentPillarZ: number | null;
        /** @property {number} consecutiveDownwardBlocks - Number of consecutive blocks placed downwards while airborne. Session-only. */
        consecutiveDownwardBlocks: number;
        /** @property {number} lastDownwardScaffoldTick - Game tick of the last block placed in a downward scaffold sequence. Session-only. */
        lastDownwardScaffoldTick: number;
        /** @property {{x: number, y: number, z: number} | null} lastDownwardScaffoldBlockLocation - Location of the last block placed in a downward scaffold sequence. Session-only. */
        lastDownwardScaffoldBlockLocation: {x: number, y: number, z: number} | null;
        /** @property {Record<string, number>} itemUseTimestamps - Stores the last use timestamp for specific items, for FastUse detection. Key: itemTypeId, Value: timestamp. Session-only. */
        itemUseTimestamps: Record<string, number>;
        /** @property {number[]} recentPlaceTimestamps - Stores timestamps of recent block placements for FastPlace detection. Session-only. */
        recentPlaceTimestamps: number[];
        /** @property {number} lastJumpBoostLevel - Last known Jump Boost effect level on the player. Session-only. */
        lastJumpBoostLevel: number;
        /** @property {number} lastSlowFallingTicks - Remaining ticks of Slow Falling effect. Session-only. */
        lastSlowFallingTicks: number;
        /** @property {number} lastLevitationTicks - Remaining ticks of Levitation effect. Session-only. */
        lastLevitationTicks: number;
        /** @property {number} lastTookDamageTick - Game tick when player last took damage (for knockback grace). Session-only. */
        lastTookDamageTick: number;
        /** @property {number} lastUsedElytraTick - Game tick when player last used elytra. Session-only. */
        lastUsedElytraTick: number;
        /** @property {number} lastUsedRiptideTick - Game tick when player last used riptide trident. Session-only. */
        lastUsedRiptideTick: number;
        /** @property {number} lastOnSlimeBlockTick - Game tick when player was last on a slime block. Session-only. */
        lastOnSlimeBlockTick: number;
        /** @property {number} lastBlindnessTicks - Remaining ticks of Blindness effect. Session-only. */
        lastBlindnessTicks: number;
        /** @property {number} previousSelectedSlotIndex - The player's selected hotbar slot in the previous tick. Session-only. */
        previousSelectedSlotIndex: number;
        /** @property {number} lastSelectedSlotChangeTick - Game tick when the selected slot last changed. Session-only. */
        lastSelectedSlotChangeTick: number;

        // AutoTool specific fields
        /** @property {boolean} isAttemptingBlockBreak - True if a PlayerBreakBlockBeforeEvent was recently caught. Session-only. */
        isAttemptingBlockBreak: boolean;
        /** @property {string | null} breakingBlockTypeId - Type ID of the block for the current break attempt. Session-only. */
        breakingBlockTypeId: string | null;
        /** @property {number} slotAtBreakAttemptStart - Selected slot when PlayerBreakBlockBeforeEvent fired. Session-only. */
        slotAtBreakAttemptStart: number;
        /** @property {number} breakAttemptTick - Game tick of the PlayerBreakBlockBeforeEvent. Session-only. */
        breakAttemptTick: number;
        /** @property {boolean} switchedToOptimalToolForBreak - Flag indicating player switched to an optimal tool just before/during break. Session-only. */
        switchedToOptimalToolForBreak: boolean;
        /** @property {number | null} optimalToolSlotForLastBreak - Slot index of the tool used for the last confirmed break if a switch occurred. Session-only. */
        optimalToolSlotForLastBreak: number | null;
        /** @property {number} lastBreakCompleteTick - Game tick when a block break was completed (after potentially switching to optimal). Session-only. */
        lastBreakCompleteTick: number;
 * @property {{typeId: string, amplifier: number, duration: number}[]} activeEffects - Player's active potion effects.
 * @property {number} health - Player's current health.
 * @property {string} lastBrokenBlockType - Type ID of the last block broken by the player.
 * @property {{muteExpires?: number, muteReason?: string}} [muteInfo] - Information about player's mute status.
 * @property {{banExpires?: number, banReason?: string}} [banInfo] - Information about player's ban status.
 */

// This line is important to make this file a module and allow JSDoc types to be imported.
export {};
