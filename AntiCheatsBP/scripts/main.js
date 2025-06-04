import * as mc from '@minecraft/server';
import { isAdmin, warnPlayer, notifyAdmins, debugLog } from './playerUtils';
import { PREFIX, AC_VERSION } from './config';
import { checkFly, checkSpeed, checkNoFall } from './movementChecks';
import { checkReach, checkCPS } from './combatChecks.js';
import { checkNuker, checkIllegalItems } from './worldChecks.js';

debugLog("Anti-Cheat Script Loaded. Initializing...");

/**
 * @typedef {object} PlayerFlagData
 * @property {number} count - Number of times this specific check flagged.
 * @property {number} lastDetectionTime - Timestamp of the last detection for this check.
 */

/**
 * @typedef {object} PlayerAntiCheatData
 * @property {string} playerNameTag - The player's nameTag, stored for convenience in logging.
 * @property {mc.Vector3} lastPosition - Player's last known location.
 * @property {mc.Vector3} previousPosition - Player's position in the tick before lastPosition.
 * @property {mc.Vector3} velocity - Player's current velocity vector.
 * @property {mc.Vector3} previousVelocity - Player's velocity vector in the tick before current.
 * @property {number} consecutiveOffGroundTicks - How many consecutive ticks the player has been airborne.
 * @property {number} fallDistance - Accumulated fall distance since last on ground.
 * @property {number} lastOnGroundTick - The 'currentTick' value when the player was last on ground.
 * @property {mc.Vector3} lastOnGroundPosition - The player's location when they were last on ground.
 * @property {boolean} isTakingFallDamage - Flag set true if player took fall damage in current tick processing.
 * @property {number} consecutiveOnGroundSpeedingTicks - Counter for sustained on-ground speeding.
 * @property {number[]} attackEvents - Array of timestamps for recent attack actions (for CPS).
 * @property {number} lastAttackTime - Timestamp of the last recorded attack.
 * @property {number[]} blockBreakEvents - Array of timestamps for recent block break actions (for Nuker).
 * @property {object} flags - Object containing various flag counts.
 * @property {number} flags.totalFlags - Total number of flags accumulated by the player.
 * @property {PlayerFlagData} flags.fly - Fly check specific flag data.
 * @property {PlayerFlagData} flags.speed - Speed check specific flag data.
 * @property {PlayerFlagData} flags.nofall - NoFall check specific flag data.
 * @property {PlayerFlagData} flags.reach - Reach check specific flag data.
 * @property {PlayerFlagData} flags.cps - CPS check specific flag data.
 * @property {PlayerFlagData} flags.nuker - Nuker check specific flag data.
 * @property {PlayerFlagData} flags.illegalItem - Illegal item check specific flag data.
 * @property {string} lastFlagType - String identifier of the last check type that flagged (e.g., "fly", "speed").
 * @property {boolean} isWatched - True if an admin is actively watching this player for detailed logs.
 */

/**
 * Stores runtime data for each player being tracked by the anti-cheat system.
 * Key: Player ID (string)
 * Value: {@link PlayerAntiCheatData} Object containing player-specific data.
 * @type {Map<string, PlayerAntiCheatData>}
 */
const playerData = new Map();

// --- Event Subscriptions ---

/**
 * Handles commands sent by players via chat that start with the PREFIX.
 * Also manages admin command permissions.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat send event data.
 */
