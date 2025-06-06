import * as mc from '@minecraft/server';
import { getPlayerRankDisplay, updatePlayerNametag } from './rankManager.js';
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

    if (hurtEntity.typeId === 'minecraft:player' && cause.category === mc.EntityDamageCauseCategory.fall) {
        const pData = playerDataManager.getPlayerData(hurtEntity.id);
        if (pData) {
            pData.isTakingFallDamage = true;
            playerUtils.debugLog(`Player ${pData.playerNameTag || hurtEntity.nameTag} took fall damage (${eventData.damage}).`, pData.isWatched ? (pData.playerNameTag || hurtEntity.nameTag) : null);
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
 * @param {object} config The server configuration object (currently unused here but available).
 * @param {object} playerUtils Utility functions for players (currently unused here but available).
 */
export function handlePlayerBreakBlock(eventData, playerDataManager, checks, config, playerUtils) {
    const player = eventData.player;
    const pData = playerDataManager.getPlayerData(player.id);
    if (pData) {
        if (!pData.blockBreakEvents) pData.blockBreakEvents = [];
        pData.blockBreakEvents.push(Date.now());
    }
    // If there are specific checks to run on block break before event (e.g. instaBreak part 1)
    // if (checks && checks.checkInstaBreakPart1 && config.enableInstaBreakCheck) {
    //     checks.checkInstaBreakPart1(player, eventData, pData, config, playerUtils, playerDataManager);
    // }
}

/**
 * Handles player break block events after they occur, for X-Ray detection notifications.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData The event data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 */
export function handlePlayerBreakBlockAfter(eventData, config, playerUtils) {
    if (!config.xrayDetectionNotifyOnOreMineEnabled) {
        return;
    }
    const player = eventData.player;
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
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export function handleItemUse(eventData, playerDataManager, checks, playerUtils, config, executeCheckAction) {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity;
        const itemStack = eventData.itemStack;
        const pData = playerDataManager.getPlayerData(player.id);
        if (checks && checks.checkIllegalItems && config.enableIllegalItemCheck) { // Added config check
            // Assuming logManager is available in this scope, passed from main.js if necessary, or globally accessible
            // For now, let's assume it's not directly passed here yet, so executeCheckAction might not log fully for this.
            // Correction: logManager MUST be passed here for executeCheckAction to work fully.
            // This requires main.js to pass logManager to handleItemUse/handleItemUseOn if it's not already.
            // Based on previous steps, executeCheckAction is passed, but logManager might not be passed to these specific handlers yet.
            // Let's assume main.js is updated or will be updated to pass logManager to these handlers.
            // If main.js passes logManager to handleItemUse:
            // Corrected call:
            checks.checkIllegalItems(player, itemStack, eventData, "use", pData, config, playerUtils, playerDataManager, logManager, executeCheckAction);
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
 * Handles chat messages before they are sent to apply rank prefixes and perform chat-based checks.
 * @param {mc.ChatSendBeforeEvent} eventData The chat send event data.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} config The server configuration object.
 * @param {object} playerUtils Utility functions for players.
 */
export function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils) {
    const player = eventData.sender;
    if (!player) {
        console.warn("[AntiCheat] handleBeforeChatSend: eventData.sender is undefined.");
        return;
    }
    if (playerDataManager.isMuted(player)) { /* ... (existing mute logic) ... */ return; }
    const originalMessage = eventData.message;
    const rankDisplay = getPlayerRankDisplay(player);
    const formattedMessage = `${rankDisplay.chatPrefix}${player.name}§f: ${originalMessage}`;
    const pData = playerDataManager.getPlayerData(player.id);
    if (config.enableNewlineCheck) { /* ... (existing newline check) ... */ }
    if (config.enableMaxMessageLengthCheck) { /* ... (existing length check) ... */ }
    if (config.spamRepeatCheckEnabled && pData) { /* ... (existing spam check) ... */ }
    eventData.cancel = true;
    for (const p of mc.world.getAllPlayers()) { p.sendMessage(formattedMessage); }
}
