/**
 * @file AntiCheatsBP/scripts/core/eventHandlers.js
 * Centralized handlers for various Minecraft Server API events. These handlers typically
 * gather necessary data and then delegate to specific check functions or managers.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { getPlayerRankDisplay, updatePlayerNametag, permissionLevels } from './rankManager.js'; // Added permissionLevels
import { getExpectedBreakTicks, isNetherLocked, isEndLocked } from '../utils/index.js'; // Added isNetherLocked, isEndLocked
// Assuming checks are imported from a barrel file, specific imports aren't strictly necessary here if using the 'checks' object.
// import { checkMessageRate, checkMessageWordCount } from '../checks/index.js';

/**
 * Handles player leave events. Saves player data and checks for combat logging.
 * @param {mc.PlayerLeaveBeforeEvent} eventData - The data associated with the player leave event.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data operations.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {function} addLog - Function from logManager to add logs.
 */
export async function handlePlayerLeave(eventData, playerDataManager, playerUtils, config, addLog) {
    const { player } = eventData;
    if (!player) {
        console.warn("[AntiCheat] handlePlayerLeave: Player undefined in eventData.");
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Processing data...`, player.nameTag);

    if (playerDataManager.saveDirtyPlayerData) {
        try {
            await playerDataManager.saveDirtyPlayerData(player);
            playerUtils.debugLog(`Data saved for ${player.nameTag} on leave via saveDirtyPlayerData.`, player.nameTag);
        } catch (error) {
            console.error(`[AntiCheat] Error in saveDirtyPlayerData for ${player.nameTag} on leave: ${error}`);
            // Optionally, log to logManager if available:
            // if (addLog) addLog('error', `SaveOnLeaveFail (dirty): ${player.nameTag}, ${error}`);
        }
    } else {
        playerUtils.debugLog(`AntiCheat: playerDataManager.saveDirtyPlayerData is not available in handlePlayerLeave. Skipping explicit save.`, player.nameTag);
    }

    const pData = playerDataManager.getPlayerData(player.id);

    if (pData && config.enableCombatLogDetection && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (config.combatLogThresholdSeconds || 15) * 1000;

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const flagType = 'combat_log';
            const incrementAmount = config.combatLogFlagIncrement || 1;
            const baseFlagReason = (config.combatLogReason || `Disconnected {timeSinceCombat}s after combat.`)
                .replace('{timeSinceCombat}', timeSinceLastCombatSeconds);

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${config.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, player.nameTag);

            for (let i = 0; i < incrementAmount; i++) {
                playerDataManager.addFlag(player, flagType, baseFlagReason, `(#${i + 1}/${incrementAmount})`);
            }

            const notifyMessage = (config.combatLogMessage || `§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.`)
                .replace('{playerName}', player.nameTag)
                .replace('{timeSinceCombat}', timeSinceLastCombatSeconds)
                .replace('{incrementAmount}', incrementAmount.toString());
            playerUtils.notifyAdmins(notifyMessage, player, pData);

            if (addLog) {
                addLog({
                    adminName: 'System',
                    actionType: 'combat_log_detected',
                    targetName: player.nameTag,
                    details: `Disconnected ${timeSinceLastCombatSeconds}s after PvP. Last interaction at ${new Date(pData.lastCombatInteractionTime).toISOString()}. Flagged +${incrementAmount}.`,
                    reason: baseFlagReason
                });
            }
        }
    }
    // Ensure all data is attempted to be saved, regardless of dirty flag, as player is leaving.
    await playerDataManager.prepareAndSavePlayerData(player);
    playerUtils.debugLog(`Final data persistence attempted for ${player.nameTag} on leave.`, player.nameTag);
}

/**
 * Handles player spawn events. Checks for active bans and updates nametags.
 * @param {mc.PlayerSpawnAfterEvent} eventData - The player spawn event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {object} dependencies - Additional dependencies, expected to include `addLog`.
 */
