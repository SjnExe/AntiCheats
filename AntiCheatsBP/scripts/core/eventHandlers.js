import * as mc from '@minecraft/server';
import { getPlayerRankDisplay, updatePlayerNametag } from './rankManager.js';
// playerUtils will be passed or imported for debugLog, notifyAdmins, warnPlayer
// playerDataManager will be passed for pData access and manipulation
// check functions (checkReach, checkIllegalItems etc.) will be imported from ../checks/ when ready
// config will be passed or imported

/**
 * Handles player leave events to save their anti-cheat data.
 * @param {mc.PlayerLeaveBeforeEvent} eventData
 * @param {object} playerDataManager
 * @param {object} playerUtils
 */
export async function handlePlayerLeave(eventData, playerDataManager, playerUtils) {
    const player = eventData.player;
    playerUtils.debugLog(`Player ${player.nameTag} is leaving. Attempting to save pData.`, player.nameTag);
    // prepareAndSavePlayerData is async but we don't necessarily need to await it here
    // as the player is leaving anyway.
    playerDataManager.prepareAndSavePlayerData(player);
}

/**
 * Handles player spawn events to initialize player-specific settings like nametags.
 * @param {mc.PlayerSpawnAfterEvent} eventData
 * @param {object} playerDataManager Typically passed for consistency, though not used directly in this version.
 * @param {object} playerUtils Passed for debugLog, though not used directly in this version.
 */