mc.world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const message = eventData.message;

    if (message.startsWith(PREFIX)) {
        eventData.cancel = true;
        const args = message.substring(PREFIX.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();

        debugLog(`Player ${player.nameTag} issued command: ${command} with args: ${args.join(', ')}`, playerData.get(player.id)?.isWatched ? player.nameTag : null);

        if (!isAdmin(player)) {
            warnPlayer(player, "You do not have permission to use Anti-Cheat commands.");
            return;
        }

        switch (command) {
            case "version":
                player.sendMessage(`§a[AntiCheat] Version: ${AC_VERSION}`);
                break;
            case "watch":
                if (args.length < 1) {
                    player.sendMessage("§cUsage: !ac watch <playername>");
                    return;
                }
                const targetPlayerName = args[0];
                let foundPlayer = null;
                for (const p of mc.world.getAllPlayers()) {
                    if (p.nameTag.toLowerCase() === targetPlayerName.toLowerCase()) {
                        foundPlayer = p;
                        break;
                    }
                }

                if (foundPlayer) {
                    const targetPData = playerData.get(foundPlayer.id);
                    if (targetPData) {
                        targetPData.isWatched = !targetPData.isWatched; // Toggle watch status
                        player.sendMessage(`§7Watch for ${foundPlayer.nameTag} ${targetPData.isWatched ? "§aenabled" : "§cdisabled"}.`);
                        notifyAdmins(`Watch for ${foundPlayer.nameTag} ${targetPData.isWatched ? "enabled" : "disabled"} by ${player.nameTag}.`, foundPlayer, targetPData);
                    } else {
                        player.sendMessage(`§cPlayer data for ${targetPlayerName} not found (they might need to move or interact).`);
                    }
                } else {
                    player.sendMessage(`§cPlayer ${targetPlayerName} not found.`);
                }
                break;
            case "testnotify":
                notifyAdmins("This is a test notification triggered by an admin command.");
                player.sendMessage("Test notification sent to admins.");
                break;
            case "myflags":
                const pDataSelf = playerData.get(player.id);
                if (pDataSelf && pDataSelf.flags) {
                    player.sendMessage(`Your current flags: Total=${pDataSelf.flags.totalFlags}. Last type: ${pDataSelf.lastFlagType || "None"}`);
                    for (const key in pDataSelf.flags) {
                        if (key !== "totalFlags" && typeof pDataSelf.flags[key] === 'object') {
                            player.sendMessage(` - ${key}: ${pDataSelf.flags[key].count} (Last: ${pDataSelf.flags[key].lastDetectionTime ? new Date(pDataSelf.flags[key].lastDetectionTime).toLocaleTimeString() : 'N/A'})`);
                        }
                    }
                } else {
                    player.sendMessage("No flag data found for you.");
                }
                break;
            default:
                player.sendMessage(`§cUnknown command: ${command}§r`);
        }
    }
});

/**
 * Handles entity hurt events, primarily for:
 * 1. Updating NoFall check data if a player takes fall damage.
 * 2. Triggering combat checks (Reach) if a player damages another entity.
 * 3. Recording attack events for CPS calculation.
 * @param {mc.EntityHurtAfterEvent} eventData - The entity hurt event data.
 */
mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    const victim = eventData.hurtEntity;
    const causeCategory = eventData.cause.category;
    const damagingEntity = eventData.cause.damagingEntity;

    // NoFall check related: if the victim is a player and took fall damage
    if (victim.typeId === 'minecraft:player' && playerData.has(victim.id) && causeCategory === mc.EntityDamageCauseCategory.Fall) {
        const pData = playerData.get(victim.id);
        if(pData) { // Ensure pData exists
            pData.isTakingFallDamage = true;
            debugLog(`Player ${pData.playerNameTag || victim.nameTag} took fall damage (${eventData.damage}). Resetting fallDistance.`, pData.isWatched ? (pData.playerNameTag || victim.nameTag) : null);
            pData.fallDistance = 0;
        }
    }

    // Combat checks: if the attacker is a player
    if (damagingEntity && damagingEntity.typeId === 'minecraft:player') {
        const attacker = damagingEntity as mc.Player; // Known to be a player
        const attackerData = playerData.get(attacker.id);

        if (attackerData) {
            let gameMode = attacker.gameMode;
            // The 'gameMode' property should exist on a Player object.
            // This fallback is overly cautious for well-behaved Player objects.
            if (typeof gameMode === 'undefined') {
                const worldPlayer = mc.world.getAllPlayers().find(p => p.id === attacker.id);
                if (worldPlayer) gameMode = worldPlayer.gameMode;
            }

            if (typeof gameMode !== 'undefined') {
                checkReach(attacker, victim, gameMode, attackerData);
            } else {
                debugLog(`Could not determine game mode for attacker ${attacker.nameTag} to perform reach check.`, attackerData.isWatched ? attacker.nameTag : null);
            }

            const now = Date.now();
            attackerData.attackEvents.push(now);
            attackerData.lastAttackTime = now;
        }
    }
});

/**
 * Handles block break events by players.
 * Records the timestamp of the break for Nuker detection.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData - The block break event data.
 */
mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    const player = eventData.player;
    const pData = playerData.get(player.id);
    if (pData && pData.blockBreakEvents) {
        pData.blockBreakEvents.push(Date.now());
    }
    // Future: checkIllegalItems for breaking specific blocks could be added here.
});

/**
 * Handles item use events (e.g., eating food, using a bow).
 * Triggers illegal item checks.
 * @param {mc.ItemUseBeforeEvent} eventData - The item use event data.
 */
mc.world.beforeEvents.itemUse.subscribe((eventData) => {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity as mc.Player;
        const itemStack = eventData.itemStack;
        const pData = playerData.get(player.id);
        checkIllegalItems(player, itemStack, eventData, "use", pData);
    }
});

