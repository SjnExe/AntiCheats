/**
 * @file AntiCheatsBP/scripts/main.js
 * Main entry point for the AntiCheat system. Initializes modules, subscribes to events,
 * and runs the main tick loop for processing checks and player data.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import * as configModule from './config.js';
import * as playerUtils from './utils/playerUtils.js';
import * as playerDataManager from './core/playerDataManager.js';
import * as commandManager from './core/commandManager.js';
import * as uiManager from './core/uiManager.js';
import * as eventHandlers from './core/eventHandlers.js';
import * as logManager from './core/logManager.js';
import * as reportManager from './core/reportManager.js';
import * as tpaManager from './core/tpaManager.js';
import * as actionManager from './core/actionManager.js';
import { permissionLevels as importedPermissionLevels } from './core/rankManager.js';
import { ActionFormData as ImportedActionFormData, MessageFormData as ImportedMessageFormData, ModalFormData as ImportedModalFormData } from '@minecraft/server-ui';
import { ItemComponentTypes as ImportedItemComponentTypes } from '@minecraft/server';
import * as checks from './checks/index.js';
import { getBorderSettings, saveBorderSettings, processWorldBorderResizing, enforceWorldBorderForPlayer } from './utils/worldBorderManager.js';
import * as chatProcessor from './core/chatProcessor.js';

playerUtils.debugLog("Anti-Cheat Script Loaded. Initializing modules...", null, getStandardDependencies());

mc.world.beforeEvents.chatSend.subscribe(async (eventData) => {
    const baseDependencies = {
        config: configModule.editableConfigValues,
        playerUtils,
        playerDataManager,
        logManager,
        actionManager,
        uiManager,
        reportManager,
        tpaManager,
        checks,
        mc,
        currentTick,
        permissionLevels: importedPermissionLevels,
        ActionFormData: ImportedActionFormData,
        MessageFormData: ImportedMessageFormData,
        ModalFormData: ImportedModalFormData,
        ItemComponentTypes: ImportedItemComponentTypes,
    };

    if (eventData.message.startsWith(baseDependencies.config.prefix)) {
        const commandHandlingDependencies = {
            ...baseDependencies,
            commandManager: commandManager,
            commandDefinitionMap: commandManager.commandDefinitionMap,
            commandExecutionMap: commandManager.commandExecutionMap,
        };
        await commandManager.handleChatCommand(eventData, commandHandlingDependencies);
    } else {
        const chatEventDependencies = {
            ...baseDependencies,
        };
        await eventHandlers.handleBeforeChatSend(eventData, chatEventDependencies);
    }
});

mc.world.beforeEvents.playerJoin.subscribe(async (eventData) => {
    const player = eventData.player;
    const dependencies = {
        config: configModule.editableConfigValues,
        playerUtils: playerUtils,
        playerDataManager: playerDataManager,
    };

    await dependencies.playerDataManager.ensurePlayerDataInitialized(player, currentTick);

    if (dependencies.playerDataManager.isBanned(player, dependencies)) {
        eventData.cancel = true;
        const banInfo = dependencies.playerDataManager.getBanInfo(player, dependencies);
        let detailedKickMessage = `§cYou are banned from this server.\n`;
        if (banInfo) {
            detailedKickMessage += `§fBanned by: §e${banInfo.bannedBy || "Unknown"}\n`;
            detailedKickMessage += `§fReason: §e${banInfo.reason || "No reason provided."}\n`;
            detailedKickMessage += `§fExpires: §e${banInfo.unbanTime === Infinity ? "Permanent" : new Date(banInfo.unbanTime).toLocaleString()}\n`;
        } else {
            detailedKickMessage += `§fReason: §eSystem detected an active ban, but details could not be fully retrieved. Please contact an admin.\n`;
        }

        if (dependencies.config.discordLink && dependencies.config.discordLink.trim() !== "" && dependencies.config.discordLink !== "https://discord.gg/example") {
            detailedKickMessage += `§fDiscord: §b${dependencies.config.discordLink}`;
        }
        const logMessage = `[AntiCheat] Banned player ${player.nameTag} (ID: ${player.id}) attempt to join. Ban details: By ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}, Expires: ${banInfo?.unbanTime === Infinity ? "Permanent" : new Date(banInfo?.unbanTime).toLocaleString()}`;
        console.warn(logMessage);
        if (dependencies.playerUtils.notifyAdmins) {
            dependencies.playerUtils.notifyAdmins(`Banned player ${player.nameTag} tried to join. Banned by: ${banInfo?.bannedBy || "N/A"}, Reason: ${banInfo?.reason || "N/A"}`, null);
        }
    }
});

const getStandardDependencies = () => ({
    config: configModule.editableConfigValues,
    playerUtils,
    playerDataManager,
    logManager,
    actionManager,
    uiManager,
    reportManager,
    tpaManager,
    checks,
    mc,
    currentTick,
    permissionLevels: importedPermissionLevels,
    ActionFormData: ImportedActionFormData,
    MessageFormData: ImportedMessageFormData,
    ModalFormData: ImportedModalFormData,
    ItemComponentTypes: ImportedItemComponentTypes,
    chatProcessor: chatProcessor,
});

mc.world.afterEvents.playerSpawn.subscribe((eventData) => {
    eventHandlers.handlePlayerSpawn(eventData, getStandardDependencies());
});

mc.world.beforeEvents.playerLeave.subscribe((eventData) => {
    eventHandlers.handlePlayerLeave(eventData, getStandardDependencies());
});

mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    const deps = getStandardDependencies();
    eventHandlers.handleEntityHurt(eventData, deps);
});

eventHandlers.subscribeToCombatLogEvents({
    config: configModule.editableConfigValues, playerDataManager, playerUtils
});

mc.world.beforeEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockBeforeEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerBreakBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerBreakBlockAfterEvent(eventData, getStandardDependencies());
});

mc.world.beforeEvents.itemUse.subscribe(async (eventData) => {
    await eventHandlers.handleItemUse(eventData, getStandardDependencies());
});

mc.world.beforeEvents.itemUseOn.subscribe(async (eventData) => {
    await eventHandlers.handleItemUseOn(eventData, getStandardDependencies());
});

mc.world.beforeEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockBefore(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerPlaceBlock.subscribe(async (eventData) => {
    await eventHandlers.handlePlayerPlaceBlockAfterEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.playerInventoryItemChange.subscribe(async (eventData) => {
    await eventHandlers.handleInventoryItemChange(eventData.player, eventData.newItem, eventData.oldItem, eventData.slotName, getStandardDependencies());
});

mc.world.afterEvents.playerDimensionChange.subscribe((eventData) => {
    // This handler might only need a subset, adjust if necessary
    eventHandlers.handlePlayerDimensionChangeAfterEvent(eventData, getStandardDependencies());
});

mc.world.afterEvents.entityDie.subscribe((eventData) => {
    const dependencies = getStandardDependencies();
    if (eventData.deadEntity.typeId === 'minecraft:player') {
        eventHandlers.handlePlayerDeath(eventData, dependencies);
    }
    eventHandlers.handleEntityDieForDeathEffects(eventData, dependencies);
});

mc.world.afterEvents.entitySpawn.subscribe(async (eventData) => {
    await eventHandlers.handleEntitySpawnEvent_AntiGrief(eventData, getStandardDependencies());
});

mc.world.afterEvents.pistonActivate.subscribe(async (eventData) => {
    await eventHandlers.handlePistonActivate_AntiGrief(eventData, getStandardDependencies());
});

mc.system.runInterval(() => {
    const tpaIntervalDependencies = getStandardDependencies();
    if (tpaIntervalDependencies.config.enableTPASystem) {
        tpaManager.clearExpiredRequests(tpaIntervalDependencies);
        const requestsInWarmup = tpaManager.getRequestsInWarmup();
        for (const request of requestsInWarmup) {
            if (Date.now() >= request.warmupExpiryTimestamp) {
                tpaManager.executeTeleport(request.requestId, tpaIntervalDependencies);
            }
        }
    }
}, 20);

mc.world.beforeEvents.entityHurt.subscribe(eventData => {
    const tpaEntityHurtDependencies = getStandardDependencies();
    if (!tpaEntityHurtDependencies.config.enableTPASystem) return;
    const { hurtEntity, damageSource } = eventData;
    let playerNameTag;
    try {
        playerNameTag = hurtEntity.nameTag;
        if (typeof playerNameTag !== 'string') return;
    } catch (e) { return; }

    const requestsInWarmup = tpaManager.getRequestsInWarmup();
    const playerActiveWarmupRequests = requestsInWarmup.filter(
        req => req.requesterName === playerNameTag || req.targetName === playerNameTag
    );
    for (const request of playerActiveWarmupRequests) {
        if (request.status === 'pending_teleport_warmup') {
            let playerIsTeleporting = false;
            if (request.requestType === 'tpa' && request.requesterName === playerNameTag) playerIsTeleporting = true;
            else if (request.requestType === 'tpahere' && request.targetName === playerNameTag) playerIsTeleporting = true;

            if (playerIsTeleporting) {
                const damageCause = damageSource?.cause || 'unknown';
                const reasonMsgPlayer = `Teleport cancelled: You took damage (${damageCause}) during warmup.`;
                const reasonMsgLog = `Player ${playerNameTag} took damage (cause: ${damageCause}) during TPA warm-up for request ${request.requestId}.`;
                tpaManager.cancelTeleport(request.requestId, reasonMsgPlayer, reasonMsgLog, tpaEntityHurtDependencies);
                break;
            }
        }
    }
});

let currentTick = 0;

mc.system.runInterval(async () => {
    currentTick++;

    if (typeof reportManager.initializeReportCache === 'function' && !reportManager.isInitialized) {
        const initDeps = getStandardDependencies();
        reportManager.initializeReportCache(initDeps);
        reportManager.isInitialized = true;
        playerUtils.debugLog("ReportManager cache initialized from main tick loop (failsafe).", "System", initDeps);
    }

    const tickDependencies = getStandardDependencies();

    if (tickDependencies.config.enableWorldBorderSystem) {
        try {
            processWorldBorderResizing(tickDependencies);
        } catch (e) {
            console.error(`[MainTick] Error processing world border resizing: ${e.stack || e}`);
            playerUtils.debugLog(`[MainTick] Error processing world border resizing: ${e.message}`, "System", tickDependencies);
        }
    }

    const allPlayers = mc.world.getAllPlayers();
    playerDataManager.cleanupActivePlayerData(allPlayers);


    for (const player of allPlayers) {
        const pData = await playerDataManager.ensurePlayerDataInitialized(player, currentTick);
        if (!pData) {
            if (playerUtils.debugLog) playerUtils.debugLog(`Critical: pData not available for ${player.nameTag} in tick loop after ensure.`, player.nameTag, tickDependencies);
            continue;
        }

        pData.lastBorderVisualTick = pData.lastBorderVisualTick || 0;
        pData.ticksOutsideBorder = pData.ticksOutsideBorder || 0;
        pData.borderDamageApplications = pData.borderDamageApplications || 0;

        tickDependencies.playerDataManager.updateTransientPlayerData(player, pData, tickDependencies);

        tickDependencies.playerDataManager.clearExpiredItemUseStates(pData, tickDependencies);

        if (tickDependencies.config.enableFlyCheck && checks.checkFly) await checks.checkFly(player, pData, tickDependencies);
        if (tickDependencies.config.enableSpeedCheck && checks.checkSpeed) await checks.checkSpeed(player, pData, tickDependencies);
        if (tickDependencies.config.enableNofallCheck && checks.checkNoFall) await checks.checkNoFall(player, pData, tickDependencies);
        if (tickDependencies.config.enableNoSlowCheck && checks.checkNoSlow) await checks.checkNoSlow(player, pData, tickDependencies);
        if (tickDependencies.config.enableInvalidSprintCheck && checks.checkInvalidSprint) await checks.checkInvalidSprint(player, pData, tickDependencies);

        if (tickDependencies.config.enableCPSCheck && checks.checkCPS) await checks.checkCPS(player, pData, tickDependencies, null);
        if (tickDependencies.config.enableViewSnapCheck && checks.checkViewSnap) await checks.checkViewSnap(player, pData, tickDependencies, null);

        if (tickDependencies.config.enableNukerCheck && checks.checkNuker) {
            await checks.checkNuker(player, pData, tickDependencies);
        }

        if (tickDependencies.config.enableAutoToolCheck && checks.checkAutoTool &&
            (currentTick - (pData.lastCheckAutoToolTick || 0) >= tickDependencies.config.autoToolCheckIntervalTicks)) {
            await checks.checkAutoTool(player, pData, tickDependencies);
            pData.lastCheckAutoToolTick = currentTick;
        }

        if (tickDependencies.config.enableNameSpoofCheck && checks.checkNameSpoof &&
            (currentTick - (pData.lastCheckNameSpoofTick || 0) >= tickDependencies.config.nameSpoofCheckIntervalTicks)) {
            await checks.checkNameSpoof(player, pData, tickDependencies);
            pData.lastCheckNameSpoofTick = currentTick;
        }

        if (tickDependencies.config.enableAntiGMCCheck && checks.checkAntiGMC &&
            (currentTick - (pData.lastCheckAntiGMCTick || 0) >= tickDependencies.config.antiGMCCheckIntervalTicks)) {
            await checks.checkAntiGMC(player, pData, tickDependencies);
            pData.lastCheckAntiGMCTick = currentTick;
        }

        if (tickDependencies.config.enableFlatRotationCheck && checks.checkFlatRotationBuilding &&
            (currentTick - (pData.lastCheckFlatRotationBuildingTick || 0) >= tickDependencies.config.flatRotationCheckIntervalTicks)) {
            await checks.checkFlatRotationBuilding(player, pData, tickDependencies);
            pData.lastCheckFlatRotationBuildingTick = currentTick;
        }

        if (tickDependencies.config.enableInvalidRenderDistanceCheck && (currentTick - (pData.lastRenderDistanceCheckTick || 0) >= 400)) {
            if (checks.checkInvalidRenderDistance) {
                await checks.checkInvalidRenderDistance(player, pData, tickDependencies);
            }
            pData.lastRenderDistanceCheckTick = currentTick;
        }

        if (tickDependencies.config.enableNetherRoofCheck && checks.checkNetherRoof &&
            (currentTick - (pData.lastCheckNetherRoofTick || 0) >= tickDependencies.config.netherRoofCheckIntervalTicks)) {
            checks.checkNetherRoof(player, pData, tickDependencies);
            pData.lastCheckNetherRoofTick = currentTick;
        }

        if (!player.isOnGround) {
            if (pData.velocity.y < -0.07 && pData.previousPosition) {
                const deltaY = pData.previousPosition.y - pData.lastPosition.y;
                if (deltaY > 0) pData.fallDistance += deltaY;
            }
        } else {
            if (!pData.isTakingFallDamage) pData.fallDistance = 0;
            pData.isTakingFallDamage = false;
        }

        if (tickDependencies.config.enableWorldBorderSystem) {
            try {
                enforceWorldBorderForPlayer(player, pData, tickDependencies);
            } catch (e) {
                console.error(`[MainTick] Error enforcing world border for player ${player.nameTag}: ${e.stack || e}`);
                playerUtils.debugLog(`[MainTick] Error enforcing world border for ${player.nameTag}: ${e.message}`, player.nameTag, tickDependencies);
            }
        }
    }

    if (currentTick % 600 === 0) {
        for (const player of allPlayers) {
            const pData = playerDataManager.getPlayerData(player.id);
            if (pData && pData.isDirtyForSave) {
                try {
                    await playerDataManager.saveDirtyPlayerData(player);
                    if (playerUtils.debugLog && pData.isWatched) playerUtils.debugLog(`Deferred save executed for ${player.nameTag}. Tick: ${currentTick}`, player.nameTag, tickDependencies);
                } catch (error) {
                    console.error(`Error during deferred save for ${player.nameTag}: ${error}`);
                    logManager.addLog('error', `DeferredSaveFail: ${player.nameTag}, ${error.message}`, tickDependencies);
                }
            }
        }
        if (logManager.persistLogCacheToDisk) logManager.persistLogCacheToDisk(tickDependencies);
        if (reportManager.persistReportsToDisk) reportManager.persistReportsToDisk(tickDependencies);
    }
}, 1);

playerUtils.debugLog("Anti-Cheat Core System Initialized. Event handlers and tick loop are active.", "System", getStandardDependencies());

const startupDependencies = getStandardDependencies();
if (typeof reportManager.initializeReportCache === 'function') {
    reportManager.initializeReportCache(startupDependencies);
    reportManager.isInitialized = true;
    playerUtils.debugLog("ReportManager cache initialized on startup.", "System", startupDependencies);
}
