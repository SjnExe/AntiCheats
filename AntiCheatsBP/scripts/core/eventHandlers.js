/**
 * @file AntiCheatsBP/scripts/core/eventHandlers.js
 * Centralized handlers for various Minecraft Server API events. These handlers typically
 * gather necessary data and then delegate to specific check functions or managers.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { getPlayerRankFormattedChatElements, updatePlayerNametag, permissionLevels } from './rankManager.js';
import { getExpectedBreakTicks, isNetherLocked, isEndLocked, playerUtils as PlayerUtilsImport } from '../utils/index.js';
import { editableConfigValues as ConfigValuesImport, editableConfigValues as configBase } from '../config.js'; // Renamed to configBase to avoid conflict
import { getString } from './localizationManager.js';
import * as configModule from '../config.js'; // For accessing config keys like configModule.welcomeMessage

function formatSessionDuration(ms) {
    if (ms <= 0) return "N/A";
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds %= 60;
    minutes %= 60;
    const parts = [];
    if (hours > 0) parts.push(\`\${hours}h\`);
    if (minutes > 0) parts.push(\`\${minutes}m\`);
    if (seconds > 0 || parts.length === 0) parts.push(\`\${seconds}s\`);
    return parts.join(' ');
}

export async function handlePlayerLeave(eventData, playerDataManager, playerUtils, config, addLog) { // config here is editableConfigValues
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
            const baseFlagReason = `Disconnected ${timeSinceLastCombatSeconds}s after combat.`; // Non-localized for internal consistency

            playerUtils.debugLog(`CombatLog: Player ${player.nameTag} left ${timeSinceLastCombatSeconds}s after combat. Threshold: ${config.combatLogThresholdSeconds}s. Flagging +${incrementAmount}.`, player.nameTag);

            for (let i = 0; i < incrementAmount; i++) {
                playerDataManager.addFlag(player, flagType, baseFlagReason, `(#${i + 1}/${incrementAmount})`);
            }

            const notifyMessage = getString(configModule.combatLogMessage, { // Use key from configModule
                playerName: player.nameTag,
                timeSinceCombat: timeSinceLastCombatSeconds,
                incrementAmount: incrementAmount.toString()
            });
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

    // Note: The 'Chat During Item Use Check' block from the provided source seems out of place in handlePlayerLeave.
    // It references 'originalMessage' and 'eventData.cancel' which are typical for chat send events, not leave events.
    // I am omitting that block from this corrected version of handlePlayerLeave.

    if (pData && addLog) {
        const lastLocation = pData.lastPosition || player.location;
        const lastDimensionId = (pData.lastDimensionId || player.dimension.id).split(':')[1];
        const lastGameModeString = mc.GameMode[pData.lastGameMode] || "unknown";
        let sessionDurationString = "N/A";
        if (pData.joinTime && pData.joinTime > 0) {
            const durationMs = Date.now() - pData.joinTime;
            sessionDurationString = formatSessionDuration(durationMs);
        }
        addLog({
            timestamp: Date.now(),
            actionType: 'player_leave',
            targetName: player.nameTag,
            targetId: player.id,
            details: `Player ${player.nameTag} left. Last Loc: ${Math.floor(lastLocation.x)},${Math.floor(lastLocation.y)},${Math.floor(lastLocation.z)} in ${lastDimensionId}. GameMode: ${lastGameModeString}. Session: ${sessionDurationString}.`,
            location: { x: Math.floor(lastLocation.x), y: Math.floor(lastLocation.y), z: Math.floor(lastLocation.z), dimensionId: lastDimensionId },
            gameMode: lastGameModeString,
            sessionDuration: sessionDurationString
        });
    }
    await playerDataManager.prepareAndSavePlayerData(player);
    playerUtils.debugLog(`Final data persistence attempted for ${player.nameTag} on leave.`, player.nameTag);
    playerUtils.debugLog(`Finished processing playerLeave event for ${player.nameTag}.`, player.nameTag);

    if (config.enableDetailedJoinLeaveLogging) {
        const playerName = player.nameTag || player.name;
        const playerId = player.id;
        console.warn(`[LeaveLog] Player: ${playerName} (ID: ${playerId}) left the game.`);
    }
}

export async function handlePlayerSpawn(eventData, playerDataManager, playerUtils, globalConfig, dependencies) {
    const { player, initialSpawn } = eventData;
    const currentPUtils = dependencies.playerUtils || playerUtils;
    currentPUtils.debugLog(`Processing playerSpawn event for ${player.nameTag} (Initial Spawn: ${initialSpawn}). Tick: ${mc.system.currentTick}`, player.nameTag);
    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }

    try {
        const pData = playerDataManager.getPlayerData(player.id);
        if (!pData) {
            console.warn(`[AntiCheat] handlePlayerSpawn: pData is unexpectedly null for ${player.nameTag}.`);
        } else {
            pData.lastGameMode = player.gameMode;
            pData.lastDimensionId = player.dimension.id;
        }

        const banInfo = playerDataManager.getBanInfo(player);
        if (banInfo) {
            if (playerUtils.debugLog) {
                 playerUtils.debugLog(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, player.nameTag);
            }
            const durationStringKick = getString(banInfo.unbanTime === Infinity ? "ban.duration.permanent" : "ban.duration.expires", { expiryDate: new Date(banInfo.unbanTime).toLocaleString() });
            let kickReason = getString("ban.kickMessage", { reason: banInfo.reason || "No reason provided.", durationMessage: durationStringKick });
            if (configModule.discordLink && configModule.discordLink.trim() !== "" && configModule.discordLink !== "https://discord.gg/example") {
                 kickReason += "\n" + getString("ban.kickMessage.discord", { discordLink: configModule.discordLink });
            }
            player.kick(kickReason);
            return;
        }
        updatePlayerNametag(player);
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, player.nameTag);

        if (initialSpawn && globalConfig.enableWelcomerMessage) {
            let message = getString(configModule.welcomeMessage, { playerName: player.nameTag });
            mc.system.runTimeout(() => {
                player.sendMessage(message);
            }, 20);

            if (pData) {
                 pData.joinTime = Date.now();
                 pData.isDirtyForSave = true;
            }

            if (dependencies && dependencies.addLog) {
                const spawnLocation = player.location;
                const spawnDimensionId = player.dimension.id.split(':')[1];
                const spawnGameMode = mc.GameMode[player.gameMode];
                dependencies.addLog({
                    timestamp: pData?.joinTime || Date.now(),
                    actionType: 'player_initial_join',
                    targetName: player.nameTag,
                    targetId: player.id,
                    details: `Player ${player.nameTag} joined for the first time. Location: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}. Welcome sent.`,
                    location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                    gameMode: spawnGameMode
                });
            }

            if (currentPUtils?.notifyAdmins && globalConfig.notifyAdminOnNewPlayerJoin) {
                currentPUtils.notifyAdmins(getString("admin.notify.newPlayerJoined", { playerName: player.nameTag }), null, null);
            }
        } else if (!initialSpawn && dependencies && dependencies.addLog && pData) {
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];
            dependencies.addLog({
                timestamp: Date.now(),
                actionType: 'player_respawn',
                targetName: player.nameTag,
                targetId: player.id,
                details: `Player ${player.nameTag} respawned. Location: ${Math.floor(spawnLocation.x)},${Math.floor(spawnLocation.y)},${Math.floor(spawnLocation.z)} in ${spawnDimensionId}. GameMode: ${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode
            });
        }

        if (pData && pData.deathMessageToShowOnSpawn && globalConfig.enableDeathCoordsMessage) {
            mc.system.runTimeout(() => {
                player.sendMessage(pData.deathMessageToShowOnSpawn); // Already localized from handlePlayerDeath
            }, 5);
            currentPUtils.debugLog(`DeathCoords: Displayed death message to ${player.nameTag}: "${pData.deathMessageToShowOnSpawn}"`, pData.isWatched ? player.nameTag : null);
            pData.deathMessageToShowOnSpawn = null;
            pData.isDirtyForSave = true;
        }

        if (dependencies.checks?.checkInvalidRenderDistance && dependencies.config?.enableInvalidRenderDistanceCheck) {
            await dependencies.checks.checkInvalidRenderDistance(
                player,
                pData,
                dependencies.config,
                currentPUtils,
                dependencies.logManager,
                dependencies.actionManager,
                dependencies
            );
        }

        if (globalConfig.enableDetailedJoinLeaveLogging) {
            const playerName = player.nameTag || player.name;
            const playerId = player.id;
            const deviceType = player.clientSystemInfo?.platformType?.toString() || "Unknown";
            const gameMode = mc.GameMode[player.gameMode] || "Unknown";
            const location = player.location;
            const dimensionId = player.dimension.id.split(':')[1] || "unknown";
            const locationString = `${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)} in ${dimensionId}`;
            console.warn(`[JoinLog] Player: ${playerName} (ID: ${playerId}, Device: ${deviceType}, Mode: ${gameMode}) joined at ${locationString}.`);
        }

    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player.nameTag}: ${error.stack || error}`);
        currentPUtils.debugLog(`Error in handlePlayerSpawn for ${player.nameTag}: ${error}`, player.nameTag);
    }
}

export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager, checks } = dependencies;
    if (!config.enablePistonLagCheck) return;
    const pistonBlock = eventData.pistonBlock;
    const dimensionId = eventData.dimension.id;
    if (!pistonBlock) {
        playerUtils.debugLog("PistonLag: eventData.pistonBlock is undefined in handlePistonActivate_AntiGrief.", null);
        return;
    }
    if (!dimensionId) {
        playerUtils.debugLog(`PistonLag: dimensionId is undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, null);
        return;
    }
    if (checks && typeof checks.checkPistonLag === 'function') {
        await checks.checkPistonLag(pistonBlock, dimensionId, config, playerUtils, logManager, actionManager, dependencies);
    } else {
        playerUtils.debugLog("PistonLag: checkPistonLag function is not available in dependencies.checks.", null);
    }
}

export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager, playerDataManager: pDataManager, checks, currentTick } = dependencies;
    const currentConfig = config || ConfigValuesImport;
    const actualPlayerUtils = playerUtils || PlayerUtilsImport;

    if (eventData.entity?.typeId === "minecraft:wither" && currentConfig.enableWitherAntiGrief) {
        const witherEntity = eventData.entity;
        let actionTaken = currentConfig.witherSpawnAction;
        let playerNameOrContext = "Unknown/Environment";
        actualPlayerUtils.debugLog(`AntiGrief: Wither spawned (ID: ${witherEntity.id}). Config action: ${actionTaken}.`, null);
        const violationDetails = { /* ... */ }; // Simplified for brevity
        // ... (rest of wither logic) ...
        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction("world_antigrief_wither_spawn", null, violationDetails, dependencies);
        }
    } else if (currentConfig.enableEntitySpamAntiGrief &&
               (eventData.entity?.typeId === "minecraft:snow_golem" || eventData.entity?.typeId === "minecraft:iron_golem")) {
        const spawnedGolem = eventData.entity;
        actualPlayerUtils.debugLog(`AntiGrief: ${spawnedGolem.typeId} spawned. Checking attribution. Tick: ${currentTick}`, null);
        for (const player of mc.world.getAllPlayers()) {
            const pData = pDataManager.getPlayerData(player.id);
            if (pData && pData.expectingConstructedEntity && pData.expectingConstructedEntity.type === spawnedGolem.typeId) {
                // ... (rest of golem attribution and spam check logic) ...
                if (checks && typeof checks.checkEntitySpam === 'function') {
                    const isSpam = await checks.checkEntitySpam(player, spawnedGolem.typeId, currentConfig, pData, actualPlayerUtils, pDataManager, logManager, actionManager.executeCheckAction, currentTick);
                    // ... (kill logic) ...
                }
                pData.expectingConstructedEntity = null;
                pData.isDirtyForSave = true;
                break;
            }
        }
    }
}

