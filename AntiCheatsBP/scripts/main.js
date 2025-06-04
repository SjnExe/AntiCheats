import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui'; // Added UI imports
import { isAdmin, warnPlayer, notifyAdmins, debugLog, savePlayerDataToDynamicProperties, loadPlayerDataFromDynamicProperties } from './playerUtils';
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

// --- Helper function to prepare and save player data ---
/**
 * Prepares the subset of pData for persistence and calls the saving function.
 * @param {mc.Player} player The player whose data needs to be saved.
 */
async function prepareAndSavePlayerData(player) {
    if (!player) return;

    const pData = playerData.get(player.id);
    if (pData) {
        const persistedPData = {
            flags: pData.flags,
            isWatched: pData.isWatched,
            lastFlagType: pData.lastFlagType,
            playerNameTag: pData.playerNameTag,
            // Also persist fields that track state across sessions or are reset by resetflags
            attackEvents: pData.attackEvents,
            lastAttackTime: pData.lastAttackTime,
            blockBreakEvents: pData.blockBreakEvents,
            consecutiveOffGroundTicks: pData.consecutiveOffGroundTicks,
            fallDistance: pData.fallDistance,
            consecutiveOnGroundSpeedingTicks: pData.consecutiveOnGroundSpeedingTicks
            // lastPosition, previousPosition, velocity, previousVelocity, lastOnGroundTick,
            // lastOnGroundPosition, isTakingFallDamage are more transient or re-evaluated.
        };
        debugLog(`Preparing to save pData for ${player.nameTag}: Watched=${persistedPData.isWatched}, TotalFlags=${persistedPData.flags.totalFlags}, LastType=${persistedPData.lastFlagType}, COGTicks=${persistedPData.consecutiveOffGroundTicks}`, player.nameTag);
        const success = await savePlayerDataToDynamicProperties(player, persistedPData);
        if (success) {
            debugLog(`Successfully prepared and initiated save for ${player.nameTag}'s pData.`, player.nameTag);
        } else {
            debugLog(`Failed to save pData for ${player.nameTag}.`, player.nameTag);
        }
    } else {
        debugLog(`No pData found in runtime map for ${player.nameTag} during save attempt.`, player.nameTag);
    }
}

