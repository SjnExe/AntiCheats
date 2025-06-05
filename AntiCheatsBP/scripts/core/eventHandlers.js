import * as mc from '@minecraft/server';
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
    if (!config.XRAY_DETECTION_NOTIFY_ON_ORE_MINE_ENABLED) {
        return;
    }

    const player = eventData.player;
    const brokenBlockId = eventData.brokenBlockPermutation.type.id;

    if (config.XRAY_DETECTION_MONITORED_ORES.includes(brokenBlockId)) {
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
                } else if (config.XRAY_DETECTION_ADMIN_NOTIFY_BY_DEFAULT && !explicitlyDisabled) {
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
    const message = eventData.message;

    // Newline character check
    if (config.enableNewlineCheck) {
        const hasNewline = message.includes('\n') || message.includes('\r');

        if (hasNewline) {
            playerUtils.debugLog(`Player ${player.nameTag} attempted to send message with newline/carriage return: "${message}"`, player.nameTag);

            if (config.cancelMessageOnNewline) {
                eventData.cancel = true;
                playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to newline characters.`, player.nameTag);
            }

            if (config.flagOnNewline) {
                // It's possible pData was already fetched if we restructure, but for now, this is fine.
                const pData = playerDataManager.getPlayerData(player.id);
                if (pData) {
                    playerDataManager.addFlag(player, "illegalCharInChat", "Sent message with newline/carriage return characters.");
                } else {
                    playerUtils.debugLog(`Could not retrieve pData for ${player.nameTag} to flag for illegalCharInChat.`, player.nameTag);
                }
            }
        }
    }

    // Max message length check
    // Also check !eventData.cancel so we don't flag/cancel twice if newline check already did.
    if (config.enableMaxMessageLengthCheck && !eventData.cancel) {
        if (message.length > config.maxMessageLength) {
            playerUtils.debugLog(`Player ${player.nameTag} attempted to send an overly long message (${message.length} > ${config.maxMessageLength}). Message: "${message.substring(0, 50)}..."`, player.nameTag);

            if (config.cancelOnMaxMessageLength) {
                eventData.cancel = true;
                playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to excessive length.`, player.nameTag);
            }

            if (config.flagOnMaxMessageLength) {
                const pData = playerDataManager.getPlayerData(player.id);
                if (pData) {
                    playerDataManager.addFlag(player, "longMessage", `Sent message exceeding max length (${message.length}/${config.maxMessageLength}).`);
                } else {
                    playerUtils.debugLog(`Could not retrieve pData for ${player.nameTag} to flag for longMessage.`, player.nameTag);
                }
            }
        }
    }

    // Repeated Messages (Spam) Check
    // Also check !eventData.cancel so we don't process if already cancelled by prior checks.
    if (config.SPAM_REPEAT_CHECK_ENABLED && !eventData.cancel) {
        const pData = playerDataManager.getPlayerData(player.id);
        if (pData) {
            const currentTime = Date.now();
            const currentMessageContent = eventData.message;

            if (!pData.recentMessages) {
                pData.recentMessages = [];
            }
            pData.recentMessages.push({ timestamp: currentTime, content: currentMessageContent });

            const timeWindowStart = currentTime - (config.SPAM_REPEAT_TIME_WINDOW_SECONDS * 1000);
            pData.recentMessages = pData.recentMessages.filter(msg => msg.timestamp >= timeWindowStart);

            let repeatCount = 0;
            for (const msg of pData.recentMessages) {
                if (msg.content === currentMessageContent) {
                    repeatCount++;
                }
            }

            if (repeatCount >= config.SPAM_REPEAT_MESSAGE_COUNT) {
                playerUtils.debugLog(`Player ${player.nameTag} triggered repeat spam detection. Count: ${repeatCount}, Message: "${currentMessageContent}"`, player.nameTag);

                if (config.SPAM_REPEAT_FLAG_PLAYER) {
                    playerDataManager.addFlag(player, "spamRepeat", `Repeated message ${repeatCount} times: "${currentMessageContent.substring(0,30)}..."`);
                }

                if (config.SPAM_REPEAT_CANCEL_MESSAGE) {
                    eventData.cancel = true;
                    playerUtils.debugLog(`Cancelled message from ${player.nameTag} due to repeat spam.`, player.nameTag);
                }
            }
        } else {
            playerUtils.debugLog(`PDM:spamRepeat: No pData for ${player.nameTag}. Cannot check for repeat spam.`, player.nameTag);
        }
    }
}