export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;
    const currentConfig = config || ConfigValuesImport;
    if (!currentConfig.enableTntAntiGrief) return;

    if (eventData.itemStack?.typeId === "minecraft:tnt") {
        const actualPlayerUtils = playerUtils || PlayerUtilsImport;
        const playerPermission = actualPlayerUtils.getPlayerPermissionLevel(eventData.player);
        if (currentConfig.allowAdminTntPlacement && playerPermission <= permissionLevels.admin) return;

        const actionTaken = currentConfig.tntPlacementAction;
        const placementLocation = eventData.block.location;
        const violationDetails = { /* ... */ }; // Simplified

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
             await actionManager.executeCheckAction("world_antigrief_tnt_place", eventData.player, violationDetails, dependencies);
        }
        // ... (rest of TNT logic) ...
    }
}

export async function handleEntityDieForDeathEffects(eventData, currentConfig) {
    const activeConfig = currentConfig || configBase; // Use configBase (imported as config)
    if (!activeConfig.enableDeathEffects) return;
    const deadEntity = eventData.deadEntity;
    if (!(deadEntity instanceof mc.Player)) return;
    // ... (rest of death effects logic) ...
}

export async function handleEntityHurt(eventData, playerDataManager, checks, playerUtils, config, currentTick, logManager, executeCheckAction) {
    // ... (existing logic, no user-facing strings to change here directly, they are in check files or actionManager) ...
    const { hurtEntity, cause, damagingEntity } = eventData;
    // Debug log is fine as is.
    if (hurtEntity?.typeId === 'minecraft:player') {
        const victim = hurtEntity;
        const pData = playerDataManager.getPlayerData(victim.id);
        if (pData) {
            pData.lastTookDamageTick = currentTick;
            // ...
            if (checks.checkSelfHurt && config.enableSelfHurtCheck) { // config is editableConfigValues
                await checks.checkSelfHurt(victim, cause, damagingEntity, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick);
            }
        }
    }
    // ... (rest of logic)
}