export function handlePlayerSpawn(eventData, playerDataManager, playerUtils) {
    const player = eventData.player;
    if (!player) {
        // This case should ideally not happen if the event is firing correctly.
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined. Cannot update nametag.');
        return;
    }

    // It's generally safe to call this even if the player object might not be fully "ready"
    // for all operations, as nameTag modification is a basic property.
    // If issues arise, a systemTick.delay might be considered, but usually not needed for nametags.
    try {
        // Check for bans first
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
            return; // Don't proceed with nametag update if kicked
        }

        updatePlayerNametag(player);
        if (playerUtils && playerUtils.debugLog) { // Optional debug logging
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
 * Handles entity hurt events for combat checks and NoFall.
 * @param {mc.EntityHurtAfterEvent} eventData
 * @param {object} playerDataManager
 * @param {object} combatChecks Module or object containing combat check functions (e.g., checkReach)
 * @param {object} playerUtils
 * @param {number} currentTick The current game tick from main.js
 */
export function handleEntityHurt(eventData, playerDataManager, combatChecks, playerUtils, currentTick) {
    const { hurtEntity, cause, damagingEntity } = eventData;

    // NoFall related: Player took fall damage
    if (hurtEntity.typeId === 'minecraft:player' && cause.category === mc.EntityDamageCauseCategory.Fall) {
        const pData = playerDataManager.getPlayerData(hurtEntity.id);
        if (pData) {
            pData.isTakingFallDamage = true; // This will be read by noFallCheck
            playerUtils.debugLog(`Player ${pData.playerNameTag || hurtEntity.nameTag} took fall damage (${eventData.damage}). Resetting fallDistance.`, pData.isWatched ? (pData.playerNameTag || hurtEntity.nameTag) : null);
            // pData.fallDistance = 0; // NoFallCheck should handle resetting this after it has used the value.
                                   // For now, if this was the only place it was reset, it should be here.
                                   // However, it's reset in main tick loop's ground handling.
                                   // Let's assume NoFallCheck handles its own state based on isTakingFallDamage.
        }
    }

    // Combat checks: if the attacker is a player
    if (damagingEntity && damagingEntity.typeId === 'minecraft:player') {
        const attacker = damagingEntity; // Already known to be mc.Player
        const attackerPData = playerDataManager.getPlayerData(attacker.id);

        if (attackerPData) {
            // Record attack event for CPS
            const now = Date.now();
            if (!attackerPData.attackEvents) attackerPData.attackEvents = []; // Ensure array exists if loading from minimal save
            attackerPData.attackEvents.push(now);
            attackerPData.lastAttackTime = now;
            attackerPData.lastAttackTick = currentTick; // Set lastAttackTick for ViewSnap check

            // Call Reach Check
            if (combatChecks && combatChecks.checkReach && config.enableReachCheck) {
                 let gameMode = attacker.gameMode;
                 // Ensure gameMode is defined (it should be for a player)
                 if (typeof gameMode === 'undefined') {
                    const worldPlayer = mc.world.getAllPlayers().find(p => p.id === attacker.id);
                    if (worldPlayer) gameMode = worldPlayer.gameMode;
                 }
                if (typeof gameMode !== 'undefined') {
                    combatChecks.checkReach(attacker, hurtEntity, gameMode, attackerPData); // pData is attackerPData
                } else {
                    playerUtils.debugLog(`Could not determine game mode for attacker ${attacker.nameTag} to perform reach check.`, attackerPData.isWatched ? attacker.nameTag : null);
                }
            }

            // Call Multi-Target Check
            if (combatChecks && combatChecks.checkMultiTarget && config.enableMultiTargetCheck) {
                combatChecks.checkMultiTarget(attacker, attackerPData, hurtEntity, config);
            }

            // Call Attack While Sleeping Check (part of state conflict checks)
            if (combatChecks && combatChecks.checkAttackWhileSleeping && config.enableStateConflictCheck) {
                combatChecks.checkAttackWhileSleeping(attacker, attackerPData, config);
            }
            // Note: CPS check (checkCPS) is called in the main tick loop as it's based on timed event history, not a single hurt event.
        }
    }
}

/**
 * Handles block break events by players for Nuker detection.
 * @param {mc.PlayerBreakBlockBeforeEvent} eventData
 * @param {object} playerDataManager
 */
export function handlePlayerBreakBlock(eventData, playerDataManager) {
    const player = eventData.player;
    const pData = playerDataManager.getPlayerData(player.id);
    if (pData) {
        if (!pData.blockBreakEvents) pData.blockBreakEvents = []; // Ensure array exists
        pData.blockBreakEvents.push(Date.now());
        // Note: prepareAndSavePlayerData might be called by addFlag if Nuker check flags
    }
}

/**
 * Handles block break events by players for X-Ray detection notifications.
 * @param {mc.PlayerBreakBlockAfterEvent} eventData
 * @param {object} config The configuration object
 * @param {object} playerUtils Module for utility functions like debugLog and notifyAdmins (or direct player.sendMessage)
 */
export function handlePlayerBreakBlockAfter(eventData, config, playerUtils) {
    if (!config.xrayDetectionNotifyOnOreMineEnabled) {
        return;
    }

    const player = eventData.player;
    const brokenBlockId = eventData.brokenBlockPermutation.type.id;

    if (config.xrayDetectionMonitoredOres.includes(brokenBlockId)) {
        const location = player.location; // Or eventData.block.location if more precise for future
        const prettyBlockName = brokenBlockId.replace("minecraft:", "");
        const message = `§7[§cX-Ray§7] §e${player.nameTag}§7 mined §b${prettyBlockName}§7 at §a${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}§7.`;

        playerUtils.debugLog(message, null); // Log all alerts for audit

        mc.world.getAllPlayers().forEach(adminPlayer => {
            if (adminPlayer.hasTag(config.adminTag)) {
                const wantsNotificationsExplicitly = adminPlayer.hasTag("xray_notify_on");
                const explicitlyDisabled = adminPlayer.hasTag("xray_notify_off");

                let shouldNotify = false;
                if (wantsNotificationsExplicitly) {
                    shouldNotify = true;
                } else if (config.xrayDetectionAdminNotifyByDefault && !explicitlyDisabled) {
                    shouldNotify = true;
                }

                if (shouldNotify) {
                    adminPlayer.sendMessage(message);
                }
            }
        });
    }
}

/**
 * Handles item use events for illegal item checks.
 * @param {mc.ItemUseBeforeEvent} eventData
 * @param {object} playerDataManager
 * @param {object} worldChecks Module or object containing world check functions
 */
export function handleItemUse(eventData, playerDataManager, worldChecks) {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity; // Cast to mc.Player
        const itemStack = eventData.itemStack;
        const pData = playerDataManager.getPlayerData(player.id);
        // Call Illegal Item Check
        if (worldChecks && worldChecks.checkIllegalItems) {
            worldChecks.checkIllegalItems(player, itemStack, eventData, "use", pData);
        }
    }
}

/**
 * Handles item use on block events for illegal item checks.
 * @param {mc.ItemUseOnBeforeEvent} eventData
 * @param {object} playerDataManager
 * @param {object} worldChecks Module or object containing world check functions
 */
export function handleItemUseOn(eventData, playerDataManager, worldChecks) {
    const playerEntity = eventData.source;
    if (playerEntity && playerEntity.typeId === 'minecraft:player') {
        const player = playerEntity; // Cast to mc.Player
        const itemStack = eventData.itemStack;
        const pData = playerDataManager.getPlayerData(player.id);
        // Call Illegal Item Check
        if (worldChecks && worldChecks.checkIllegalItems) {
            worldChecks.checkIllegalItems(player, itemStack, eventData, "place", pData);
        }
    }
}

/**
 * Handles chat messages before they are sent, checking for illegal characters.
 * @param {mc.PlayerChatSendBeforeEvent} eventData
 * @param {object} playerDataManager Module or object containing playerDataManager functions
 * @param {object} config The configuration object
 * @param {object} playerUtils Module for utility functions like debugLog
 */
export function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils) {
    const player = eventData.sender;
    if (!player) {
        console.warn("[AntiCheat] handleBeforeChatSend: eventData.sender is undefined. Skipping chat processing.");
        return;
    }

    // Mute Check - Placed at the very beginning
    if (playerDataManager.isMuted(player)) {
        eventData.cancel = true;
        const muteInfo = playerDataManager.getMuteInfo(player);
        let muteMsg = "§cYou are currently muted.";
        if (muteInfo) {
            if (muteInfo.unmuteTime === Infinity) {
                muteMsg += " (Permanent for this session)";
            } else {
                // Calculate remaining time for a more user-friendly message
                const remainingMs = muteInfo.unmuteTime - Date.now();
                if (remainingMs > 0) {
                    const remainingSeconds = Math.ceil(remainingMs / 1000);
                    const remainingMinutes = Math.floor(remainingSeconds / 60);
                    const actualSeconds = remainingSeconds % 60;
                    if (remainingMinutes > 0) {
                        muteMsg += ` (Expires in approx. ${remainingMinutes}m ${actualSeconds}s)`;
                    } else {
                        muteMsg += ` (Expires in approx. ${actualSeconds}s)`;
                    }
                } else {
                     // Should have been cleaned up by getMuteInfo, but as a fallback:
                    muteMsg += " (Expires: Past)";
                }
            }
            if (muteInfo.reason) {
                muteMsg += ` Reason: ${muteInfo.reason}`;
            }
        }
        try {
            player.onScreenDisplay.setActionBar(muteMsg);
        } catch (e) {
            playerUtils.debugLog(`Failed to set action bar for muted player ${player.nameTag}: ${e}`, player.nameTag);
        }
        return; // Stop further chat processing for muted player
    }

    const originalMessage = eventData.message;
    const rankDisplay = getPlayerRankDisplay(player);
    const formattedMessage = `${rankDisplay.chatPrefix}${player.name}§f: ${originalMessage}`; // Use player.name for the actual name
    const pData = playerDataManager.getPlayerData(player.id); // Get pData once for potential use in multiple checks

    // 1. Newline Character Check (on originalMessage)
    if (config.enableNewlineCheck) {
        const hasNewline = originalMessage.includes('\n') || originalMessage.includes('\r');
        if (hasNewline) {
            playerUtils.debugLog(`Player ${player.nameTag} attempted to send message with newline/carriage return: "${originalMessage}"`, player.nameTag);
            if (config.flagOnNewline && pData) {
                playerDataManager.addFlag(player, "illegalCharInChat", "Sent message with newline/carriage return characters.");
            }
            if (config.cancelMessageOnNewline) {
                eventData.cancel = true;
                playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to newline characters.`, player.nameTag);
                // Send a direct message to the player informing them their message was cancelled, if desired.
                // player.sendMessage("§cYour message was cancelled due to invalid characters.§r");
                return; // Stop further processing
            }
        }
    }

    // 2. Max Message Length Check (on originalMessage)
    if (config.enableMaxMessageLengthCheck) {
        if (originalMessage.length > config.maxMessageLength) {
            playerUtils.debugLog(`Player ${player.nameTag} attempted to send an overly long message (${originalMessage.length} > ${config.maxMessageLength}). Message: "${originalMessage.substring(0, 50)}..."`, player.nameTag);
            if (config.flagOnMaxMessageLength && pData) {
                playerDataManager.addFlag(player, "longMessage", `Sent message exceeding max length (${originalMessage.length}/${config.maxMessageLength}).`);
            }
            if (config.cancelOnMaxMessageLength) {
                eventData.cancel = true;
                playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to excessive length.`, player.nameTag);
                // player.sendMessage("§cYour message was cancelled because it was too long.§r");
                return; // Stop further processing
            }
        }
    }

    // 3. Repeated Messages (Spam) Check (on originalMessage)
    if (config.spamRepeatCheckEnabled) {
        if (pData) {
            const currentTime = Date.now();
            if (!pData.recentMessages) {
                pData.recentMessages = [];
            }
            pData.recentMessages.push({ timestamp: currentTime, content: originalMessage });

            const timeWindowStart = currentTime - (config.spamRepeatTimeWindowSeconds * 1000);
            pData.recentMessages = pData.recentMessages.filter(msg => msg.timestamp >= timeWindowStart);

            let repeatCount = 0;
            for (const msg of pData.recentMessages) {
                if (msg.content === originalMessage) {
                    repeatCount++;
                }
            }

            if (repeatCount >= config.spamRepeatMessageCount) {
                playerUtils.debugLog(`Player ${player.nameTag} triggered repeat spam detection. Count: ${repeatCount}, Original Message: "${originalMessage}"`, player.nameTag);
                if (config.spamRepeatFlagPlayer) {
                    playerDataManager.addFlag(player, "spamRepeat", `Repeated message ${repeatCount} times: "${originalMessage.substring(0,30)}..."`);
                }
                if (config.spamRepeatCancelMessage) {
                    eventData.cancel = true;
                    playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to repeat spam.`, player.nameTag);
                    // player.sendMessage("§cYour message was cancelled due to spam.§r");
                    return; // Stop further processing
                }
            }
        } else {
            playerUtils.debugLog(`PDM:spamRepeat: No pData for ${player.nameTag}. Cannot check for repeat spam.`, player.nameTag);
        }
    }

    // 4. Send Formatted Message
    // If we've reached this point, the message was not cancelled by any of the above checks.
    eventData.cancel = true; // Cancel the original event to prevent default Minecraft chat behavior

    // Send the formatted message manually to all players (or use world.sendMessage if that's preferred for global chat)
    // mc.world.sendMessage(formattedMessage); // This sends to everyone
    // To send only to the player (like a preview or if chat is handled differently):
    // player.sendMessage(formattedMessage);
    // For typical server chat, it should be broadcast.
    // The original event would have broadcast it. So we replicate that.
    // However, world.sendMessage does not show in the chat UI of the sender if they have chat off.
    // A common pattern is to iterate all players and send them the message.
    for (const p of mc.world.getAllPlayers()) {
        p.sendMessage(formattedMessage);
    }
    // player.sendMessage(formattedMessage); // This might be redundant if the player is in getAllPlayers()

    // If there's a specific requirement to only simulate the original broadcast without sending to each player individually,
    // and if `eventData.message = formattedMessage; eventData.cancel = false;` was the old way,
    // then the new way must ensure the formatted message reaches everyone as the original would have.
    // The most direct way to ensure everyone (including sender) sees it in their chat UI is per-player sendMessage.
}