export function handlePlayerSpawn(eventData, playerDataManager, playerUtils, config, dependencies) {
    const { player, initialSpawn } = eventData; // initialSpawn can be useful
    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} spawned. Initial spawn: ${initialSpawn}.`, player.nameTag);

    try {
        const banInfo = playerDataManager.getBanInfo(player);
        if (banInfo) {
            const kickReason = `You are banned from this server.\nReason: ${banInfo.reason}\n${banInfo.unbanTime === Infinity ? "This ban is permanent." : `Expires: ${new Date(banInfo.unbanTime).toLocaleString()}`}`;
            player.kick(kickReason);
            playerUtils.debugLog(`Player ${player.nameTag} kicked due to active ban.`, player.nameTag);
            return;
        }
        updatePlayerNametag(player); // Assuming this function handles ranks/prefixes
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, player.nameTag);

        // Welcomer message logic
        if (initialSpawn && config.enableWelcomerMessage) {
            let message = config.welcomeMessage || "Welcome, {playerName}, to the server!";
            message = message.replace(/{playerName}/g, player.nameTag);

            // Send the message after a short delay
            mc.system.runTimeout(() => {
                player.sendMessage(message);
            }, 20); // 1 second delay (20 ticks)

            if (dependencies && dependencies.addLog) {
                dependencies.addLog({
                    timestamp: Date.now(),
                    actionType: 'player_initial_join',
                    targetName: player.nameTag,
                    details: `Player ${player.nameTag} joined for the first time. Welcome message sent.`
                });
            }

            if (playerUtils?.notifyAdmins && config.notifyAdminOnNewPlayerJoin) {
                playerUtils.notifyAdmins(`§eNew player ${player.nameTag} has joined the server for the first time!`, null, null);
            }
        }

    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player.nameTag}: ${error.stack || error}`);
        playerUtils.debugLog(`Error in handlePlayerSpawn for ${player.nameTag}: ${error}`, player.nameTag);
    }
}

/**
 * Handles entity hurt events to track player damage, fall damage, and trigger combat-related checks.
 * @param {mc.EntityHurtAfterEvent} eventData - The entity hurt event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {number} currentTick - The current game tick from the main tick loop.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 */