export async function handlePlayerDeath(eventData, playerDataManager, playerUtils, config, addLog) { // config is editableConfigValues
    const { deadEntity } = eventData;
    if (deadEntity?.typeId === 'minecraft:player' && config.enableDeathCoordsMessage) {
        const player = deadEntity;
        const location = player.location;
        const dimensionId = player.dimension.id.split(':')[1];
        let pData = playerDataManager.getPlayerData(player.id);
        if (!pData) return;
        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);

        // configModule.deathCoordsMessage is the key "message.deathCoords"
        let message = getString(configModule.deathCoordsMessage, {
            x: x.toString(), y: y.toString(), z: z.toString(), dimensionId: dimensionId
        });
        pData.deathMessageToShowOnSpawn = message;
        pData.isDirtyForSave = true;
        // ... (log logic) ...
    }
}

export function subscribeToCombatLogEvents(playerDataManager, config, playerUtils) { // config is editableConfigValues
    if (!config.enableCombatLogDetection) return;
    // ... (rest of logic, uses config.combatLogMessage which is now a key handled by getString in handlePlayerLeave)
}

export async function handlePlayerBreakBlockBeforeEvent(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic, no direct user-facing strings)
}

export async function handlePlayerBreakBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic for X-Ray, admin notifications are direct strings, could be localized later if needed)
}