/**
 * Handles item use on block events (e.g., placing a block, using an item on a block).
 * Triggers illegal item checks.
 * @param {mc.ItemUseOnBeforeEvent} eventData - The item use on block event data.
 */
mc.world.beforeEvents.itemUseOn.subscribe((eventData) => {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity as mc.Player;
        const itemStack = eventData.itemStack;
        const pData = playerData.get(player.id);
        checkIllegalItems(player, itemStack, eventData, "place", pData);
    }
});

let currentTick = 0;
/**
 * Main tick loop for the AntiCheat system. Runs every game tick (nominally 20 times per second).
 * Handles player data cleanup, initialization, per-tick updates, and calls all periodic checks.
 */
mc.system.runInterval(() => {
    currentTick++;

    // --- Player Data Cleanup ---
    // Remove data for players who have left the game.
    const activePlayerIds = new Set();
    for (const player of mc.world.getAllPlayers()) {
        activePlayerIds.add(player.id);
    }
    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId);
            // Try to use stored nameTag if available, otherwise just playerId for log context
            const logContextName = removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null;
            debugLog(`Removed data for player ${playerId} (left game).`, logContextName);
            playerData.delete(playerId);
        }
    }

    // --- Player Data Initialization & Per-Tick Updates ---
    for (const player of mc.world.getAllPlayers()) {
        if (!playerData.has(player.id)) {
            playerData.set(player.id, {
                playerNameTag: player.nameTag,
                lastPosition: player.location,
                previousPosition: player.location,
                velocity: player.getVelocity(),
                previousVelocity: { x: 0, y: 0, z: 0 },
                consecutiveOffGroundTicks: 0,
                fallDistance: 0,
                lastOnGroundTick: currentTick,
                lastOnGroundPosition: player.location,
                consecutiveOnGroundSpeedingTicks: 0,
                isTakingFallDamage: false,
                attackEvents: [],
                lastAttackTime: 0,
                blockBreakEvents: [],
                flags: {
                    totalFlags: 0,
                    fly: { count: 0, lastDetectionTime: 0 },
                    speed: { count: 0, lastDetectionTime: 0 },
                    nofall: { count: 0, lastDetectionTime: 0 },
                    reach: { count: 0, lastDetectionTime: 0 },
                    cps: { count: 0, lastDetectionTime: 0 },
                    nuker: { count: 0, lastDetectionTime: 0 },
                    illegalItem: { count: 0, lastDetectionTime: 0 }
                },
                lastFlagType: "",
                isWatched: false
            });
            // For newly initialized pData, isWatched will be false, so context will be null.
            debugLog(`Initialized data for ${player.nameTag}.`, null);
        }

        const pData = playerData.get(player.id);
        if (!pData.playerNameTag) pData.playerNameTag = player.nameTag; // Ensure nameTag is in pData

        // Log for watched player periodically
        if (pData.isWatched && currentTick % 60 === 0) { // Approx every 3 seconds
            debugLog(`Periodic pData: OffGrnd=${pData.consecutiveOffGroundTicks}, FallD=${pData.fallDistance.toFixed(2)}, SpeedT=${pData.consecutiveOnGroundSpeedingTicks}, TotalFlags=${pData.flags.totalFlags}`, player.nameTag);
        }

        // Update core positional and velocity data for this tick
        pData.previousVelocity = pData.velocity;
        pData.velocity = player.getVelocity();
        pData.previousPosition = pData.lastPosition;
        pData.lastPosition = player.location;

        // --- Call All Checks ---
        checkFly(player, pData);
        checkSpeed(player, pData);
        checkNoFall(player, pData);
        checkCPS(player, pData);
        checkNuker(player, pData);

        // --- Update State Based on Current Tick Ground Status (after checks) ---
        if (player.isOnGround) {
            pData.consecutiveOffGroundTicks = 0;
            pData.lastOnGroundTick = currentTick;
            pData.lastOnGroundPosition = player.location;
            pData.fallDistance = 0;
            pData.isTakingFallDamage = false; // Reset after NoFall check has used it for this landing
        } else { // Player is in the air
            pData.consecutiveOffGroundTicks++;
            // Accumulate fall distance
            if (pData.velocity.y < -0.5 && pData.previousPosition) { // Simplified: significant downward velocity
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) { // Ensure actual Y decrease
                    pData.fallDistance += deltaY;
                }
            }
        }
    }
}, 1); // Run every tick

debugLog("Anti-Cheat Event Subscriptions Initialized.");
