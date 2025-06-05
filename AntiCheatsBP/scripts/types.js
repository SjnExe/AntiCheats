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
 */

// This line is important to make this file a module and allow JSDoc types to be imported.
export {};
