import * as mc from '@minecraft/server';
import { getPlayerRankDisplay, updatePlayerNametag } from './rankManager.js';
import { getExpectedBreakTicks } from '../utils/index.js'; // For InstaBreak Speed Check
import { checkMessageRate, checkMessageWordCount } from '../checks/index.js'; // Or direct paths
// config will be passed to functions that need it, or specific values destructured from it.

/**
 * Handles player leave events to save their anti-cheat data and check for combat logging.
 * @param {mc.PlayerLeaveBeforeEvent} eventData
 * @param {object} playerDataManager
 * @param {object} playerUtils
 * @param {object} config
 * @param {function} addLog
 */
export async function handlePlayerLeave(eventData, playerDataManager, playerUtils, config, addLog) {
    const player = eventData.player;
    if (!player) { // Should not happen with beforeEvents.playerLeave
        console.warn("AntiCheat: handlePlayerLeave: Player undefined in eventData.");
        return;
    }
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Processing data...`, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);

    if (pData && config.enableCombatLogDetection && pData.lastCombatInteractionTime && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceLastCombatMs = currentTime - pData.lastCombatInteractionTime;
        const combatLogThresholdMs = (config.combatLogThresholdSeconds || 15) * 1000; // Default 15s

        if (timeSinceLastCombatMs < combatLogThresholdMs) {
            const timeSinceLastCombatSeconds = (timeSinceLastCombatMs / 1000).toFixed(1);
            const flagType = 'combat_log';
            const incrementAmount = config.combatLogFlagIncrement || 1; // Default to 1 flag
            const baseFlagReason = config.combatLogReason || `Disconnected ${timeSinceLastCombatSeconds}s after combat.`;

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${config.combatLogThresholdSeconds}s. Will flag +${incrementAmount}.`, player.nameTag);

            // Call addFlag for the configured increment amount
            // addFlag's current signature: addFlag(player, flagType, reasonMessage, detailsForNotify)
            // reasonMessage is used for warnPlayer and forms part of notifyAdmins message.
            // detailsForNotify is appended to the notifyAdmins message.
            for (let i = 0; i < incrementAmount; i++) {
                // We use a generic reason for warnPlayer, and more specific details for notifyAdmins/log
                playerDataManager.addFlag(player, flagType, baseFlagReason, `(Combat Log #${i + 1}/${incrementAmount})`);
            }

            const notifyMessageTemplate = config.combatLogMessage || `§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.`;
            const notifyMessage = notifyMessageTemplate
                .replace('{playerName}', player.nameTag)
                .replace('{timeSinceCombat}', timeSinceLastCombatSeconds)
                .replace('{incrementAmount}', incrementAmount.toString());

            // Pass pData to notifyAdmins for richer context if it uses it
            playerUtils.notifyAdmins(notifyMessage, player, pData);

            if (addLog) {
                addLog({
                    adminName: 'System', // Combat log is a system-detected event
                    actionType: 'combat_log_detected',
                    targetName: player.nameTag,
                    details: `Disconnected ${timeSinceLastCombatSeconds}s after PvP. Last interaction at ${new Date(pData.lastCombatInteractionTime).toISOString()}. Flagged +${incrementAmount}.`,
                    reason: baseFlagReason // General reason for the log
                });
            }
        }
    }

    playerDataManager.prepareAndSavePlayerData(player);
}

/**
 * Handles player spawn events, checks for active bans, and updates nametags.
 * @param {mc.PlayerSpawnAfterEvent} eventData The player spawn event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 */
