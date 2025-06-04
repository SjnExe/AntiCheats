import * as mc from '@minecraft/server';
import { isAdmin, warnPlayer, notifyAdmins, debugLog } from './playerUtils';
import { PREFIX, AC_VERSION } from './config'; // Import AC_VERSION
import { checkFly, checkSpeed, checkNoFall } from './movementChecks';
import { checkReach, checkCPS } from './combatChecks.js';
import { checkNuker, checkIllegalItems } from './worldChecks.js';

debugLog("Anti-Cheat Script Loaded. Initializing...");

const playerData = new Map();

// --- Event Subscriptions ---

mc.world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const message = eventData.message;

    if (message.startsWith(PREFIX)) {
        eventData.cancel = true;
        const args = message.substring(PREFIX.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();

        debugLog(`Player ${player.nameTag} issued command: ${command} with args: ${args.join(', ')}`);

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

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    const victim = eventData.hurtEntity;
    const cause = eventData.cause.category;
    const damagingEntity = eventData.cause.damagingEntity;

    if (victim.typeId === 'minecraft:player' && playerData.has(victim.id) && cause === mc.EntityDamageCauseCategory.Fall) {
        const pData = playerData.get(victim.id) as any; // Cast to any if needed for properties
        pData.isTakingFallDamage = true;
        debugLog(`Player ${pData.playerNameTag || victim.nameTag} took fall damage. Resetting fallDistance.`, pData.isWatched ? (pData.playerNameTag || victim.nameTag) : null);
        pData.fallDistance = 0;
    }

    if (damagingEntity && damagingEntity.typeId === 'minecraft:player') {
        const attacker = damagingEntity as mc.Player;
        const attackerData = playerData.get(attacker.id) as any;

        if (attackerData) {
            let gameMode = attacker.gameMode;
            if (typeof gameMode === 'undefined') { // Should not happen with a true Player object
                const worldPlayer = mc.world.getAllPlayers().find(p => p.id === attacker.id);
                if (worldPlayer) gameMode = worldPlayer.gameMode;
            }

            if (typeof gameMode !== 'undefined') {
                checkReach(attacker, victim, gameMode, attackerData);
            } else {
                debugLog(`Could not determine game mode for attacker ${attacker.nameTag} to perform reach check.`);
            }

            const now = Date.now();
            attackerData.attackEvents.push(now);
            attackerData.lastAttackTime = now;
        }
    }
});

mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    const player = eventData.player;
    const pData = playerData.get(player.id) as any;
    if (pData && pData.blockBreakEvents) {
        pData.blockBreakEvents.push(Date.now());
    }
});

mc.world.beforeEvents.itemUse.subscribe((eventData) => {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity as mc.Player;
        const itemStack = eventData.itemStack;
        const pData = playerData.get(player.id) as any;
        checkIllegalItems(player, itemStack, eventData, "use", pData);
    }
});

mc.world.beforeEvents.itemUseOn.subscribe((eventData) => {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity as mc.Player;
        const itemStack = eventData.itemStack;
        const pData = playerData.get(player.id) as any;
        checkIllegalItems(player, itemStack, eventData, "place", pData);
    }
});

let currentTick = 0;
mc.system.runInterval(() => {
    currentTick++;

    const activePlayerIds = new Set();
    for (const player of mc.world.getAllPlayers()) {
        activePlayerIds.add(player.id);
    }

    for (const playerId of playerData.keys()) {
        if (!activePlayerIds.has(playerId)) {
            const removedPData = playerData.get(playerId) as any;
            debugLog(`Removed data for player ${playerId} (left game).`, removedPData?.isWatched ? (removedPData.playerNameTag || playerId) : null);
            playerData.delete(playerId);
        }
    }

    for (const player of mc.world.getAllPlayers()) {
        if (!playerData.has(player.id)) {
            playerData.set(player.id, {
                playerNameTag: player.nameTag, // Store for logging if player object not available
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
            const newPData = playerData.get(player.id) as any;
            debugLog(`Initialized data.`, newPData.isWatched ? player.nameTag : null);
        }

        const pData = playerData.get(player.id) as any;
        if (!pData.playerNameTag) pData.playerNameTag = player.nameTag; // Ensure nameTag is in pData

        if (pData.isWatched && currentTick % 60 === 0) {
            debugLog(`Periodic pData check: OffGrnd=${pData.consecutiveOffGroundTicks}, FallD=${pData.fallDistance.toFixed(2)}, SpeedT=${pData.consecutiveOnGroundSpeedingTicks}, TotalFlags=${pData.flags.totalFlags}`, player.nameTag);
        }

        pData.previousVelocity = pData.velocity;
        pData.velocity = player.getVelocity();
        pData.previousPosition = pData.lastPosition;
        pData.lastPosition = player.location;

        checkFly(player, pData);
        checkSpeed(player, pData);
        checkNoFall(player, pData);
        checkCPS(player, pData);
        checkNuker(player, pData);

        if (player.isOnGround) {
            pData.consecutiveOffGroundTicks = 0;
            pData.lastOnGroundTick = currentTick;
            pData.lastOnGroundPosition = player.location;
            pData.fallDistance = 0;
            pData.isTakingFallDamage = false;
        } else {
            pData.consecutiveOffGroundTicks++;
            if (pData.velocity.y < -0.5 && pData.previousPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) {
                    pData.fallDistance += deltaY;
                }
            }
        }
    }
}, 1);

debugLog("Anti-Cheat Event Subscriptions Initialized.");