export async function handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config, currentTick, logManager, executeCheckAction) {
    const { hurtEntity, cause, damagingEntity } = eventData;

    if (hurtEntity?.typeId === 'minecraft:player') {
        const victim = hurtEntity; // Player who was hurt
        const pData = playerDataManager.getPlayerData(victim.id);
        if (pData) {
            pData.lastTookDamageTick = currentTick;
            if (cause.category === mc.EntityDamageCauseCategory.fall) {
                pData.isTakingFallDamage = true; // This helps NoFall check to correctly attribute fall distance reset
                playerUtils.debugLog(`Player ${pData.playerNameTag || victim.nameTag} took fall damage (${eventData.damage}). LastTookDamageTick updated.`, pData.isWatched ? (pData.playerNameTag || victim.nameTag) : null);
            } else {
                playerUtils.debugLog(`Player ${pData.playerNameTag || victim.nameTag} took ${eventData.damage} damage from ${cause.category}. LastTookDamageTick updated.`, pData.isWatched ? (pData.playerNameTag || victim.nameTag) : null);
            }

            if (checks.checkSelfHurt && config.enableSelfHurtCheck) {
                await checks.checkSelfHurt(victim, cause, damagingEntity, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
            }
        }
    }

    if (damagingEntity?.typeId === 'minecraft:player') {
        const attacker = damagingEntity; // Player who caused the damage
        const attackerPData = playerDataManager.getPlayerData(attacker.id);

        if (attackerPData) {
            const now = Date.now();
            attackerPData.attackEvents = attackerPData.attackEvents || [];
            attackerPData.attackEvents.push(now);
            attackerPData.lastAttackTime = now;
            attackerPData.lastAttackTick = currentTick;
            attackerPData.isDirtyForSave = true; // Mark as dirty due to combat interaction

            const commonArgs = [attacker, attackerPData, config, playerUtils, playerDataManager, logManager, executeCheckAction];

            if (checks.checkReach && config.enableReachCheck) {
                // attacker.gameMode should ideally be available directly.
                // The fallback using world.getAllPlayers().find() is a heavier operation.
                const gameMode = attacker.gameMode ?? mc.world.getAllPlayers().find(p => p.id === attacker.id)?.gameMode;
                if (gameMode !== undefined) {
                    await checks.checkReach(attacker, hurtEntity, gameMode, attackerPData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
                } else {
                    playerUtils.debugLog(`Could not determine game mode for attacker ${attacker.nameTag} to perform reach check.`, attackerPData.isWatched ? attacker.nameTag : null);
                }
            }
            if (checks.checkMultiTarget && config.enableMultiTargetCheck) {
                await checks.checkMultiTarget(attacker, attackerPData, hurtEntity, config, playerUtils, playerDataManager, logManager, executeCheckAction);
            }
            if (checks.checkAttackWhileSleeping && config.enableStateConflictCheck) {
                await checks.checkAttackWhileSleeping(...commonArgs);
            }
            if (checks.checkAttackWhileUsingItem && config.enableStateConflictCheck) {
                await checks.checkAttackWhileUsingItem(...commonArgs);
            }
        }
    }
}

/**
 * Subscribes to entity hurt events specifically for combat log detection if enabled in config.
 * This updates `lastCombatInteractionTime` for players involved in PvP.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 */
export function subscribeToCombatLogEvents(playerDataManager, config, playerUtils) {
    if (!config.enableCombatLogDetection) return;

    mc.world.afterEvents.entityHurt.subscribe(async (eventData) => {
        const { hurtEntity, damageSource } = eventData;

        if (hurtEntity?.typeId === 'minecraft:player') {
            const victim = hurtEntity;
            const damagingEntity = damageSource.damagingEntity;

            if (damagingEntity?.typeId === 'minecraft:player' && damagingEntity.id !== victim.id) {
                const attacker = damagingEntity;
                const currentTime = Date.now();
                const currentTick = mc.system.currentTick; // Needed for ensurePlayerDataInitialized

                // Update for victim
                const victimPData = await playerDataManager.ensurePlayerDataInitialized(victim, currentTick);
                victimPData.lastCombatInteractionTime = currentTime;
                victimPData.isDirtyForSave = true;
                if (playerUtils.debugLog && victimPData.isWatched) playerUtils.debugLog(`CombatLog: Updated lastCombatTime for victim ${victim.nameTag} to ${currentTime}`, victim.nameTag);

                // Update for attacker
                const attackerPData = await playerDataManager.ensurePlayerDataInitialized(attacker, currentTick);
                attackerPData.lastCombatInteractionTime = currentTime;
                attackerPData.isDirtyForSave = true;
                if (playerUtils.debugLog && attackerPData.isWatched) playerUtils.debugLog(`CombatLog: Updated lastCombatTime for attacker ${attacker.nameTag} to ${currentTime}`, attacker.nameTag);
            }
        }
    });
    if (playerUtils.debugLog) {
        playerUtils.debugLog("CombatLog: Subscribed to entityHurt for combat interaction tracking.", null);
    }
}

/**
 * Handles actions before a player breaks a block. Sets up pData for checks like AutoTool and InstaBreak.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handlePlayerBreakBlockBeforeEvent(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { player, block, itemStack } = eventData; // itemStack is available in PlayerBreakBlockBeforeEvent
    if (!player) return;

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) return;

    if (checks.checkBreakUnbreakable && config.enableInstaBreakUnbreakableCheck) {
        await checks.checkBreakUnbreakable(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (eventData.cancel) {
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`handlePlayerBreakBlockBeforeEvent: Event cancelled by checkBreakUnbreakable for ${player.nameTag}.`, player.nameTag);
            return;
        }
    }

    pData.blockBreakEvents = pData.blockBreakEvents || [];
    pData.blockBreakEvents.push(Date.now());
    pData.isDirtyForSave = true;

    pData.isAttemptingBlockBreak = true;
    pData.breakingBlockTypeId = block.typeId;
    pData.breakingBlockLocation = { x: block.location.x, y: block.location.y, z: block.location.z };
    pData.slotAtBreakAttemptStart = player.selectedSlotIndex;
    pData.breakAttemptTick = currentTick;
    pData.switchedToOptimalToolForBreak = false;
    pData.optimalToolSlotForLastBreak = null;

    if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`AutoTool: BreakAttempt started. Block: ${block.typeId}, Slot: ${player.selectedSlotIndex}`, player.nameTag);

    if (config.enableInstaBreakSpeedCheck) {
        pData.breakStartTimeMs = Date.now();
        pData.breakStartTickGameTime = currentTick;
        // Use itemStack from eventData if available, otherwise fetch from inventory (though eventData.itemStack is preferred)
        const toolUsed = itemStack ?? player.getComponent(mc.EntityComponentTypes.Inventory)?.container?.getItem(player.selectedSlotIndex);
        pData.expectedBreakDurationTicks = getExpectedBreakTicks(player, block.permutation, toolUsed, config);
        pData.toolUsedForBreakAttempt = toolUsed ? toolUsed.typeId : "hand";
        if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`InstaBreakSpeed: Started break timer for ${player.nameTag} on ${block.typeId}. Expected: ${pData.expectedBreakDurationTicks}t. Tool: ${pData.toolUsedForBreakAttempt}`, player.nameTag);
    }
}

/**
 * Handles actions after a player breaks a block. Updates AutoTool state and triggers X-Ray notifications.
 * X-Ray notifications for Diamond Ore (Overworld, Y 14 to -63) and Ancient Debris (Nether, Y 8 to 119)
 * are filtered by dimension and Y-levels if enabled. Notification message includes dimension and uses
 * standardized block names (e.g., "Diamond Ore" for both variants).
 * @param {mc.PlayerBreakBlockAfterEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handlePlayerBreakBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { player, block, brokenBlockPermutation } = eventData;
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) return;

    if (pData.isAttemptingBlockBreak &&
        pData.breakingBlockLocation &&
        block.location.x === pData.breakingBlockLocation.x &&
        block.location.y === pData.breakingBlockLocation.y &&
        block.location.z === pData.breakingBlockLocation.z &&
        brokenBlockPermutation.type.id === pData.breakingBlockTypeId) {

        pData.lastBreakCompleteTick = currentTick;
        if (pData.switchedToOptimalToolForBreak) {
            pData.optimalToolSlotForLastBreak = player.selectedSlotIndex;
            pData.blockBrokenWithOptimalTypeId = brokenBlockPermutation.type.id;
            const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
            const optimalToolStack = inventory?.container?.getItem(player.selectedSlotIndex);
            pData.optimalToolTypeIdForLastBreak = optimalToolStack?.typeId ?? "hand";
        }
        if (pData.isWatched && playerUtils.debugLog) playerUtils.debugLog(`AutoTool: BreakComplete. SwitchedToOptimal: ${pData.switchedToOptimalToolForBreak}, SlotUsed: ${player.selectedSlotIndex}`, player.nameTag);
    }
    pData.isAttemptingBlockBreak = false; // Reset state

    if (checks.checkBreakSpeed && config.enableInstaBreakSpeedCheck) {
        await checks.checkBreakSpeed(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    if (!config.xrayDetectionNotifyOnOreMineEnabled) return;

    const brokenBlockId = brokenBlockPermutation.type.id;
    if (config.xrayDetectionMonitoredOres.includes(brokenBlockId)) {
        // X-Ray Alert Logic: Filter for specific ores, dimensions, and Y-levels.
        const dimensionId = player.dimension.id;
        const blockY = block.location.y;
        let sendNotification = false;
        let prettyBlockName = brokenBlockId.replace("minecraft:", "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()); // Default pretty name

        if (brokenBlockId === "minecraft:diamond_ore" || brokenBlockId === "minecraft:deepslate_diamond_ore") {
            prettyBlockName = "Diamond Ore"; // Standardize name for both diamond ore variants
            // Diamond Ore: Overworld, Y <= 14 && Y >= -63
            if (dimensionId === "minecraft:overworld" && blockY <= 14 && blockY >= -63) {
                sendNotification = true;
            }
        } else if (brokenBlockId === "minecraft:ancient_debris") {
            prettyBlockName = "Ancient Debris"; // Standardize name
            // Ancient Debris: Nether, Y >= 8 && Y <= 119
            if (dimensionId === "minecraft:nether" && blockY >= 8 && blockY <= 119) {
                sendNotification = true;
            }
        } else {
            // For other ores that might be in xrayDetectionMonitoredOres (currently none by default configuration).
            // This block maintains previous broader alerting behavior if other ores are added back to the monitored list without specific filters.
            sendNotification = true;
        }

        if (sendNotification) {
            const location = block.location;
            const message = `§7[§cX-Ray§7] §e${player.nameTag}§7 mined §b${prettyBlockName}§7 at §a${Math.floor(location.x)}, ${Math.floor(blockY)}, ${Math.floor(location.z)}§7 in ${dimensionId.replace("minecraft:","")}.`;
            playerUtils.debugLog(message, null); // Log for server console

            mc.world.getAllPlayers().forEach(adminPlayer => {
                if (playerUtils.isAdmin(adminPlayer)) {
                    const wantsNotifications = adminPlayer.hasTag("xray_notify_on");
                    const explicitlyDisabled = adminPlayer.hasTag("xray_notify_off");
                    if (wantsNotifications || (config.xrayDetectionAdminNotifyByDefault && !explicitlyDisabled)) {
                        adminPlayer.sendMessage(message);
                    }
                }
            });
        }
    }
}

/**
 * Handles item use events. Sets player state for StateConflict checks and triggers FastUse/IllegalItem checks.
 * @param {mc.ItemUseBeforeEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handleItemUse(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { source: player, itemStack } = eventData;
    if (player?.typeId !== 'minecraft:player') return;

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`InventoryMod/FastUse: No pData for ${player.nameTag} in handleItemUse.`, player.nameTag);
        return;
    }

    if (checks.checkSwitchAndUseInSameTick && config.enableInventoryModCheck) {
        await checks.checkSwitchAndUseInSameTick(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    const itemTypeId = itemStack.typeId;
    let stateChanged = false;
    if (config.attackBlockingConsumables.includes(itemTypeId)) {
        pData.isUsingConsumable = true; stateChanged = true;
        if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started using consumable ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
    } else if (config.attackBlockingBows.includes(itemTypeId)) {
        pData.isChargingBow = true; stateChanged = true;
        if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started charging bow ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
    } else if (config.attackBlockingShields.includes(itemTypeId)) {
        pData.isUsingShield = true; stateChanged = true;
        if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started using shield ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
    }
    if (stateChanged) pData.lastItemUseTick = currentTick;


    if (checks.checkFastUse && config.enableFastUseCheck) {
        await checks.checkFastUse(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction);
    }
    if (checks.checkIllegalItems && config.enableIllegalItemCheck) {
        await checks.checkIllegalItems(player, itemStack, eventData, "use", pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
    }
}

/**
 * Handles item use on block events, primarily for checking illegal item placement.
 * @param {mc.ItemUseOnBeforeEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 */
export async function handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction) {
    // currentTick is not available here without passing it from main.js through the event subscription.
    // If ensurePlayerDataInitialized is needed, this handler's signature in main.js needs currentTick.
    const { source: player, itemStack } = eventData;
    if (player?.typeId !== 'minecraft:player') return;

    // Using getPlayerData and checking for null, as currentTick isn't available for ensurePlayerDataInitialized.
    // Checks using this pData must be robust against potentially missing fields if it's not fully initialized.
    const pData = playerDataManager.getPlayerData(player.id);
    // If pData is crucial and might be null, consider alternative ways to get currentTick or adjust check logic.

    if (checks.checkIllegalItems && config.enableIllegalItemCheck) {
        // Pass `pData` which might be null. `checkIllegalItems` must handle this.
        await checks.checkIllegalItems(player, itemStack, eventData, "place", pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
    }
}

/**
 * Handles player inventory item changes. Triggers checks for inventory modifications during locked actions.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handleInventoryItemChange(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { source: player } = eventData; // Player is eventData.source
    if (player?.typeId !== 'minecraft:player') return;

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) return;

    if (checks.checkInventoryMoveWhileActionLocked && config.enableInventoryModCheck) {
        await checks.checkInventoryMoveWhileActionLocked(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }
}

/**
 * Handles player place block events before they occur. Triggers checks like AirPlace.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handlePlayerPlaceBlockBefore(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { player } = eventData;
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`AirPlaceCheck: No pData for ${player.nameTag} in handlePlayerPlaceBlockBefore.`, player.nameTag);
        return;
    }

    if (checks.checkAirPlace && config.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
    }
}

/**
 * Handles player place block events after they occur. Triggers checks like Tower, FlatRotation, DownwardScaffold, FastPlace.
 * @param {mc.PlayerPlaceBlockAfterEvent} eventData - The event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handlePlayerPlaceBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const { player, block } = eventData;
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`Checks: No pData for ${player.nameTag} in handlePlayerPlaceBlockAfter.`, player.nameTag);
        return;
    }

    const commonArgs = [player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick];
    const blockArgs = [player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick];

    if (checks.checkTower && config.enableTowerCheck) await checks.checkTower(...blockArgs);
    if (checks.checkFlatRotationBuilding && config.enableFlatRotationCheck) await checks.checkFlatRotationBuilding(...commonArgs);
    if (checks.checkDownwardScaffold && config.enableDownwardScaffoldCheck) await checks.checkDownwardScaffold(...blockArgs);
    if (checks.checkFastPlace && config.enableFastPlaceCheck) await checks.checkFastPlace(...blockArgs);
}

/**
 * Handles chat messages before they are sent. Applies rank prefixes and performs chat-based checks.
 * @param {mc.ChatSendBeforeEvent} eventData - The chat send event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for player interactions.
 * @param {Object<string, function>} checks - Object containing various check functions.
 * @param {import('./logManager.js')} logManager - Manager for logging.
 * @param {function} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 */
export async function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils, checks, logManager, executeCheckAction, currentTick) {
    const { sender: player, message: originalMessage } = eventData;
    if (!player) {
        console.warn("[AntiCheat] handleBeforeChatSend: eventData.sender is undefined.");
        return;
    }

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        console.warn(`[AntiCheat] handleBeforeChatSend: Could not get/initialize pData for ${player.nameTag}. Cancelling message.`);
        eventData.cancel = true;
        return;
    }

    if (playerDataManager.isMuted(player)) {
        playerUtils.warnPlayer(player, "You are currently muted and cannot send messages.");
        eventData.cancel = true;
        return;
    }

    const commonArgs = [player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick];

    if (checks.checkMessageRate && config.enableFastMessageSpamCheck) {
        if (await checks.checkMessageRate(...commonArgs)) { // checkMessageRate should return true to cancel
            eventData.cancel = true;
            if (playerUtils.debugLog) playerUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled by MessageRateCheck.`, pData.isWatched ? player.nameTag : null);
            return;
        }
    }
    if (checks.checkMessageWordCount && config.enableMaxWordsSpamCheck) {
        if (await checks.checkMessageWordCount(...commonArgs)) { // checkMessageWordCount should return true to cancel
            eventData.cancel = true;
            if (playerUtils.debugLog) playerUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled by MessageWordCountCheck.`, pData.isWatched ? player.nameTag : null);
            return;
        }
    }

    const rankDisplay = getPlayerRankDisplay(player);
    const formattedMessage = `${rankDisplay.chatPrefix}${player.nameTag ?? player.name}§f: ${originalMessage}`; // Use nameTag, fallback to name

    eventData.cancel = true; // Cancel original vanilla message
    mc.world.sendMessage(formattedMessage); // Broadcast formatted message

    // Update pData for other chat checks that might rely on message history AFTER successful send
    pData.recentMessages = pData.recentMessages || [];
    pData.recentMessages.push({ content: originalMessage, timestamp: Date.now() });
    if (pData.recentMessages.length > (config.spamRepeatHistoryLength || 10)) { // Ensure spamRepeatHistoryLength is in config
        pData.recentMessages.shift();
    }
    pData.isDirtyForSave = true;
}