// --- UI Placeholder Functions ---
async function showInspectPlayerForm(player) {
    debugLog(`UI: Inspect Player form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Inspect Player Data");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");

    try {
        const response = await modalForm.show(player);

        if (response.canceled) {
            debugLog(`Inspect Player form canceled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }

        const targetPlayerName = response.formValues[0];

        if (!targetPlayerName || targetPlayerName.trim() === "") {
            player.sendMessage("§cPlayer name cannot be empty.");
            debugLog(`Inspect Player form submitted with empty name by ${player.nameTag}`, player.nameTag);
            return;
        }

        let inspectFoundPlayer = null;
        for (const p of mc.world.getAllPlayers()) {
            if (p.nameTag.toLowerCase() === targetPlayerName.trim().toLowerCase()) {
                inspectFoundPlayer = p;
                break;
            }
        }

        if (inspectFoundPlayer) {
            const targetPData = playerData.get(inspectFoundPlayer.id);
            if (targetPData) {
                let summary = `§a--- AntiCheat Data for ${inspectFoundPlayer.nameTag} ---\n`;
                summary += `§eWatched: §f${targetPData.isWatched}\n`;
                summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                summary += `§eLast Flag Type: §f${targetPData.lastFlagType || "None"}\n`;

                summary += `§eIndividual Flags:\n`;
                let hasFlags = false;
                for (const flagKey in targetPData.flags) {
                    if (flagKey !== "totalFlags" && typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                        const flagData = targetPData.flags[flagKey];
                        summary += `  §f- ${flagKey}: Count=${flagData.count}, LastSeen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                        hasFlags = true;
                    }
                }
                if (!hasFlags) {
                    summary += `  §fNo specific flags recorded.\n`;
                }
                // Consider adding more details from pData if useful, e.g., specific counters not in flags
                player.sendMessage(summary);
            } else {
                player.sendMessage(`§cPlayer data for ${targetPlayerName.trim()} not found (player may need to move or interact to initialize data).`);
            }
        } else {
            player.sendMessage(`§cPlayer '${targetPlayerName.trim()}' not found.`);
        }

    } catch (error) {
        debugLog(`Error showing/processing Inspect Player form: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening or processing Inspect Player form.");
    }
}

async function showResetFlagsForm(player) {
    debugLog(`UI: Reset Player Flags form requested by ${player.nameTag}`, player.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title("Reset Player Flags");
    modalForm.textField("Enter Player Name:", "TargetPlayerName");
    modalForm.toggle("CONFIRM: Reset all flags and violation data for this player?", false);

    try {
        const response = await modalForm.show(player);

        if (response.canceled) {
            debugLog(`Reset Player Flags form canceled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }

        const targetPlayerName = response.formValues[0];
        const confirmed = response.formValues[1];

        if (!targetPlayerName || targetPlayerName.trim() === "") {
            new MessageFormData().title("Input Error").body("Player name cannot be empty.").button1("OK").show(player);
            debugLog(`Reset Player Flags form submitted with empty name by ${player.nameTag}`, player.nameTag);
            return;
        }

        if (!confirmed) {
            player.sendMessage("§7Flag reset operation cancelled by user.");
            debugLog(`Reset Player Flags operation not confirmed by ${player.nameTag} for ${targetPlayerName.trim()}`, player.nameTag);
            return;
        }

        let resetFoundPlayer = null;
        for (const p of mc.world.getAllPlayers()) {
            if (p.nameTag.toLowerCase() === targetPlayerName.trim().toLowerCase()) {
                resetFoundPlayer = p;
                break;
            }
        }

        if (resetFoundPlayer) {
            const targetPData = playerData.get(resetFoundPlayer.id);
            if (targetPData) {
                // Actual flag reset logic (mirrors the !ac resetflags command)
                targetPData.flags.totalFlags = 0;
                targetPData.lastFlagType = "";
                for (const flagKey in targetPData.flags) {
                    if (typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                        targetPData.flags[flagKey].count = 0;
                        targetPData.flags[flagKey].lastDetectionTime = 0;
                    }
                }
                targetPData.consecutiveOffGroundTicks = 0;
                targetPData.fallDistance = 0;
                targetPData.consecutiveOnGroundSpeedingTicks = 0;
                targetPData.attackEvents = [];
                targetPData.blockBreakEvents = [];

                await prepareAndSavePlayerData(resetFoundPlayer);

                new MessageFormData().title("Success").body(`Flags and violation data reset for ${resetFoundPlayer.nameTag}.`).button1("OK").show(player);
                notifyAdmins(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag} via UI.`, resetFoundPlayer, targetPData);
                debugLog(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag} via UI.`, targetPData.isWatched ? resetFoundPlayer.nameTag : null);
            } else {
                new MessageFormData().title("Error").body(`Player data for '${targetPlayerName.trim()}' not found (player may need to move or interact).`).button1("OK").show(player);
            }
        } else {
            new MessageFormData().title("Error").body(`Player '${targetPlayerName.trim()}' not found.`).button1("OK").show(player);
        }

    } catch (error) {
        debugLog(`Error showing/processing Reset Player Flags form: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening or processing Reset Player Flags form.");
    }
}

async function showWatchedPlayersList(player) {
    debugLog(`UI: List Watched Players requested by ${player.nameTag}`, player.nameTag);
    const watchedPlayerNames = [];

    for (const pDataEntry of playerData.values()) {
        if (pDataEntry.isWatched === true && pDataEntry.playerNameTag) {
            watchedPlayerNames.push(pDataEntry.playerNameTag);
        }
    }

    let messageBody;
    if (watchedPlayerNames.length > 0) {
        messageBody = "Currently watched players:\n- " + watchedPlayerNames.join("\n- ");
    } else {
        messageBody = "No players are currently being watched.";
    }

    const resultForm = new MessageFormData();
    resultForm.title("Watched Players List");
    resultForm.body(messageBody);
    resultForm.button1("OK");

    try {
        await resultForm.show(player);
        // No specific action needed after 'OK' is pressed for a MessageFormData with one button.
    } catch (error) {
        debugLog(`Error showing Watched Players List form: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening Watched Players List form.");
    }
}


// --- Admin UI Main Menu ---
/**
 * Shows the main admin menu UI to the player.
 * @param {mc.Player} player The player to show the form to.
 */
async function showAdminMainMenu(player) {
    const menuForm = new ActionFormData()
        .title("AntiCheat Admin Menu")
        .body("Select an action:")
        .button("Inspect Player Data", "textures/ui/spyglass")
        .button("Reset Player Flags", "textures/ui/refresh")
        .button("List Watched Players", "textures/ui/magnifying_glass");

    try {
        const response = await menuForm.show(player);

        if (response.canceled) {
            debugLog(`Admin menu canceled by ${player.nameTag}. Reason: ${response.cancelationReason}`, player.nameTag);
            return;
        }

        switch (response.selection) {
            case 0: // Inspect Player Data
                showInspectPlayerForm(player);
                break;
            case 1: // Reset Player Flags
                showResetFlagsForm(player);
                break;
            case 2: // List Watched Players
                showWatchedPlayersList(player);
                break;
            default:
                player.sendMessage("§cInvalid selection.");
                break;
        }
    } catch (error) {
        debugLog(`Error showing admin main menu: ${error}`, player.nameTag);
        console.error(error, error.stack);
        player.sendMessage("§cError opening AntiCheat Admin Menu.");
    }
}

/**
 * Initializes a new PlayerAntiCheatData object with default values.
 * @param {mc.Player} player The player for whom to initialize data.
 * @returns {PlayerAntiCheatData} A new pData object.
 */
function initializeDefaultPlayerData(player) {
    return {
        playerNameTag: player.nameTag,
        lastPosition: player.location,
        previousPosition: player.location,
        velocity: player.getVelocity(),
        previousVelocity: { x: 0, y: 0, z: 0 },
        consecutiveOffGroundTicks: 0,
        fallDistance: 0,
        lastOnGroundTick: currentTick, // currentTick is globally available in main.js
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
    };
}


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
                        prepareAndSavePlayerData(foundPlayer); // Save data after modification
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
            case "inspect":
                if (args.length < 1) {
                    player.sendMessage("§cUsage: !ac inspect <playername>");
                    return;
                }
                const inspectTargetName = args[0];
                let inspectFoundPlayer = null;
                for (const p of mc.world.getAllPlayers()) {
                    if (p.nameTag.toLowerCase() === inspectTargetName.toLowerCase()) {
                        inspectFoundPlayer = p;
                        break;
                    }
                }

                if (inspectFoundPlayer) {
                    const targetPData = playerData.get(inspectFoundPlayer.id);
                    if (targetPData) {
                        let summary = `§a--- AntiCheat Data for ${inspectFoundPlayer.nameTag} ---\n`;
                        summary += `§eWatched: §f${targetPData.isWatched}\n`;
                        summary += `§eTotal Flags: §f${targetPData.flags.totalFlags}\n`;
                        summary += `§eLast Flag Type: §f${targetPData.lastFlagType || "None"}\n`;

                        summary += `§eIndividual Flags:\n`;
                        let hasFlags = false;
                        for (const flagKey in targetPData.flags) {
                            if (flagKey !== "totalFlags" && typeof targetPData.flags[flagKey] === 'object') {
                                const flagData = targetPData.flags[flagKey];
                                summary += `  §f- ${flagKey}: Count=${flagData.count}, LastSeen=${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'}\n`;
                                hasFlags = true;
                            }
                        }
                        if (!hasFlags) {
                            summary += `  §fNo specific flags recorded.\n`;
                        }

                        // You can add more pData fields here if needed, for example:
                        // summary += `§eConsecutive OffGround Ticks: §f${targetPData.consecutiveOffGroundTicks}\n`;
                        // summary += `§eFall Distance: §f${targetPData.fallDistance?.toFixed(2)}\n`;
                        // summary += `§eLast OnGround Tick: §f${targetPData.lastOnGroundTick}\n`;

                        player.sendMessage(summary);
                    } else {
                        player.sendMessage(`§cPlayer data for ${inspectTargetName} not found (player may need to move or interact to initialize data).`);
                    }
                } else {
                    player.sendMessage(`§cPlayer ${inspectTargetName} not found.`);
                }
                break;
            case "resetflags":
                if (args.length < 1) {
                    player.sendMessage("§cUsage: !ac resetflags <playername>");
                    return;
                }
                const resetTargetName = args[0];
                let resetFoundPlayer = null;
                for (const p of mc.world.getAllPlayers()) {
                    if (p.nameTag.toLowerCase() === resetTargetName.toLowerCase()) {
                        resetFoundPlayer = p;
                        break;
                    }
                }

                if (resetFoundPlayer) {
                    const targetPData = playerData.get(resetFoundPlayer.id);
                    if (targetPData) {
                        // Reset general flag indicators
                        targetPData.flags.totalFlags = 0;
                        targetPData.lastFlagType = "";

                        // Reset individual flag counts and timestamps
                        for (const flagKey in targetPData.flags) {
                            if (typeof targetPData.flags[flagKey] === 'object' && targetPData.flags[flagKey] !== null) {
                                targetPData.flags[flagKey].count = 0;
                                targetPData.flags[flagKey].lastDetectionTime = 0;
                            }
                        }

                        // Reset other relevant pData fields
                        targetPData.consecutiveOffGroundTicks = 0;
                        targetPData.fallDistance = 0;
                        targetPData.consecutiveOnGroundSpeedingTicks = 0;
                        targetPData.attackEvents = []; // Clear CPS tracking
                        targetPData.blockBreakEvents = []; // Clear Nuker tracking
                        // targetPData.isTakingFallDamage is transient, should be fine

                        player.sendMessage(`§aFlags and violation data reset for ${resetFoundPlayer.nameTag}.`);
                        notifyAdmins(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag}.`, resetFoundPlayer, targetPData);
                        debugLog(`Flags reset for ${resetFoundPlayer.nameTag} by ${player.nameTag}.`, targetPData.isWatched ? resetFoundPlayer.nameTag : null);
                        prepareAndSavePlayerData(resetFoundPlayer); // Save data after modification
                    } else {
                        player.sendMessage(`§cPlayer data for ${resetTargetName} not found (player may need to move or interact to initialize data).`);
                    }
                } else {
                    player.sendMessage(`§cPlayer ${resetTargetName} not found.`);
                }
                break;
            case "ui":
                showAdminMainMenu(player);
                break;
            default:
                player.sendMessage(`§cUnknown command: ${command}§r`);
        }
    }
});

/**
 * Handles player leave events to save their anti-cheat data.
 * @param {mc.PlayerLeaveBeforeEvent} eventData - The player leave event data.
 */
mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    const player = eventData.player;
    debugLog(`Player ${player.nameTag} is leaving. Attempting to save pData.`, player.nameTag);
    prepareAndSavePlayerData(player);
    // No await needed here if we don't need to block player leave,
    // but prepareAndSavePlayerData is async, so it will run.
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
            // Player not in runtime map, try to load or initialize
            (async () => {
                const loadedData = await loadPlayerDataFromDynamicProperties(player);
                let newPData = initializeDefaultPlayerData(player); // Always get a fresh default structure

                if (loadedData) {
                    debugLog(`Loaded persisted data for ${player.nameTag}. Merging...`, player.nameTag);
                    // Merge loaded data into the default structure
                    newPData.flags = loadedData.flags || newPData.flags;
                    newPData.isWatched = typeof loadedData.isWatched === 'boolean' ? loadedData.isWatched : newPData.isWatched;
                    newPData.lastFlagType = loadedData.lastFlagType || newPData.lastFlagType;
                    // Note: playerNameTag is already set by initializeDefaultPlayerData using current player.nameTag

                    // Merge other persisted fields
                    newPData.attackEvents = loadedData.attackEvents || []; // Ensure array type
                    newPData.lastAttackTime = loadedData.lastAttackTime || 0;
                    newPData.blockBreakEvents = loadedData.blockBreakEvents || []; // Ensure array type
                    newPData.consecutiveOffGroundTicks = loadedData.consecutiveOffGroundTicks || 0;
                    newPData.fallDistance = loadedData.fallDistance || 0;
                    newPData.consecutiveOnGroundSpeedingTicks = loadedData.consecutiveOnGroundSpeedingTicks || 0;

                } else {
                    debugLog(`No persisted data found for ${player.nameTag}. Initializing fresh runtime data.`, player.nameTag);
                }
                playerData.set(player.id, newPData);
                debugLog(`Initialized runtime data for ${player.nameTag}. Watched: ${newPData.isWatched}, Flags: ${newPData.flags.totalFlags}`, player.nameTag);
            })();
        }

        const pData = playerData.get(player.id);
        if (!pData) {
            // Data might not be set yet if the async load/init above hasn't completed.
            // Checks below should be robust to pData not existing immediately.
            // Alternatively, could await the async block, but that might delay the tick loop.
            // For now, subsequent operations in this tick for this player might not use full pData.
            // This should resolve by the next tick.
            continue;
        }

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