export function handlePlayerSpawn(eventData, playerDataManager, playerUtils, config) {
    const player = eventData.player;
    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    try {
        const banInfo = playerDataManager.getBanInfo(player);
        if (banInfo) {
            let kickReason = `You are banned from this server.\nReason: ${banInfo.reason}\n`;
            if (banInfo.unbanTime === Infinity) {
                kickReason += "This ban is permanent.";
            } else {
                kickReason += `Expires: ${new Date(banInfo.unbanTime).toLocaleString()}`;
            }
            player.kick(kickReason);
            if (playerUtils && playerUtils.debugLog) {
                playerUtils.debugLog(`Player ${player.nameTag} automatically kicked due to active ban.`, player.nameTag);
            }
            return;
        }
        updatePlayerNametag(player);
        if (playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(`Updated nametag for ${player.nameTag} on spawn.`, player.nameTag);
        }
    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player.nameTag}: ${error}`);
        if (playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(`Error in handlePlayerSpawn for ${player.nameTag}: ${error}`, player.nameTag);
        }
    }
}

/**
 * Handles entity hurt events to track fall damage and trigger combat-related checks.
 * @param {mc.EntityHurtAfterEvent} eventData The entity hurt event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {number} currentTick The current game tick.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export function handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config, currentTick, logManager, executeCheckAction) {
    const { hurtEntity, cause, damagingEntity } = eventData;

    // Updated to handle general player damage for lastTookDamageTick
    if (hurtEntity.typeId === 'minecraft:player') {
        const player = hurtEntity; // Cast or use hurtEntity directly as player
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData) {
            pData.lastTookDamageTick = currentTick; // Update lastTookDamageTick
            if (cause.category === mc.EntityDamageCauseCategory.fall) {
                pData.isTakingFallDamage = true;
                playerUtils.debugLog(`Player ${pData.playerNameTag || player.nameTag} took fall damage (${eventData.damage}). LastTookDamageTick updated.`, pData.isWatched ? (pData.playerNameTag || player.nameTag) : null);
            } else {
                playerUtils.debugLog(`Player ${pData.playerNameTag || player.nameTag} took damage. Type: ${cause.category}. LastTookDamageTick updated.`, pData.isWatched ? (pData.playerNameTag || player.nameTag) : null);
            }

            // Self-Hurt Check
            if (checks && checks.checkSelfHurt && config.enableSelfHurtCheck) {
                // The `cause` in handleEntityHurt is eventData.cause (which is EntityDamageSource)
                // The `damagingEntity` in handleEntityHurt is eventData.damagingEntity
                await checks.checkSelfHurt(player, eventData.cause, eventData.damagingEntity, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
            }
        }
    }

    if (damagingEntity && damagingEntity.typeId === 'minecraft:player') {
        const attacker = damagingEntity;
        const attackerPData = playerDataManager.getPlayerData(attacker.id);

        if (attackerPData) {
            const now = Date.now();
            if (!attackerPData.attackEvents) attackerPData.attackEvents = [];
            attackerPData.attackEvents.push(now);
            attackerPData.lastAttackTime = now;
            attackerPData.lastAttackTick = currentTick;

            if (checks && checks.checkReach && config.enableReachCheck) {
                 let gameMode = attacker.gameMode;
                 if (typeof gameMode === 'undefined' && mc.world.getAllPlayers) { // Check if getAllPlayers exists
                    const worldPlayer = mc.world.getAllPlayers().find(p => p.id === attacker.id);
                    if (worldPlayer) gameMode = worldPlayer.gameMode;
                 }
                if (typeof gameMode !== 'undefined') {
                    checks.checkReach(attacker, hurtEntity, gameMode, attackerPData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
                } else {
                    playerUtils.debugLog(`Could not determine game mode for attacker ${attacker.nameTag} to perform reach check.`, attackerPData.isWatched ? attacker.nameTag : null);
                }
            }
            if (checks && checks.checkMultiTarget && config.enableMultiTargetCheck) {
                checks.checkMultiTarget(attacker, attackerPData, hurtEntity, config, playerUtils, playerDataManager, logManager, executeCheckAction);
            }
            if (checks && checks.checkAttackWhileSleeping && config.enableStateConflictCheck) {
                checks.checkAttackWhileSleeping(attacker, attackerPData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
            }
            // Add the new check call here:
            if (checks && checks.checkAttackWhileUsingItem && config.enableStateConflictCheck) {
                checks.checkAttackWhileUsingItem(attacker, attackerPData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
            }
        }
    }
}

/**
 * Subscribes to entity hurt events specifically for combat log detection if enabled.
 * Updates last combat interaction time for players involved in PvP.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 */
export function subscribeToCombatLogEvents(playerDataManager, config, playerUtils) {
    if (config.enableCombatLogDetection) {
        mc.world.afterEvents.entityHurt.subscribe(async (eventData) => {
            const { hurtEntity, damageSource } = eventData;

            if (hurtEntity && hurtEntity.typeId === 'minecraft:player') {
                const victim = hurtEntity;
                const damagingEntity = damageSource.damagingEntity;

                if (damagingEntity && damagingEntity.typeId === 'minecraft:player') {
                    const attacker = damagingEntity;
                    if (attacker.id === victim.id) return;

                    const currentTime = Date.now();
                    const currentTick = mc.system.currentTick; // Get current tick for initializeDefaultPlayerData

                    let victimPData = playerDataManager.getPlayerData(victim.id);
                    if (!victimPData) {
                        victimPData = playerDataManager.initializeDefaultPlayerData(victim, currentTick);
                        playerDataManager.setPlayerData(victim.id, victimPData);
                    }
                    victimPData.lastCombatInteractionTime = currentTime;
                    if (playerUtils.debugLog && victimPData.isWatched) playerUtils.debugLog(`CombatLog: Updated lastCombatTime for victim ${victim.nameTag} to ${currentTime}`, victim.nameTag);

                    let attackerPData = playerDataManager.getPlayerData(attacker.id);
                     if (!attackerPData) {
                        attackerPData = playerDataManager.initializeDefaultPlayerData(attacker, currentTick);
                        playerDataManager.setPlayerData(attacker.id, attackerPData);
                    }
                    attackerPData.lastCombatInteractionTime = currentTime;
                    if (playerUtils.debugLog && attackerPData.isWatched) playerUtils.debugLog(`CombatLog: Updated lastCombatTime for attacker ${attacker.nameTag} to ${currentTime}`, attacker.nameTag);
                }
            }
        });
        if (playerUtils && playerUtils.debugLog) {
             playerUtils.debugLog("CombatLog: Subscribed to entityHurt for combat interaction tracking.", null);
        }
    }
}

/**
 * Handles player break block events before they occur, primarily for recording block break rates.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions (currently unused here but available).
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function handlePlayerBreakBlockBeforeEvent(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const player = eventData.player;
    if (!player) return; // Should not happen with this event
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) return;

    // Call InstaBreak Unbreakable Check FIRST - it might cancel the event
    if (checks && checks.checkBreakUnbreakable && config.enableInstaBreakUnbreakableCheck) {
        await checks.checkBreakUnbreakable(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        if (eventData.cancel) {
            if (playerUtils.debugLog && pData.isWatched) {
                playerUtils.debugLog(\`handlePlayerBreakBlockBeforeEvent: Event cancelled by checkBreakUnbreakable for \${player.nameTag}.\`, player.nameTag);
            }
            return;
        }
    }

    // Existing logic for Nuker (blockBreakEvents) - moved after unbreakable check
    if (!pData.blockBreakEvents) pData.blockBreakEvents = [];
    pData.blockBreakEvents.push(Date.now());

    // AutoTool pData setup
    pData.isAttemptingBlockBreak = true;
    pData.breakingBlockTypeId = eventData.block.typeId; // For AutoTool & InstaBreak Speed
    pData.breakingBlockLocation = { x: eventData.block.location.x, y: eventData.block.location.y, z: eventData.block.location.z }; // For AutoTool & InstaBreak Speed
    pData.slotAtBreakAttemptStart = player.selectedSlotIndex; // For AutoTool
    pData.breakAttemptTick = currentTick; // For AutoTool

    pData.switchedToOptimalToolForBreak = false; // Reset for AutoTool
    pData.optimalToolSlotForLastBreak = null;    // Reset for AutoTool

    if (pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(\`AutoTool: BreakAttempt started. Block: \${eventData.block.typeId}, Slot: \${player.selectedSlotIndex}\`, player.nameTag);
    }

    // InstaBreak Speed pData setup (Part 2)
    if (config.enableInstaBreakSpeedCheck) {
        pData.breakStartTimeMs = Date.now();
        pData.breakStartTickGameTime = currentTick;
        const itemInHand = player.getComponent(mc.EntityComponentTypes.Inventory)?.container?.getItem(player.selectedSlotIndex);
        pData.expectedBreakDurationTicks = getExpectedBreakTicks(player, eventData.block.permutation, itemInHand, config);
        pData.toolUsedForBreakAttempt = itemInHand ? itemInHand.typeId : "hand"; // Store tool used
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`InstaBreakSpeed: Started break timer for \${player.nameTag} on \${eventData.block.typeId}. Expected: \${pData.expectedBreakDurationTicks}t. Tool: \${pData.toolUsedForBreakAttempt}\`, player.nameTag);
        }
    }

    // If there are specific checks to run on block break before event (e.g. other parts of instaBreak if needed)
    // if (checks && checks.checkInstaBreakPart1 && config.enableInstaBreakCheck) {
    //     await checks.checkInstaBreakPart1(player, eventData, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    // }
}

/**
 * Handles player break block events after they occur, for X-Ray detection notifications and AutoTool logic.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function handlePlayerBreakBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const player = eventData.player;
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);

    if (pData) {
        if (pData.isAttemptingBlockBreak &&
            pData.breakingBlockLocation &&
            eventData.block.location.x === pData.breakingBlockLocation.x &&
            eventData.block.location.y === pData.breakingBlockLocation.y &&
            eventData.block.location.z === pData.breakingBlockLocation.z &&
            eventData.brokenBlockPermutation.type.id === pData.breakingBlockTypeId) {

            pData.lastBreakCompleteTick = currentTick;
            if (pData.switchedToOptimalToolForBreak) { // This flag would be set by the tick-based checkAutoTool
                pData.optimalToolSlotForLastBreak = player.selectedSlotIndex; // Slot used to complete the break
                pData.blockBrokenWithOptimalTypeId = eventData.brokenBlockPermutation.type.id; // Store broken block type
                const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
                const optimalToolStack = inventory?.container?.getItem(player.selectedSlotIndex);
                pData.optimalToolTypeIdForLastBreak = optimalToolStack ? optimalToolStack.typeId : "hand"; // Store tool type
            }
            if (pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(`AutoTool: BreakComplete. SwitchedToOptimal: \${pData.switchedToOptimalToolForBreak}, SlotUsed: \${player.selectedSlotIndex}\`, player.nameTag);
            }
        }
        // Reset attempt state after any break, or if block changed
        pData.isAttemptingBlockBreak = false;
        // pData.breakingBlockTypeId = null; // Decided to keep for a short while as per thought process, but prompt implies clear.
        // pData.breakingBlockLocation = null; // Let's clear them as per original thought for reset.
        // Re-evaluating: For AutoTool, it might be better to clear these strictly on starting a *new* break attempt
        // or if the tick-based check determines the attempt timed out.
        // For now, isAttemptingBlockBreak = false is the primary reset.
    }

    // Call InstaBreak Speed Check AFTER other pData updates from block break, but before X-Ray
    if (checks && checks.checkBreakSpeed && config.enableInstaBreakSpeedCheck) {
        await checks.checkBreakSpeed(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    // Existing X-Ray logic
    if (!config.xrayDetectionNotifyOnOreMineEnabled) {
        // If InstaBreak speed check was the only reason pData was needed and it's off,
        // then we might return earlier if X-Ray is also off.
        // However, pData is fetched unconditionally at the start now.
        return;
    }
    // Note: pData is already fetched.
    const brokenBlockId = eventData.brokenBlockPermutation.type.id;
    if (config.xrayDetectionMonitoredOres.includes(brokenBlockId)) {
        const location = eventData.block.location; // Use block location for more precision
        const prettyBlockName = brokenBlockId.replace("minecraft:", "");
        const message = `§7[§cX-Ray§7] §e${player.nameTag}§7 mined §b${prettyBlockName}§7 at §a${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}§7.`;
        playerUtils.debugLog(message, null);
        mc.world.getAllPlayers().forEach(adminPlayer => {
            if (adminPlayer.hasTag(config.adminTag)) {
                const wantsNotificationsExplicitly = adminPlayer.hasTag("xray_notify_on");
                const explicitlyDisabled = adminPlayer.hasTag("xray_notify_off");
                let shouldNotify = false;
                if (wantsNotificationsExplicitly) shouldNotify = true;
                else if (config.xrayDetectionAdminNotifyByDefault && !explicitlyDisabled) shouldNotify = true;
                if (shouldNotify) adminPlayer.sendMessage(message);
            }
        });
    }
}

/**
 * Handles item use events, primarily for checking illegal item usage.
 * @param {mc.ItemUseBeforeEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function handleItemUse(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity;
        const itemStack = eventData.itemStack;
        // Ensure pData is initialized, especially as this is a 'before' event. CurrentTick is now passed from main.js.
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);

        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`InventoryMod/FastUse: No pData for ${player.nameTag} in handleItemUse.`, player.nameTag);
            return;
        }

        // Call InventoryMod - Switch & Use Same Tick Check (Needs to be called early)
        if (checks && checks.checkSwitchAndUseInSameTick && config.enableInventoryModCheck) {
            await checks.checkSwitchAndUseInSameTick(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
            // This check doesn't cancel eventData, it only flags.
        }

        const itemTypeId = itemStack.typeId;
        // const tickForStateUpdate = currentTick; // Use the passed currentTick for consistency

        // Logic for setting isUsingConsumable, isChargingBow, isUsingShield (already implemented)
        if (config.attackBlockingConsumables.includes(itemTypeId)) {
            pData.isUsingConsumable = true;
            pData.lastItemUseTick = currentTick; // Use passed currentTick
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started using consumable ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
        } else if (config.attackBlockingBows.includes(itemTypeId)) {
            pData.isChargingBow = true;
            pData.lastItemUseTick = currentTick; // Use passed currentTick
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started charging bow ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
        } else if (config.attackBlockingShields.includes(itemTypeId)) {
            pData.isUsingShield = true;
            pData.lastItemUseTick = currentTick; // Use passed currentTick
            if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`StateConflict: ${player.nameTag} started using shield ${itemTypeId}. Tick: ${currentTick}`, player.nameTag);
        }

        // Call Fast Use Check
        if (checks && checks.checkFastUse && config.enableFastUseCheck) {
            await checks.checkFastUse(player, pData, itemStack, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        }

        // Existing illegal item check (ensure it's also async if it wasn't already)
        if (checks && checks.checkIllegalItems && config.enableIllegalItemCheck) {
            await checks.checkIllegalItems(player, itemStack, eventData, "use", pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        }
    }
}

/**
 * Handles item use on block events, primarily for checking illegal item placement.
 * @param {mc.ItemUseOnBeforeEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export function handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction) {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity;
        const itemStack = eventData.itemStack;
        const pData = playerDataManager.getPlayerData(player.id);
        if (checks && checks.checkIllegalItems && config.enableIllegalItemCheck) { // Added config check
            // Corrected call:
            checks.checkIllegalItems(player, itemStack, eventData, "place", pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        }
    }
}

/**
 * Handles player inventory item changes to check for modifications during locked actions.
 * @param {mc.PlayerInventoryItemChangeAfterEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function handleInventoryItemChange(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const playerEntity = eventData.source; // In PlayerInventoryItemChangeAfterEvent, player is eventData.source
    if (!playerEntity || playerEntity.typeId !== 'minecraft:player') return;
    const player = playerEntity; // Cast to mc.Player

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) return;

    if (checks && checks.checkInventoryMoveWhileActionLocked && config.enableInventoryModCheck) {
        await checks.checkInventoryMoveWhileActionLocked(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }
}

/**
 * Handles player place block events before they occur, for checks like AirPlace.
 * @param {mc.PlayerPlaceBlockBeforeEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick from main.js (optional for some checks in this handler).
 */
export async function handlePlayerPlaceBlockBefore(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const player = eventData.player;
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`AirPlaceCheck: No pData for ${player.nameTag} in handlePlayerPlaceBlockBefore.`, player.nameTag);
        return;
    }

    // Call AirPlace Check
    if (checks && checks.checkAirPlace && config.enableAirPlaceCheck) {
        await checks.checkAirPlace(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
        // If checkAirPlace sets eventData.cancel = true, the event will be cancelled.
    }

    // Potentially other 'before' checks related to block placement can be added here.
}

/**
 * Handles player place block events after they occur.
 * @param {mc.PlayerPlaceBlockAfterEvent} eventData The event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} checks Object containing various check functions.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} config The server configuration object.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick from main.js.
 */
export async function handlePlayerPlaceBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    const player = eventData.player;
    // ensurePlayerDataInitialized is async, so ensure it's awaited
    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
    if (!pData) {
        if (playerUtils.debugLog) playerUtils.debugLog(`TowerCheck: No pData for ${player.nameTag} in handlePlayerPlaceBlockAfter.`, player.nameTag);
        return;
    }

    const block = eventData.block; // Get the placed block

    // Call Tower Check
    if (checks && checks.checkTower && config.enableTowerCheck) {
        await checks.checkTower(player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    // Call Flat Rotation Building Check
    if (checks && checks.checkFlatRotationBuilding && config.enableFlatRotationCheck) {
        await checks.checkFlatRotationBuilding(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    // Call Downward Scaffold Check
    if (checks && checks.checkDownwardScaffold && config.enableDownwardScaffoldCheck) {
        await checks.checkDownwardScaffold(player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    // Call Fast Place Check
    if (checks && checks.checkFastPlace && config.enableFastPlaceCheck) {
        await checks.checkFastPlace(player, pData, block, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
    }

    // Potentially other checks related to block placement can be added here.
}

/**
 * Handles chat messages before they are sent to apply rank prefixes and perform chat-based checks.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} checks Object containing various check functions.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils, checks, logManager, executeCheckAction, currentTick) { // Added checks, logManager, executeCheckAction, currentTick
    const player = eventData.sender;
    if (!player) {
        console.warn("[AntiCheat] handleBeforeChatSend: eventData.sender is undefined.");
        return;
    }

    const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick); // Ensure pData is initialized
    if (!pData) {
        console.warn(`[AntiCheat] handleBeforeChatSend: Could not get/initialize pData for ${player.nameTag}.`);
        eventData.cancel = true; // Cancel if no pData, as something is wrong
        return;
    }

    if (playerDataManager.isMuted(player)) {
        playerUtils.warnPlayer(player, "You are currently muted and cannot send messages.");
        eventData.cancel = true;
        return;
    }

    // === Begin Fast Message Spam Check ===
    if (checks && checks.checkMessageRate && config.enableFastMessageSpamCheck) {
        const cancelDueToSpam = await checks.checkMessageRate(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (cancelDueToSpam) {
            eventData.cancel = true;
            // Message is cancelled by the check's configuration, warning/flagging is handled by executeCheckAction
            if (playerUtils.debugLog) playerUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled due to MessageRateCheck.`, pData.isWatched ? player.nameTag : null);
            // DO NOT update pData.lastChatMessageTimestamp here, checkMessageRate does it.
            return; // Message is cancelled, stop further processing in this handler.
        }
    }
    // === End Fast Message Spam Check ===

    // === Begin Max Words Spam Check ===
    if (checks && checks.checkMessageWordCount && config.enableMaxWordsSpamCheck) {
        // Pass eventData which contains the original message
        const cancelDueToWordCount = await checks.checkMessageWordCount(player, pData, eventData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
        if (cancelDueToWordCount) {
            eventData.cancel = true;
            if (playerUtils.debugLog) playerUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled due to MessageWordCountCheck.`, pData.isWatched ? player.nameTag : null);
            return; // Message is cancelled, stop further processing.
        }
    }
    // === End Max Words Spam Check ===

    const originalMessage = eventData.message;
    const rankDisplay = getPlayerRankDisplay(player); // Assuming getPlayerRankDisplay is available
    const formattedMessage = `${rankDisplay.chatPrefix}${player.name}§f: ${originalMessage}`;

    // Existing checks (ensure pData is passed if they need it)
    // Example: if (config.enableNewlineCheck && checkNewline(player, originalMessage, pData, ...)) { eventData.cancel = true; return; }
    // Example: if (config.enableMaxMessageLengthCheck && checkMaxMsgLen(player, originalMessage, pData, ...)) { eventData.cancel = true; return; }
    // Example: if (config.spamRepeatCheckEnabled && pData && checkSpamRepeat(player, originalMessage, pData, ...)) { eventData.cancel = true; return; }

    eventData.cancel = true; // Original behavior: cancel and re-broadcast
    for (const p of mc.world.getAllPlayers()) {
        p.sendMessage(formattedMessage);
    }

    // Update pData for other chat checks that might rely on message history AFTER successful send
    if (pData.recentMessages) { // Example: If you have a recentMessages array for other spam checks
        pData.recentMessages.push({ content: originalMessage, timestamp: Date.now() });
        if (pData.recentMessages.length > (config.spamRepeatHistoryLength || 10)) {
            pData.recentMessages.shift();
        }
    }
}