/**
 * Handles actions after a player changes dimension, specifically for Dimension Lock enforcement.
 * If a non-admin player enters a locked dimension (Nether or End), they are teleported back.
 * @param {import('@minecraft/server').PlayerDimensionChangeAfterEvent} eventData - The event data.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions.
 * @param {import('../config.js').editableConfigValues} config - The server configuration.
 */
export async function handlePlayerDimensionChangeAfter(eventData, playerUtils, config) {
    const { player, fromDimension, toDimension, fromLocation } = eventData;

    if (!player || !fromDimension || !toDimension || !fromLocation) {
        playerUtils.debugLog("DimensionLock: Invalid eventData in handlePlayerDimensionChangeAfter.", null);
        return;
    }

    // Using permissionLevels.admin directly as config.dimensionLockAdminBypassLevel might not exist yet.
    // It's assumed playerUtils.getPlayerPermissionLevel is available and correct.
    const playerPermLevel = playerUtils.getPlayerPermissionLevel ? playerUtils.getPlayerPermissionLevel(player) : permissionLevels.member;

    if (playerPermLevel <= permissionLevels.admin) {
        playerUtils.debugLog(`DimensionLock: Player ${player.nameTag} has bypass permission (Level: ${playerPermLevel}). Allowing dimension change.`, player.nameTag);
        return; // Admin/Owner bypass
    }

    let dimensionIsLocked = false;
    let lockedDimensionName = "";

    if (toDimension.id === "minecraft:the_nether" && isNetherLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = "The Nether";
    } else if (toDimension.id === "minecraft:the_end" && isEndLocked()) {
        dimensionIsLocked = true;
        lockedDimensionName = "The End";
    }

    if (dimensionIsLocked) {
        try {
            // Ensure fromLocation and fromDimension are valid before teleporting
            if (fromLocation && fromDimension) {
                player.teleport(fromLocation, { dimension: fromDimension });
                playerUtils.warnPlayer(player, `Access to ${lockedDimensionName} is currently restricted by an administrator.`);
                playerUtils.debugLog(`DimensionLock: Teleported ${player.nameTag} back from ${lockedDimensionName} (locked).`, player.nameTag);

                const adminMessage = `§7[DimensionLock] Player ${player.nameTag} attempted to enter ${lockedDimensionName} (locked) and was teleported back.`;
                if (playerUtils.notifyAdmins) playerUtils.notifyAdmins(adminMessage, player, null);

            } else {
                 playerUtils.debugLog(`DimensionLock: Cannot teleport ${player.nameTag}, fromLocation or fromDimension is invalid.`, player.nameTag);
                 console.error(`DimensionLock: Invalid teleport parameters for ${player.nameTag}: fromLocation or fromDimension undefined.`);
            }
        } catch (e) {
            playerUtils.debugLog(`DimensionLock: Error teleporting ${player.nameTag} back from ${lockedDimensionName}: ${e}`, player.nameTag);
            console.error(`DimensionLock: Teleportation error for ${player.nameTag}: ${e.stack || e}`);
        }
    }
}

[end of AntiCheatsBP/scripts/core/eventHandlers.js]