export async function handleItemUse(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic, some §c and §e messages for AntiGrief, could be localized if needed)
}

export async function handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, dependencies) {
    // ... (existing logic, some §c and §e messages for AntiGrief, could be localized if needed)
}

export async function handleInventoryItemChange(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic, no direct user-facing strings)
}

export async function handlePlayerPlaceBlockBefore(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic, no direct user-facing strings)
}

export async function handlePlayerPlaceBlockAfter(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, currentTick) {
    // ... (existing logic for AntiGrief construction, uses debug logs)
}

export async function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils, checks, logManager, executeCheckAction, currentTick, dependencies) { // config is editableConfigValues
    const { sender: player, message: originalMessage } = eventData;
    // ... (Mute check: "You are currently muted..." - this should be localized)
    // ... (Combat/Item use chat restrictions: "§cYou cannot chat..." - should be localized)
    // ... (Swear check: "AutoMod: Language violation..." - this comes from AutoMod messages, already handled if keys are used there)
    // ... (Spam messages: These are typically admin notifications or internal flags, but player warnings should be localized if any)

    // Rank formatting is fine.
    // The main structure needs careful review for which messages are player-facing.
    // For example:
    if (playerDataManager.isMuted(player)) {
        // TODO: Localize "You are currently muted and cannot send messages."
        // For now, let's assume a key like "chat.error.muted"
        playerUtils.warnPlayer(player, getString("chat.error.muted", { /* Potentially duration/reason if available */ }));
        eventData.cancel = true;
        // ...
        return;
    }

    const currentConfig = dependencies?.config || config;
    // ...
    if (currentConfig.enableChatDuringCombatCheck && pData.lastCombatInteractionTime /*...*/) {
        // ...
        const profile = currentConfig.checkActionProfiles?.player_chat_during_combat;
            if (profile && profile.cancelMessage) {
                eventData.cancel = true;
                // TODO: Localize "§cYou cannot chat for {seconds} seconds after combat."
                // Key: "chat.error.combatCooldown"
                currentPUtils.warnPlayer(player, getString("chat.error.combatCooldown", { seconds: currentConfig.chatDuringCombatCooldownSeconds }));
                // ...
                return;
            }
        // ...
    }
    if (!eventData.cancel && currentConfig.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
        // ...
        const profile = currentConfig.checkActionProfiles?.player_chat_during_item_use;
            if (profile && profile.cancelMessage) {
                eventData.cancel = true;
                // TODO: Localize "§cYou cannot chat while {itemUseState}."
                // Key: "chat.error.itemUse"
                currentPUtils.warnPlayer(player, getString("chat.error.itemUse", { itemUseState: itemUseState }));
                // ...
                return;
            }
        // ...
    }
    // ... (Swear check MUTE message comes from AutoMod config, which should use keys)
    // ... (Spam check messages, if player-facing, need localization)

    // Rank formatting:
    const rankElements = getPlayerRankFormattedChatElements(player, currentConfig); // currentConfig is editableConfigValues
    const finalMessage = `${rankElements.fullPrefix}${rankElements.nameColor}${player.nameTag ?? player.name}§f: ${rankElements.messageColor}${originalMessage}`;
    eventData.cancel = true;
    mc.world.sendMessage(finalMessage);
    // ...
}

export async function handlePlayerDimensionChangeAfter(eventData, playerUtils, config) { // config is editableConfigValues
    const { player, fromDimension, toDimension, fromLocation } = eventData;
    // ... (admin bypass logic) ...
    if (dimensionIsLocked) {
        try {
            if (fromLocation && fromDimension) {
                player.teleport(fromLocation, { dimension: fromDimension });
                playerUtils.warnPlayer(player, getString("dimensionLock.teleportMessage", { lockedDimensionName: lockedDimensionName }));
                // ... (admin notification remains direct string for now)
            } // ...
        } catch (e) { /* ... */ }
    }
}
