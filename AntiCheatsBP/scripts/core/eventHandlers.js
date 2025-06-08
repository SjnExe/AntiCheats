/**
 * @file AntiCheatsBP/scripts/core/eventHandlers.js
 * Centralized handlers for various Minecraft Server API events. These handlers typically
 * gather necessary data and then delegate to specific check functions or managers.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
// ItemStack is part of mc, no need for separate import unless it's a custom class
import { getPlayerRankDisplay, updatePlayerNametag, permissionLevels } from './rankManager.js'; // Added permissionLevels
import { getExpectedBreakTicks, isNetherLocked, isEndLocked, playerUtils as PlayerUtilsImport } from '../utils/index.js'; // Added isNetherLocked, isEndLocked, playerUtils
import { editableConfigValues as ConfigValuesImport } from '../config.js'; // For AntiGrief

// Assuming checks are imported from a barrel file, specific imports aren't strictly necessary here if using the 'checks' object.
// import { checkMessageRate, checkMessageWordCount } from '../checks/index.js';

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

    // Chat During Item Use Check
    if (currentConfig.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
        let itemUseState = "unknown";
        if (pData.isUsingConsumable) itemUseState = "using a consumable";
        if (pData.isChargingBow) itemUseState = "charging a bow";

        const violationDetails = {
            playerName: player.nameTag,
            itemUseState: itemUseState,
            messageContent: originalMessage // originalMessage is from eventData
        };

        if (actualExecuteCheckAction) {
            await actualExecuteCheckAction(player, "player_chat_during_item_use", violationDetails, dependencies);
        } else {
            currentPUtils.debugLog("ChatDuringItemUse: executeCheckAction not available.", null);
            if (currentLogManager && typeof currentLogManager.addLog === 'function') {
                currentLogManager.addLog({ adminName: "System", actionType: "error_missing_action_manager", targetName: player.nameTag, details: "ChatDuringItemUse: executeCheckAction missing." });
            }
        }

        const profile = currentConfig.checkActionProfiles?.player_chat_during_item_use;
        if (profile && profile.cancelMessage) {
            eventData.cancel = true;
            currentPUtils.warnPlayer(player, `§cYou cannot chat while ${itemUseState}.`);
            if (currentPUtils.debugLog && pData.isWatched) {
                currentPUtils.debugLog(`Chat cancelled for ${player.nameTag} (item use state: ${itemUseState}).`, player.nameTag);
            }
            return; // Stop further processing
        }
    }

    if (pData && addLog) { // Ensure pData and addLog are available
        const lastLocation = pData.lastPosition || player.location; // Fallback to current if lastPosition not set
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
            details: `Player \${player.nameTag} left. Last Loc: \${Math.floor(lastLocation.x)},\${Math.floor(lastLocation.y)},\${Math.floor(lastLocation.z)} in \${lastDimensionId}. GameMode: \${lastGameModeString}. Session: \${sessionDurationString}.`,
            location: { x: Math.floor(lastLocation.x), y: Math.floor(lastLocation.y), z: Math.floor(lastLocation.z), dimensionId: lastDimensionId },
            gameMode: lastGameModeString,
            sessionDuration: sessionDurationString
        });
    }
    // Ensure all data is attempted to be saved, regardless of dirty flag, as player is leaving.
    await playerDataManager.prepareAndSavePlayerData(player);
    playerUtils.debugLog(`Final data persistence attempted for ${player.nameTag} on leave.`, player.nameTag);
    playerUtils.debugLog(`Finished processing playerLeave event for ${player.nameTag}.`, player.nameTag);
}

/**
 * Handles player spawn events. Checks for active bans and updates nametags.
 * @param {mc.PlayerSpawnAfterEvent} eventData - The player spawn event data.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {object} dependencies - Additional dependencies, expected to include full `config`, `playerUtils`, `logManager`, `actionManager`, `checks`, and `addLog`.
 */
export async function handlePlayerSpawn(eventData, playerDataManager, playerUtils, globalConfig, dependencies) { // Renamed config to globalConfig to avoid conflict with dependencies.config
    const { player, initialSpawn } = eventData; // initialSpawn can be useful
    // Use playerUtils from dependencies if available, otherwise fallback to the direct parameter.
    const currentPUtils = dependencies.playerUtils || playerUtils;
    currentPUtils.debugLog(`Processing playerSpawn event for ${player.nameTag} (Initial Spawn: ${initialSpawn}). Tick: ${mc.system.currentTick}`, player.nameTag);
    if (!player) {
        console.warn('[AntiCheat] handlePlayerSpawn: eventData.player is undefined.');
        return;
    }
    // playerUtils.debugLog(`Player ${player.nameTag} spawned. Initial spawn: ${initialSpawn}.`, player.nameTag); // Original log, replaced by the one above

    try {
        const pData = playerDataManager.getPlayerData(player.id); // pData should exist due to main.js ensurePlayerDataInitialized
        if (!pData) {
            console.warn(`[AntiCheat] handlePlayerSpawn: pData is unexpectedly null for ${player.nameTag}. Some logging features might be affected.`);
            // Attempt to initialize again if really necessary, though this indicates a potential logic flow issue.
            // await playerDataManager.ensurePlayerDataInitialized(player, mc.system.currentTick);
            // pData = playerDataManager.getPlayerData(player.id); // Try fetching again
        }

        if (pData) { // Proceed if pData is available
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];

            pData.lastGameMode = player.gameMode;
            pData.lastDimensionId = player.dimension.id;
        }


        const banInfo = playerDataManager.getBanInfo(player);
        if (banInfo) {
            // Enhanced debug log for ban details
            if (playerUtils.debugLog) { // Ensure debugLog itself exists
                 playerUtils.debugLog(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`, player.nameTag);
            } else { // Fallback if debugLog is not available on playerUtils for some reason (should not happen)
                 console.warn(`Player ${player.nameTag} is banned. Kicking. Ban reason: ${banInfo.reason}, Expires: ${new Date(banInfo.unbanTime).toISOString()}`);
            }
            const kickReason = `You are banned from this server.\nReason: ${banInfo.reason}\n${banInfo.unbanTime === Infinity ? "This ban is permanent." : `Expires: ${new Date(banInfo.unbanTime).toLocaleString()}`}`;
            player.kick(kickReason);
            // playerUtils.debugLog(`Player ${player.nameTag} kicked due to active ban.`, player.nameTag); // Original log, covered by enhanced one
            return;
        }
        updatePlayerNametag(player); // Assuming this function handles ranks/prefixes
        playerUtils.debugLog(`Nametag updated for ${player.nameTag} on spawn.`, player.nameTag);

        // Welcomer message logic
        if (initialSpawn && config.enableWelcomerMessage) { // Check if welcomer is enabled
            let message = config.welcomeMessage || "Welcome, {playerName}, to the server!"; // Default message if not in config
            message = message.replace(/{playerName}/g, player.nameTag);

            // Send the message after a short delay
            mc.system.runTimeout(() => {
                player.sendMessage(message);
            }, 20); // 1 second delay (20 ticks)

            if (pData) { // Ensure pData before setting joinTime
                 pData.joinTime = Date.now();
                 pData.isDirtyForSave = true;
            }

            if (dependencies && dependencies.addLog) {
                const spawnLocation = player.location; // Re-fetch or use from above if pData block is guaranteed
                const spawnDimensionId = player.dimension.id.split(':')[1];
                const spawnGameMode = mc.GameMode[player.gameMode];
                dependencies.addLog({
                    timestamp: pData?.joinTime || Date.now(), // Use the exact join time if pData exists
                    actionType: 'player_initial_join',
                    targetName: player.nameTag,
                    targetId: player.id,
                    details: `Player \${player.nameTag} joined for the first time. Location: \${Math.floor(spawnLocation.x)},\${Math.floor(spawnLocation.y)},\${Math.floor(spawnLocation.z)} in \${spawnDimensionId}. GameMode: \${spawnGameMode}. Welcome sent.`,
                    location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                    gameMode: spawnGameMode
                });
            }

            if (playerUtils?.notifyAdmins && config.notifyAdminOnNewPlayerJoin) { // Optional: Notify admins
                playerUtils.notifyAdmins(`§eNew player ${player.nameTag} has joined the server for the first time!`, null, null);
            }
        } else if (!initialSpawn && dependencies && dependencies.addLog && pData) { // It's a respawn
            const spawnLocation = player.location;
            const spawnDimensionId = player.dimension.id.split(':')[1];
            const spawnGameMode = mc.GameMode[player.gameMode];
            dependencies.addLog({
                timestamp: Date.now(),
                actionType: 'player_respawn',
                targetName: player.nameTag,
                targetId: player.id,
                details: `Player \${player.nameTag} respawned. Location: \${Math.floor(spawnLocation.x)},\${Math.floor(spawnLocation.y)},\${Math.floor(spawnLocation.z)} in \${spawnDimensionId}. GameMode: \${spawnGameMode}.`,
                location: { x: Math.floor(spawnLocation.x), y: Math.floor(spawnLocation.y), z: Math.floor(spawnLocation.z), dimensionId: spawnDimensionId },
                gameMode: spawnGameMode
            });
        }


        // Death Coords message display logic
        // pData should already be fetched. If not, the earlier block would handle it or log.
        // Use dependencies.config for feature checks, globalConfig might be the base config module.
        if (pData && pData.deathMessageToShowOnSpawn && dependencies.config.enableDeathCoordsMessage) {
            // Send with a slight delay to ensure it's seen
            mc.system.runTimeout(() => {
                player.sendMessage(pData.deathMessageToShowOnSpawn);
            }, 5); // 5 ticks = 0.25 seconds

            currentPUtils.debugLog(`DeathCoords: Displayed death message to ${player.nameTag}: "${pData.deathMessageToShowOnSpawn}"`, pData.isWatched ? player.nameTag : null);
            pData.deathMessageToShowOnSpawn = null; // Clear the message
            pData.isDirtyForSave = true; // Mark for saving
        }

        // Invalid Render Distance Check on Spawn
        // Ensure all necessary parts of 'dependencies' are available as expected by checkInvalidRenderDistance
        if (dependencies.checks?.checkInvalidRenderDistance && dependencies.config?.enableInvalidRenderDistanceCheck) {
            await dependencies.checks.checkInvalidRenderDistance(
                player,
                pData,
                dependencies.config, // Full config from dependencies
                currentPUtils, // Use the resolved playerUtils
                dependencies.logManager,
                dependencies.actionManager, // Pass the actionManager object/wrapper
                dependencies // Pass the full dependencies object passed to handlePlayerSpawn
            );
        }

    } catch (error) {
        console.error(`[AntiCheat] Error in handlePlayerSpawn for ${player.nameTag}: ${error.stack || error}`);
        currentPUtils.debugLog(`Error in handlePlayerSpawn for ${player.nameTag}: ${error}`, player.nameTag);
    }
}

/**
 * Handles piston activation events for AntiGrief checks (Piston Lag).
 * @param {import('@minecraft/server').PistonActivateAfterEvent} eventData - The event data.
 * @param {import('../types.js').EventHandlerDependencies} dependencies - Dependencies needed by the handler.
 */
export async function handlePistonActivate_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager, checks } = dependencies; // Ensure 'checks' is destructured

    if (!config.enablePistonLagCheck) {
        return;
    }

    const pistonBlock = eventData.pistonBlock;
    // PistonActivateAfterEvent has event.dimension
    const dimensionId = eventData.dimension.id;

    if (!pistonBlock) {
        playerUtils.debugLog("PistonLag: eventData.pistonBlock is undefined in handlePistonActivate_AntiGrief.", null);
        return;
    }
    if (!dimensionId) {
        playerUtils.debugLog(`PistonLag: dimensionId is undefined for piston at ${JSON.stringify(pistonBlock.location)}.`, null);
        return;
    }


    // Call checkPistonLag from the 'checks' object
    if (checks && typeof checks.checkPistonLag === 'function') {
        await checks.checkPistonLag(pistonBlock, dimensionId, config, playerUtils, logManager, actionManager, dependencies);
    } else {
        playerUtils.debugLog("PistonLag: checkPistonLag function is not available in dependencies.checks.", null);
    }
}

/**
 * Handles entity spawn events, specifically for Wither Anti-Grief.
 * @param {import('@minecraft/server').EntitySpawnAfterEvent} eventData - The event data.
 * @param {import('../types.js').EventHandlerDependencies} dependencies - Dependencies needed by the handler.
 * @returns {Promise<void>}
 */
export async function handleEntitySpawnEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;

    // Ensure config is the editableConfigValues object
    const currentConfig = config || ConfigValuesImport;
    const actualPlayerUtils = playerUtils || PlayerUtilsImport; // Fallback if not in dependencies

    if (!currentConfig.enableWitherAntiGrief) {
        return;
    }

    if (eventData.entity?.typeId === "minecraft:wither") {
        const witherEntity = eventData.entity;
        let actionTaken = currentConfig.witherSpawnAction;
        let playerNameOrContext = "Unknown/Environment"; // Default context

        // Known Limitation: EntitySpawnAfterEvent does not directly provide the spawning player.
        // If allowAdminWitherSpawn is true, we cannot reliably exempt admin-spawned Withers here
        // without a more complex player activity tracking system leading up to the spawn.
        // Thus, if enableWitherAntiGrief is true, the action applies to ALL Wither spawns
        // unless allowAdminWitherSpawn is false (which also makes it apply to all).
        // For now, the check for allowAdminWitherSpawn is implicitly handled by the fact that
        // we can't identify the spawner. If a mechanism is added later to identify the spawner,
        // then an exemption for admins could be added here.

        actualPlayerUtils.debugLog(`AntiGrief: Wither spawned (ID: ${witherEntity.id}). Config action: ${actionTaken}. allowAdminWitherSpawn is ${currentConfig.allowAdminWitherSpawn} (currently not usable for exemption in this event).`, null);

        const violationDetails = {
            playerNameOrContext: playerNameOrContext,
            checkType: "AntiGrief Wither",
            entityId: witherEntity.id,
            entityLocation: { x: witherEntity.location.x, y: witherEntity.location.y, z: witherEntity.location.z }, // Store location object
            actionTaken: actionTaken, // Initial action
            detailsString: `A Wither (ID: ${witherEntity.id}) was spawned at ${witherEntity.location.x.toFixed(1)},${witherEntity.location.y.toFixed(1)},${witherEntity.location.z.toFixed(1)}. Configured action: ${actionTaken}.`
        };

        try {
            if (actionTaken === "kill" || actionTaken === "prevent") {
                if (witherEntity.isValid()) { // Check if entity is still valid before trying to kill
                    witherEntity.kill();
                    violationDetails.detailsString = `A Wither (ID: ${witherEntity.id}) was spawned and killed by AntiGrief at ${violationDetails.entityLocation.x.toFixed(1)},${violationDetails.entityLocation.y.toFixed(1)},${violationDetails.entityLocation.z.toFixed(1)}.`;
                    violationDetails.actionTaken = actionTaken === "prevent" ? "prevent (executed as kill)" : "kill (executed)";
                    actualPlayerUtils.debugLog(`AntiGrief: Wither (ID: ${witherEntity.id}) killed. Action: ${violationDetails.actionTaken}`, null);
                } else {
                    violationDetails.detailsString = `A Wither (ID: ${witherEntity.id}) was spawned but was invalid before kill action could be taken. Original action: ${actionTaken}.`;
                    violationDetails.actionTaken = actionTaken + " (entity invalid)";
                    actualPlayerUtils.debugLog(`AntiGrief: Wither (ID: ${witherEntity.id}) was invalid before kill. Action: ${actionTaken}`, null);
                }
            } else if (actionTaken === "logOnly") {
                // Details string already set
                 actualPlayerUtils.debugLog(`AntiGrief: Wither (ID: ${witherEntity.id}) spawn logged. Action: logOnly`, null);
            } else {
                actualPlayerUtils.debugLog(`AntiGrief: Unknown witherSpawnAction: ${actionTaken} for Wither (ID: ${witherEntity.id}). Defaulting to logOnly.`, null);
                violationDetails.detailsString = `A Wither (ID: ${witherEntity.id}) was spawned. Unknown action '${actionTaken}' configured, defaulted to logOnly.`;
                violationDetails.actionTaken = "logOnly (unknown config)";
            }
        } catch (error) {
            actualPlayerUtils.debugLog(`AntiGrief: Error during Wither action '${actionTaken}': ${error}`, null);
            violationDetails.detailsString += ` Error during action: ${error.message}.`;
            violationDetails.actionTaken = actionTaken + " (error)";
        }

        // Log and notify for all actions (flagging might be too aggressive for environmental spawns)
        // Passing null for player as spawner is unknown.
        // The checkActionProfile for 'world_antigrief_wither_spawn' should be configured for logging/notification but perhaps not aggressive flagging by default.
        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
            await actionManager.executeCheckAction("world_antigrief_wither_spawn", null, violationDetails, dependencies);
        } else {
            actualPlayerUtils.debugLog("AntiGrief: actionManager or executeCheckAction is not available for Wither check.", null);
            if (logManager && typeof logManager.addLog === 'function') {
                 logManager.addLog({
                    adminName: "SYSTEM (AntiGrief)",
                    actionType: "antigrief_wither_spawn_fallback",
                    targetName: playerNameOrContext, // "Unknown/Environment"
                    details: violationDetails.detailsString
                });
            }
        }
    }

    // --- Snow Golem Spam Control ---
    else if (currentConfig.enableEntitySpamAntiGrief && eventData.entity?.typeId === "minecraft:snow_golem") {
        const spawnedGolem = eventData.entity;
        actualPlayerUtils.debugLog(`AntiGrief: Snow Golem spawned at ${JSON.stringify(spawnedGolem.location)}. Checking for player attribution. Tick: ${currentTick}`, null);

        for (const player of mc.world.getAllPlayers()) {
            if (!playerDataManager) {
                actualPlayerUtils.debugLog(`AntiGrief: playerDataManager is not available in dependencies for Snow Golem check. Skipping.`, null);
                break;
            }
            const pData = playerDataManager.getPlayerData(player.id);

            if (pData && pData.expectingConstructedEntity && pData.expectingConstructedEntity.type === "minecraft:snow_golem") {
                const expectedData = pData.expectingConstructedEntity;
                const pumpkinLoc = expectedData.location;
                const expectedGolemLoc = { x: pumpkinLoc.x, y: pumpkinLoc.y - 1, z: pumpkinLoc.z };

                if (Math.abs(spawnedGolem.location.x - expectedGolemLoc.x) <= 0.5 &&
                    Math.abs(spawnedGolem.location.y - expectedGolemLoc.y) <= 0.1 &&
                    Math.abs(spawnedGolem.location.z - expectedGolemLoc.z) <= 0.5 &&
                    (currentTick - expectedData.tick <= 5) &&
                    player.dimension.id === expectedData.dimensionId) {

                    actualPlayerUtils.debugLog(`AntiGrief: Attributed snow golem spawn at ${JSON.stringify(spawnedGolem.location)} to player ${player.nameTag}. Expected data: ${JSON.stringify(expectedData)}`, pData.isWatched ? player.nameTag : null);

                    if (checks && typeof checks.checkEntitySpam === 'function') {
                        const isSpam = await checks.checkEntitySpam(
                            player, "minecraft:snow_golem", currentConfig, pData,
                            actualPlayerUtils, playerDataManager, logManager,
                            actionManager.executeCheckAction, currentTick
                        );

                        if (isSpam && currentConfig.entitySpamAction === "kill") {
                            if (spawnedGolem.isValid()) {
                                spawnedGolem.kill();
                                actualPlayerUtils.debugLog(`AntiGrief: Killed spam-spawned snow golem from ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
                            }
                        }
                    } else {
                        actualPlayerUtils.debugLog(`AntiGrief: checkEntitySpam function not available in dependencies.checks for Snow Golem check for ${player.nameTag}.`, null);
                    }

                    pData.expectingConstructedEntity = null;
                    pData.isDirtyForSave = true;
                    break;
                }
            }
        }
    }

    // --- Iron Golem Spam Control ---
    else if (currentConfig.enableEntitySpamAntiGrief && eventData.entity?.typeId === "minecraft:iron_golem") {
        const spawnedGolem = eventData.entity;
        actualPlayerUtils.debugLog(`AntiGrief: Iron Golem spawned at ${JSON.stringify(spawnedGolem.location)}. Checking for player attribution. Tick: ${currentTick}`, null);

        for (const player of mc.world.getAllPlayers()) {
            if (!playerDataManager) {
                actualPlayerUtils.debugLog(`AntiGrief: playerDataManager is not available in dependencies for Iron Golem check. Skipping.`, null);
                break;
            }
            const pData = playerDataManager.getPlayerData(player.id);

            if (pData && pData.expectingConstructedEntity && pData.expectingConstructedEntity.type === "minecraft:iron_golem") {
                const expectedData = pData.expectingConstructedEntity;
                const pumpkinLoc = expectedData.location;
                const expectedGolemLoc = { x: pumpkinLoc.x, y: pumpkinLoc.y - 1, z: pumpkinLoc.z };

                if (Math.abs(spawnedGolem.location.x - expectedGolemLoc.x) <= 0.5 &&
                    Math.abs(spawnedGolem.location.y - expectedGolemLoc.y) <= 0.5 &&
                    Math.abs(spawnedGolem.location.z - expectedGolemLoc.z) <= 0.5 &&
                    (currentTick - expectedData.tick <= 5) &&
                    player.dimension.id === expectedData.dimensionId) {

                    actualPlayerUtils.debugLog(`AntiGrief: Attributed iron golem spawn at ${JSON.stringify(spawnedGolem.location)} to player ${player.nameTag}. Expected data: ${JSON.stringify(expectedData)}`, pData.isWatched ? player.nameTag : null);

                    if (checks && typeof checks.checkEntitySpam === 'function') {
                        const isSpam = await checks.checkEntitySpam(
                            player, "minecraft:iron_golem", currentConfig, pData,
                            actualPlayerUtils, playerDataManager, logManager,
                            actionManager.executeCheckAction, currentTick
                        );

                        if (isSpam && currentConfig.entitySpamAction === "kill") {
                            if (spawnedGolem.isValid()) {
                                spawnedGolem.kill();
                                actualPlayerUtils.debugLog(`AntiGrief: Killed spam-spawned iron golem from ${player.nameTag}.`, pData.isWatched ? player.nameTag : null);
                            }
                        }
                    } else {
                        actualPlayerUtils.debugLog(`AntiGrief: checkEntitySpam function not available for Iron Golem check for ${player.nameTag}.`, null);
                    }

                    pData.expectingConstructedEntity = null;
                    pData.isDirtyForSave = true;
                    break;
                }
            }
        }
    }
}

/**
 * Handles logic before a player places a block, specifically for AntiGrief (TNT control).
 * @param {import('@minecraft/server').PlayerPlaceBlockBeforeEvent} eventData - The event data.
 * @param {import('../types.js').EventHandlerDependencies} dependencies - Dependencies needed by the handler.
 * @returns {Promise<void>}
 */
export async function handlePlayerPlaceBlockBeforeEvent_AntiGrief(eventData, dependencies) {
    const { config, playerUtils, logManager, actionManager } = dependencies;

    // Ensure config is the editableConfigValues object from config.js
    // If dependencies.config is already the correct one, this check might be redundant
    // but good for safety if the structure of 'dependencies' can vary.
    const currentConfig = config || ConfigValuesImport;


    if (!currentConfig.enableTntAntiGrief) {
        return;
    }

    // eventData.itemStack should be of type ItemStack.
    // eventData.block refers to the block being placed against.
    // The location where TNT would be placed is eventData.block.location offset by face, or eventData.blockFace if using PlayerPlaceBlockAfterEvent
    // For PlayerPlaceBlockBeforeEvent, eventData.block.location is where it *would* be placed.
    // Let's assume eventData.block.location is the intended placement spot for simplicity here.

    if (eventData.itemStack?.typeId === "minecraft:tnt") {
        const actualPlayerUtils = playerUtils || PlayerUtilsImport; // Use imported if not in dependencies
        const playerPermission = actualPlayerUtils.getPlayerPermissionLevel(eventData.player);

        if (currentConfig.allowAdminTntPlacement && playerPermission <= permissionLevels.admin) {
            // actualPlayerUtils.debugLog(`AntiGrief: Admin ${eventData.player.nameTag} allowed to place TNT.`, eventData.player.nameTag);
            return; // Allow placement for admins/owners
        }

        // Unauthorized TNT placement
        const actionTaken = currentConfig.tntPlacementAction;
        const placementLocation = eventData.block.location; // Location where the TNT would be placed

        const violationDetails = {
            playerName: eventData.player.nameTag,
            checkType: "AntiGrief TNT",
            x: placementLocation.x,
            y: placementLocation.y,
            z: placementLocation.z,
            actionTaken: actionTaken,
            detailsString: `Player ${eventData.player.nameTag} tried to place TNT at ${placementLocation.x.toFixed(1)},${placementLocation.y.toFixed(1)},${placementLocation.z.toFixed(1)}. Action: ${actionTaken}`
        };

        if (actionManager && typeof actionManager.executeCheckAction === 'function') {
             await actionManager.executeCheckAction("world_antigrief_tnt_place", eventData.player, violationDetails, dependencies);
        } else {
            actualPlayerUtils.debugLog("AntiGrief: actionManager or executeCheckAction is not available for TNT check.", eventData.player.nameTag);
            if (logManager && typeof logManager.addLog === 'function') {
                 logManager.addLog({
                    adminName: "SYSTEM (AntiGrief)",
                    actionType: "antigrief_tnt_placement_fallback",
                    targetName: eventData.player.nameTag,
                    details: violationDetails.detailsString
                });
            }
        }

        switch (actionTaken) {
            case "remove":
                eventData.cancel = true;
                eventData.player.sendMessage("§c[AntiGrief] TNT placement is restricted here.");
                break;
            case "warn":
                eventData.player.sendMessage("§e[AntiGrief] Warning: TNT placement is monitored.");
                break;
            case "logOnly":
                // Logging and admin notification handled by actionManager
                break;
            default:
                actualPlayerUtils.debugLog(`AntiGrief: Unknown tntPlacementAction '${actionTaken}' for ${eventData.player.nameTag}. Defaulting to logOnly.`, eventData.player.nameTag);
                break;
        }
    }
}

/**
 * Handles entity death events to trigger cosmetic death effects for players.
 * @param {mc.EntityDieAfterEvent} eventData The entity die event data.
 * @param {object} config The editable configuration object (config.editableConfigValues).
 */
export async function handleEntityDieForDeathEffects(eventData, config) {
    if (!config.enableDeathEffects) {
        return;
    }

    const deadEntity = eventData.deadEntity;
    if (!(deadEntity instanceof mc.Player)) {
        return;
    }

    const location = deadEntity.location;
    const dimension = deadEntity.dimension;
    const effectConfig = config.defaultDeathEffect;

    if (effectConfig) {
        // Play sound
        if (effectConfig.soundId && effectConfig.soundOptions) {
            try {
                dimension.playSound(effectConfig.soundId, location, effectConfig.soundOptions);
            } catch (e) {
                console.warn(`[DeathEffects] Error playing sound '\${effectConfig.soundId}': \${e}`);
            }
        }

        // Execute particle command
        if (effectConfig.particleCommand) {
            try {
                // Replace placeholders. Handles "~ ~1 ~" and "~ ~ ~" for basic relative coordinates.
                // More robust placeholder replacement might be needed for complex commands.
                let commandToRun = effectConfig.particleCommand;
                const yOffsetMatch = commandToRun.match(/~ ~(-?\d+) ~/)
                let yOffset = 0;
                if (yOffsetMatch && yOffsetMatch[1]) {
                     yOffset = parseInt(yOffsetMatch[1]);
                }

                // Replace common relative position placeholders.
                // This simple replacement assumes placeholders are separated by spaces.
                commandToRun = commandToRun.replace("~ ~1 ~", `\${location.x.toFixed(3)} \${(location.y + 1).toFixed(3)} \${location.z.toFixed(3)}`);
                commandToRun = commandToRun.replace("~ ~ ~", `\${location.x.toFixed(3)} \${location.y.toFixed(3)} \${location.z.toFixed(3)}`);
                // A more generic replacement if a different y-offset was used in the string:
                if (yOffset !== 0 && commandToRun.includes(`~ ~${yOffset} ~`)) {
                     commandToRun = commandToRun.replace(`~ ~${yOffset} ~`, `\${location.x.toFixed(3)} \${(location.y + yOffset).toFixed(3)} \${location.z.toFixed(3)}`);
                }


                await dimension.runCommandAsync(commandToRun);
            } catch (e) {
                console.warn(`[DeathEffects] Error running particle command '\${effectConfig.particleCommand}': \${e}`);
            }
        }
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
    playerUtils.debugLog(`EntityHurt: Victim ${hurtEntity?.nameTag || hurtEntity?.typeId || 'UnknownEntity'} (ID: ${hurtEntity?.id}), Attacker ${damagingEntity?.nameTag || damagingEntity?.typeId || 'None/World'}. Damage: ${eventData.damage}, Cause: ${cause?.category}. Tick: ${currentTick}`, hurtEntity?.typeId === 'minecraft:player' ? hurtEntity.nameTag : (damagingEntity?.typeId === 'minecraft:player' ? damagingEntity.nameTag : null));

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

            // Conditional log for attacker's game mode before reach check
            if (hurtEntity instanceof mc.Player && attackerPData && attackerPData.isWatched && playerUtils.debugLog) {
                const attackerGameMode = attacker.gameMode; // damagingEntity is attacker
                playerUtils.debugLog(`Attacker ${attacker.nameTag}'s game mode: ${attackerGameMode} before reach check.`, hurtEntity.nameTag);
            }

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
 * Handles player death events to store death coordinates.
 * The coordinates are stored in pData and displayed to the player upon respawn via handlePlayerSpawn.
 * @param {import('@minecraft/server').EntityDieAfterEvent} eventData - The entity die event data. Note: Player is `deadEntity`.
 * @param {import('./playerDataManager.js')} playerDataManager - Manager for player data.
 * @param {import('../utils/playerUtils.js')} playerUtils - Utility functions for players.
 * @param {import('../config.js').editableConfigValues} config - The server configuration object.
 * @param {function} addLog - Function from logManager to add logs.
 */
export async function handlePlayerDeath(eventData, playerDataManager, playerUtils, config, addLog) {
    const { deadEntity } = eventData;

    if (deadEntity?.typeId === 'minecraft:player' && config.enableDeathCoordsMessage) {
        const player = deadEntity;
        const location = player.location;
        const dimensionId = player.dimension.id.split(':')[1];

        let pData;
        try {
            pData = playerDataManager.getPlayerData(player.id);
        } catch (e) {
            playerUtils.debugLog(`DeathCoords: Error fetching pData for ${player.nameTag || player.id} in handlePlayerDeath: ${e}`, null);
            return;
        }

        if (!pData) {
            playerUtils.debugLog(`DeathCoords: No pData for ${player.nameTag || player.id} in handlePlayerDeath. Cannot store message.`, null);
            return;
        }

        const x = Math.floor(location.x);
        const y = Math.floor(location.y);
        const z = Math.floor(location.z);

        let message = (config.deathCoordsMessage || "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.")
            .replace(/{x}/g, x.toString())
            .replace(/{y}/g, y.toString())
            .replace(/{z}/g, z.toString())
            .replace(/{dimensionId}/g, dimensionId);

        pData.deathMessageToShowOnSpawn = message;
        pData.isDirtyForSave = true;

        if (addLog) {
            addLog({
                timestamp: Date.now(),
                actionType: 'player_death_coords',
                targetName: player.nameTag,
                details: `Player ${player.nameTag} died at ${x},${y},${z} in ${dimensionId}. Coords stored for respawn.`
            });
        }
        playerUtils.debugLog(`DeathCoords: Stored death message for ${player.nameTag}: "${message}"`, pData.isWatched ? player.nameTag : null);
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

    if (pData && pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`PlayerBreakBlockBefore: ${player.nameTag} trying to break ${block.typeId} at ${JSON.stringify(block.location)} with ${itemStack?.typeId || 'hand'}. Tick: ${currentTick}`, player.nameTag);
    }

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

    if (pData && pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`PlayerBreakBlockAfter: ${player.nameTag} broke ${brokenBlockPermutation.type.id} at ${JSON.stringify(block.location)}. Tick: ${currentTick}`, player.nameTag);
    }

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

            if (pData && pData.isWatched && playerUtils.debugLog) {
                playerUtils.debugLog(`X-Ray notification triggered for ${player.nameTag} mining ${brokenBlockId}. Player is watched. Message: "${message}"`, player.nameTag);
            }
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

    if (pData && pData.isWatched && playerUtils.debugLog) {
        playerUtils.debugLog(`ItemUse: ${player.nameTag} using item ${itemStack.typeId} (Amount: ${itemStack.amount}). Tick: ${currentTick}`, player.nameTag);
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
    if (eventData.cancel) return; // If cancelled by illegal item check or others above

    // Anti-Grief Entity Spam Logic for Spawn Eggs (ItemUse event)
    // The 'dependencies' object is not typically passed to handleItemUse in main.js in the same way as handleItemUseOn.
    // We rely on parameters passed directly to handleItemUse, and direct imports if necessary.
    // 'config' parameter here is the main config, so ConfigValuesImport (config.editableConfigValues) is used for runtime values.
    // 'checks' parameter contains the checkEntitySpam function.
    // 'currentTick' is passed as a parameter.

    const itemTypeIdForSpawnEgg = itemStack.typeId;
    let derivedEntityTypeFromSpawnEgg = null;

    if (ConfigValuesImport.enableEntitySpamAntiGrief && itemTypeIdForSpawnEgg.endsWith("_spawn_egg")) {
        // Derive entity type: "minecraft:pig_spawn_egg" -> "minecraft:pig"
        let entityName = itemTypeIdForSpawnEgg.substring(0, itemTypeIdForSpawnEgg.length - "_spawn_egg".length);
        if (entityName.startsWith("minecraft:")) { // Ensure it's not double-namespaced if item ID was already full
            entityName = entityName.substring("minecraft:".length);
        }
        const potentialFullEntityId = "minecraft:" + entityName;

        if (ConfigValuesImport.entitySpamMonitoredEntityTypes && ConfigValuesImport.entitySpamMonitoredEntityTypes.includes(potentialFullEntityId)) {
            derivedEntityTypeFromSpawnEgg = potentialFullEntityId;
        }
    }

    if (derivedEntityTypeFromSpawnEgg && checks?.checkEntitySpam) {
        if (pData) { // pData should have been initialized at the start of handleItemUse
            const spamDetected = await checks.checkEntitySpam(
                player,
                derivedEntityTypeFromSpawnEgg,
                ConfigValuesImport, // Pass the runtime editable config
                pData,
                playerUtils,
                playerDataManager,
                logManager,
                executeCheckAction, // This is the function itself
                currentTick
            );

            if (spamDetected) {
                if (ConfigValuesImport.entitySpamAction === "kill") { // "kill" here means prevent item use
                    eventData.cancel = true;
                    player.sendMessage("§c[AntiGrief] You are using spawn eggs too quickly!");
                    playerUtils.debugLog?.(`EntitySpam (ItemUse): Prevented spawn egg use for ${player.nameTag} (entity: ${derivedEntityTypeFromSpawnEgg}) due to spam detection.`, pData.isWatched ? player.nameTag : null);
                } else if (ConfigValuesImport.entitySpamAction === "warn") {
                    player.sendMessage("§e[AntiGrief] Warning: Using spawn eggs too quickly is monitored.");
                    // Admin notification is handled by checkEntitySpam via actionManager
                }
                // For "logOnly", no direct player message; actionManager handles logs/notifications.
            }
        } else {
            playerUtils.debugLog?.(`EntitySpam (ItemUse): pData not available for ${player.nameTag}, skipping check for ${itemTypeIdForSpawnEgg}.`, null);
        }
    }
    if (eventData.cancel) return;

    // Anti-Grief Entity Spam Logic for Spawn Eggs (ItemUse event)
    // Dependencies are passed differently to handleItemUse in main.js, so we need to access them directly or ensure they are passed.
    // For this integration, we assume 'config', 'playerUtils', 'playerDataManager', 'logManager', 'checks.checkEntitySpam',
    // 'executeCheckAction', and 'currentTick' are available via the parameters or broader scope if main.js is updated.
    // Let's assume 'dependencies' is NOT passed to handleItemUse, so we use direct params and imported values.

    const itemTypeIdForSpawnEgg = itemStack.typeId;
    let derivedEntityTypeFromSpawnEgg = null;

    if (ConfigValuesImport.enableEntitySpamAntiGrief && itemTypeIdForSpawnEgg.endsWith("_spawn_egg")) {
        const entityName = itemTypeIdForSpawnEgg.substring("minecraft:".length, itemTypeIdForSpawnEgg.length - "_spawn_egg".length);
        // Fallback for older spawn eggs that might not have "minecraft:" prefix if itemTypeId is just "pig_spawn_egg"
        // However, itemStack.typeId from vanilla should always include the namespace.
        // const entityName = itemTypeIdForSpawnEgg.startsWith("minecraft:") ? itemTypeIdForSpawnEgg.substring("minecraft:".length, itemTypeIdForSpawnEgg.length - "_spawn_egg".length) : itemTypeIdForSpawnEgg.substring(0, itemTypeIdForSpawnEgg.length - "_spawn_egg".length);

        const potentialFullEntityId = "minecraft:" + entityName; // Assuming all vanilla spawn eggs produce entities in minecraft namespace

        if (ConfigValuesImport.entitySpamMonitoredEntityTypes && ConfigValuesImport.entitySpamMonitoredEntityTypes.includes(potentialFullEntityId)) {
            derivedEntityTypeFromSpawnEgg = potentialFullEntityId;
        }
    }

    if (derivedEntityTypeFromSpawnEgg && checks?.checkEntitySpam) {
        // pData should already be initialized and available from the start of handleItemUse.
        if (pData) {
            const spamDetected = await checks.checkEntitySpam(
                player,
                derivedEntityTypeFromSpawnEgg,
                ConfigValuesImport, // Use imported config values
                pData,
                playerUtils,    // Direct parameter
                playerDataManager, // Direct parameter
                logManager,     // Direct parameter
                executeCheckAction, // Direct parameter
                currentTick     // Direct parameter
            );

            if (spamDetected) {
                if (ConfigValuesImport.entitySpamAction === "kill") { // Prevent item use
                    eventData.cancel = true;
                    player.sendMessage("§c[AntiGrief] You are using spawn eggs too quickly!");
                    playerUtils.debugLog?.(`EntitySpam (ItemUse): Prevented spawn egg use for ${player.nameTag} due to spam detection of ${derivedEntityTypeFromSpawnEgg}`, player.nameTag);
                } else if (ConfigValuesImport.entitySpamAction === "warn") {
                    player.sendMessage("§e[AntiGrief] Warning: Using spawn eggs too quickly is monitored.");
                }
            }
        } else {
            playerUtils.debugLog?.(`EntitySpam (ItemUse): pData not available for ${player.nameTag}, skipping check.`, player.nameTag);
        }
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
export async function handleItemUseOn(eventData, playerDataManager, checks, playerUtils, config, logManager, executeCheckAction, dependencies) { // Added dependencies
    // currentTick is not available here without passing it from main.js through the event subscription.
    // If ensurePlayerDataInitialized is needed, this handler's signature in main.js needs currentTick.
    // For AntiGrief, we'll use dependencies passed from main.js

    const { source: player, itemStack } = eventData;
    if (player?.typeId !== 'minecraft:player') return;

    // Anti-Grief Dependencies (ensuring they are available)
    const depConfig = dependencies?.config || ConfigValuesImport; // Renamed to avoid conflict with direct param 'config'
    const depPlayerUtils = dependencies?.playerUtils || PlayerUtilsImport;
    const depActionManager = dependencies?.actionManager;
    const depLogManager = dependencies?.logManager;
    const depPlayerDataManager = dependencies?.playerDataManager;
    const depChecks = dependencies?.checks;
    const depCurrentTick = dependencies?.currentTick;

    const placeableEntityItemMap = {
        "minecraft:oak_boat": "minecraft:boat", "minecraft:spruce_boat": "minecraft:boat",
        "minecraft:birch_boat": "minecraft:boat", "minecraft:jungle_boat": "minecraft:boat",
        "minecraft:acacia_boat": "minecraft:boat", "minecraft:dark_oak_boat": "minecraft:boat",
        "minecraft:mangrove_boat": "minecraft:boat", "minecraft:cherry_boat": "minecraft:boat",
        "minecraft:bamboo_raft": "minecraft:boat",
        "minecraft:armor_stand": "minecraft:armor_stand",
        "minecraft:item_frame": "minecraft:item_frame",
        "minecraft:glow_item_frame": "minecraft:glow_item_frame",
        "minecraft:minecart": "minecraft:minecart",
        "minecraft:chest_minecart": "minecraft:chest_minecart",
        "minecraft:furnace_minecart": "minecraft:furnace_minecart",
        "minecraft:tnt_minecart": "minecraft:tnt_minecart",
        "minecraft:hopper_minecart": "minecraft:hopper_minecart",
        "minecraft:command_block_minecart": "minecraft:command_block_minecart"
    };

    // --- Anti-Grief Fire Logic ---
    if (griefConfig.enableFireAntiGrief) {
        const itemUsedForFire = itemStack.typeId;
        if (itemUsedForFire === 'minecraft:flint_and_steel' || itemUsedForFire === 'minecraft:fire_charge') {
            const playerPermission = griefPlayerUtils.getPlayerPermissionLevel(player);

            if (!(griefConfig.allowAdminFire && playerPermission <= permissionLevels.admin)) {
                const actionTaken = griefConfig.fireControlAction;
                const violationDetails = {
                    playerNameOrContext: player.nameTag,
                    checkType: "AntiGrief Fire",
                    itemUsed: itemUsedForFire,
                    targetBlock: eventData.block?.typeId || 'N/A',
                    location: { x: player.location.x, y: player.location.y, z: player.location.z },
                    actionTaken: actionTaken,
                    detailsString: `Player ${player.nameTag} attempted to start a fire with ${itemUsedForFire} on ${eventData.block?.typeId || 'N/A'}. Action: ${actionTaken}`
                };

                if (griefActionManager && typeof griefActionManager.executeCheckAction === 'function') {
                    await griefActionManager.executeCheckAction("world_antigrief_fire", player, violationDetails, dependencies);
                } else {
                    griefPlayerUtils.debugLog("AntiGrief Fire: actionManager or executeCheckAction is not available.", player.nameTag);
                     if (griefLogManager && typeof griefLogManager.addLog === 'function') {
                        griefLogManager.addLog({ adminName: "System(AntiGrief)", actionType: "antigrief_fire_fallback", targetName: player.nameTag, details: violationDetails.detailsString });
                    }
                }

                switch (actionTaken) {
                    case "extinguish":
                        eventData.cancel = true;
                        player.sendMessage("§c[AntiGrief] Fire starting is restricted here.");
                        break;
                    case "warn":
                        player.sendMessage("§e[AntiGrief] Warning: Fire starting is monitored.");
                        break;
                    case "logOnly":
                        break;
                }
            }
        }
    }
    if (eventData.cancel) return; // Event cancelled by Fire Anti-Grief

    // --- Anti-Grief Lava Logic ---
    if (griefConfig.enableLavaAntiGrief) {
        const itemUsedForLava = itemStack.typeId;
        if (itemUsedForLava === 'minecraft:lava_bucket') {
            const playerPermission = griefPlayerUtils.getPlayerPermissionLevel(player);

            if (!(griefConfig.allowAdminLava && playerPermission <= permissionLevels.admin)) {
                const actionTaken = griefConfig.lavaPlacementAction;
                const violationDetails = {
                    playerNameOrContext: player.nameTag,
                    checkType: "AntiGrief Lava",
                    itemUsed: itemUsedForLava,
                    targetBlock: eventData.block?.typeId || 'N/A',
                    location: { x: player.location.x, y: player.location.y, z: player.location.z },
                    actionTaken: actionTaken,
                    detailsString: `Player ${player.nameTag} attempted to place lava with ${itemUsedForLava} on ${eventData.block?.typeId || 'N/A'}. Action: ${actionTaken}`
                };

                if (griefActionManager && typeof griefActionManager.executeCheckAction === 'function') {
                    await griefActionManager.executeCheckAction("world_antigrief_lava", player, violationDetails, dependencies);
                } else {
                    griefPlayerUtils.debugLog("AntiGrief Lava: actionManager or executeCheckAction is not available.", player.nameTag);
                    if (griefLogManager && typeof griefLogManager.addLog === 'function') {
                        griefLogManager.addLog({ adminName: "System(AntiGrief)", actionType: "antigrief_lava_fallback", targetName: player.nameTag, details: violationDetails.detailsString });
                    }
                }

                switch (actionTaken) {
                    case "remove":
                        eventData.cancel = true;
                        player.sendMessage("§c[AntiGrief] Lava placement is restricted here.");
                        break;
                    case "warn":
                        player.sendMessage("§e[AntiGrief] Warning: Lava placement is monitored.");
                        break;
                    case "logOnly":
                        break;
                }
            }
        }
    }
    if (eventData.cancel) return; // Event cancelled by Lava Anti-Grief

    // --- Anti-Grief Water Logic ---
    if (griefConfig.enableWaterAntiGrief) {
        const itemUsedForWater = itemStack.typeId;
        if (itemUsedForWater === 'minecraft:water_bucket') {
            const playerPermission = griefPlayerUtils.getPlayerPermissionLevel(player);

            if (!(griefConfig.allowAdminWater && playerPermission <= permissionLevels.admin)) {
                const actionTaken = griefConfig.waterPlacementAction;
                const violationDetails = {
                    playerNameOrContext: player.nameTag,
                    checkType: "AntiGrief Water",
                    itemUsed: itemUsedForWater,
                    targetBlock: eventData.block?.typeId || 'N/A',
                    location: { x: player.location.x, y: player.location.y, z: player.location.z },
                    actionTaken: actionTaken,
                    detailsString: `Player ${player.nameTag} attempted to place water with ${itemUsedForWater} on ${eventData.block?.typeId || 'N/A'}. Action: ${actionTaken}`
                };

                if (griefActionManager && typeof griefActionManager.executeCheckAction === 'function') {
                    await griefActionManager.executeCheckAction("world_antigrief_water", player, violationDetails, dependencies);
                } else {
                    griefPlayerUtils.debugLog("AntiGrief Water: actionManager or executeCheckAction is not available.", player.nameTag);
                    if (griefLogManager && typeof griefLogManager.addLog === 'function') {
                        griefLogManager.addLog({ adminName: "System(AntiGrief)", actionType: "antigrief_water_fallback", targetName: player.nameTag, details: violationDetails.detailsString });
                    }
                }

                switch (actionTaken) {
                    case "remove":
                        eventData.cancel = true;
                        player.sendMessage("§c[AntiGrief] Water placement is restricted here.");
                        break;
                    case "warn":
                        player.sendMessage("§e[AntiGrief] Warning: Water placement is monitored.");
                        break;
                    case "logOnly":
                        break;
                }
            }
        }
    }
    if (eventData.cancel) return; // Event cancelled by Water Anti-Grief

    // --- Anti-Grief Entity Spam Logic (from ItemUseOn) ---
    const itemUsedForEntitySpam = itemStack.typeId;
    let correspondingEntityType = placeableEntityItemMap[itemUsedForEntitySpam];

    // If not in map, but itemID itself is in monitoredEntityTypes (e.g. if armor_stand item ID is directly "minecraft:armor_stand")
    // This handles cases where item ID and entity ID might be the same and explicitly monitored.
    if (!correspondingEntityType && griefConfig.entitySpamMonitoredEntityTypes?.includes(itemUsedForEntitySpam)) {
        correspondingEntityType = itemUsedForEntitySpam;
    }

    if (griefConfig.enableEntitySpamAntiGrief && correspondingEntityType && griefChecks?.checkEntitySpam) {
        if (!eventData.cancel) { // Check if not already cancelled by previous anti-grief
            const pDataForSpamCheck = await griefPlayerDataManager.ensurePlayerDataInitialized(player, currentTick);
            if (pDataForSpamCheck) {
                const spamDetected = await griefChecks.checkEntitySpam(
                    player,
                    correspondingEntityType,
                    griefConfig, // Pass the correct config object (dependencies.config)
                    pDataForSpamCheck,
                    griefPlayerUtils,
                    griefPlayerDataManager,
                    griefLogManager, // Pass the correct logManager (dependencies.logManager)
                    griefActionManager.executeCheckAction, // Pass the function itself
                    currentTick
                );

                if (spamDetected) {
                    if (griefConfig.entitySpamAction === "kill") { // Interpreted as "prevent" for ItemUseOn
                        eventData.cancel = true;
                        player.sendMessage("§c[AntiGrief] You are placing these items too quickly!");
                        griefPlayerUtils.debugLog?.(`EntitySpam: Prevented item use for ${player.nameTag} due to spam detection of ${correspondingEntityType}`, player.nameTag);
                    } else if (griefConfig.entitySpamAction === "warn") {
                        player.sendMessage("§e[AntiGrief] Warning: Placing these items too quickly is monitored.");
                    }
                    // Logging of detection is handled within checkEntitySpam via executeCheckAction
                }
            } else {
                griefPlayerUtils.debugLog?.(`EntitySpam: Could not get pData for ${player.nameTag} in handleItemUseOn.`, player.nameTag);
            }
        }
    }
    if (eventData.cancel) return; // Event cancelled by Entity Spam Anti-Grief


    // Original logic for other checks (e.g., illegal item placement)
    // Ensure pData is correctly initialized using dependencies if available, especially currentTick.
    const pDataForIllegalItems = await depPlayerDataManager.ensurePlayerDataInitialized(player, depCurrentTick);

    if (!pDataForIllegalItems) {
        depPlayerUtils.debugLog?.(`IllegalItemCheck: Could not get pData for ${player.nameTag} in handleItemUseOn. Skipping check.`, player.nameTag);
        return;
    }

    // 'checks', 'config', 'playerUtils', 'playerDataManager', 'logManager', 'executeCheckAction' here are the original direct parameters of handleItemUseOn.
    // It's better to use the 'dep' versions if they are meant to be the same, or ensure clarity.
    // For now, assuming the direct parameters are intended for checkIllegalItems as per its existing integration.
    if (checks.checkIllegalItems && config.enableIllegalItemCheck) {
        await checks.checkIllegalItems(player, itemStack, eventData, "place", pDataForIllegalItems, config, playerUtils, playerDataManager, logManager, executeCheckAction);
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
    // Call Block Spam (Rate) Check
    if (dependencies.checks && dependencies.checks.checkBlockSpam) { // Ensure dependencies and the check exist
        await dependencies.checks.checkBlockSpam(
            player,
            pData,
            block, // eventData.block
            dependencies.config,
            dependencies.playerUtils,
            dependencies.playerDataManager,
            dependencies.logManager,
            dependencies.actionManager.executeCheckAction,
            dependencies.currentTick
        );
    }
    // Call Block Spam Density Check
    if (dependencies.checks && dependencies.checks.checkBlockSpamDensity) {
        await dependencies.checks.checkBlockSpamDensity(
            player,
            pData,
            block, // eventData.block
            dependencies.config,
            dependencies.playerUtils,
            dependencies.playerDataManager,
            dependencies.logManager,
            dependencies.actionManager.executeCheckAction,
            dependencies.currentTick
        );
    }

    // --- Snow Golem & Iron Golem Construction Detection ---
    const { playerDataManager: pDataManagerForConstruct, playerUtils: pUtilsForConstruct, config: constructConfig, currentTick: constructCurrentTick } = dependencies;

    if (constructConfig && constructConfig.enableEntitySpamAntiGrief && block.typeId && (block.typeId === "minecraft:carved_pumpkin" || block.typeId === "minecraft:pumpkin")) {
        if (pData) { // pData is from the outer scope of handlePlayerPlaceBlockAfter
            try {
                const pumpkinLoc = block.location;
                const dimension = player.dimension;

                // Snow Golem Check
                const snowBlockBelow = dimension.getBlock(pumpkinLoc.offset(0, -1, 0));
                const snowBlockTwoBelow = dimension.getBlock(pumpkinLoc.offset(0, -2, 0));

                if (snowBlockBelow?.typeId === "minecraft:snow_block" && snowBlockTwoBelow?.typeId === "minecraft:snow_block") {
                    pData.expectingConstructedEntity = {
                        type: "minecraft:snow_golem",
                        location: pumpkinLoc,
                        tick: constructCurrentTick,
                        dimensionId: dimension.id
                    };
                    pData.isDirtyForSave = true;
                    pUtilsForConstruct.debugLog(`AntiGrief: Player ${player.nameTag} completed potential snow golem structure at ${JSON.stringify(pumpkinLoc)}. Expecting spawn.`, pData.isWatched ? player.nameTag : null);
                } else {
                    // Iron Golem Check (only if not a snow golem structure)
                    const centerIronBelow = dimension.getBlock(pumpkinLoc.offset(0, -1, 0));
                    const bodyIron = dimension.getBlock(pumpkinLoc.offset(0, -2, 0));

                    if (centerIronBelow?.typeId === "minecraft:iron_block" && bodyIron?.typeId === "minecraft:iron_block") {
                        const armX1 = dimension.getBlock(pumpkinLoc.offset(1, -1, 0));
                        const armX2 = dimension.getBlock(pumpkinLoc.offset(-1, -1, 0));
                        const armZ1 = dimension.getBlock(pumpkinLoc.offset(0, -1, 1));
                        const armZ2 = dimension.getBlock(pumpkinLoc.offset(0, -1, -1));

                        const xArmsValid = armX1?.typeId === "minecraft:iron_block" && armX2?.typeId === "minecraft:iron_block";
                        const zArmsValid = armZ1?.typeId === "minecraft:iron_block" && armZ2?.typeId === "minecraft:iron_block";

                        if (xArmsValid || zArmsValid) {
                            pData.expectingConstructedEntity = {
                                type: "minecraft:iron_golem",
                                location: pumpkinLoc,
                                tick: constructCurrentTick,
                                dimensionId: dimension.id
                            };
                            pData.isDirtyForSave = true;
                            pUtilsForConstruct.debugLog(`AntiGrief: Player ${player.nameTag} completed potential iron golem structure at ${JSON.stringify(pumpkinLoc)}. Expecting spawn.`, pData.isWatched ? player.nameTag : null);
                        }
                    }
                }
            } catch (e) {
                pUtilsForConstruct.debugLog(`AntiGrief: Error checking for constructable entity structure for ${player.nameTag}: ${e}`, pData.isWatched ? player.nameTag : null);
            }
        }
    }
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
 * @param {import('../types.js').EventHandlerDependencies} dependencies - Full dependencies object (used for combat chat check).
 */
export async function handleBeforeChatSend(eventData, playerDataManager, config, playerUtils, checks, logManager, executeCheckAction, currentTick, dependencies) {
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
        if (pData && pData.isWatched && playerUtils.debugLog) {
            const muteInfo = playerDataManager.getMuteInfo(player); // Fetch muteInfo for logging
            playerUtils.debugLog(`Chat canceled for ${player.nameTag} due to active mute. Reason: ${muteInfo?.reason || 'N/A'}`, player.nameTag);
        }
        return;
    }

    // Chat During Combat Check (before other spam checks)
    // The 'config' parameter here refers to the global config module (config.js values directly)
    // 'dependencies.config' would refer to the editableConfigValues if passed that way.
    // For consistency, let's assume 'config' passed to this handler IS editableConfigValues.
    // The executeCheckAction and other managers should come from the 'dependencies' object if that's the new pattern.
    const currentConfig = dependencies && dependencies.config ? dependencies.config : config; // Prefer dependencies.config if available
    const currentPUtils = dependencies && dependencies.playerUtils ? dependencies.playerUtils : playerUtils;
    const currentLogManager = dependencies && dependencies.logManager ? dependencies.logManager : logManager;
    // Resolve executeCheckAction: it might be passed directly, or via actionManager in dependencies
    let actualExecuteCheckAction = executeCheckAction; // This is the one passed directly to handleBeforeChatSend from main.js
    if (!actualExecuteCheckAction && dependencies && dependencies.actionManager && typeof dependencies.actionManager.executeCheckAction === 'function') {
        // This fallback might be redundant if main.js always passes executeCheckAction directly
        actualExecuteCheckAction = dependencies.actionManager.executeCheckAction;
    }


    if (currentConfig.enableChatDuringCombatCheck && pData.lastCombatInteractionTime && pData.lastCombatInteractionTime > 0) {
        const currentTime = Date.now();
        const timeSinceCombatMs = currentTime - pData.lastCombatInteractionTime;
        const cooldownMs = currentConfig.chatDuringCombatCooldownSeconds * 1000;

        if (timeSinceCombatMs < cooldownMs) {
            const violationDetails = {
                playerName: player.nameTag,
                timeSinceCombat: (timeSinceCombatMs / 1000).toFixed(1),
                cooldown: currentConfig.chatDuringCombatCooldownSeconds.toString(),
                messageContent: originalMessage
            };

            if (actualExecuteCheckAction) {
                 await actualExecuteCheckAction(player, "player_chat_during_combat", violationDetails, dependencies);
            } else {
                currentPUtils.debugLog("ChatDuringCombat: executeCheckAction not available.", null);
                if (currentLogManager && typeof currentLogManager.addLog === 'function') {
                    currentLogManager.addLog({ adminName: "System", actionType: "error_missing_action_manager", targetName: player.nameTag, details: "ChatDuringCombat: executeCheckAction missing." });
                }
            }

            const profile = currentConfig.checkActionProfiles?.player_chat_during_combat;
            if (profile && profile.cancelMessage) {
                eventData.cancel = true;
                currentPUtils.warnPlayer(player, `§cYou cannot chat for ${currentConfig.chatDuringCombatCooldownSeconds} seconds after combat.`);
                if (currentPUtils.debugLog && pData.isWatched) {
                    currentPUtils.debugLog(`Chat cancelled for ${player.nameTag} (combat cooldown). ${(timeSinceCombatMs / 1000).toFixed(1)}s since combat.`, player.nameTag);
                }
                return;
            }
        }
    }

    // Chat During Item Use Check (after combat check, before other spam checks)
    if (currentConfig.enableChatDuringItemUseCheck && (pData.isUsingConsumable || pData.isChargingBow)) {
        let itemUseState = "unknown";
        if (pData.isUsingConsumable) itemUseState = "using a consumable";
        else if (pData.isChargingBow) itemUseState = "charging a bow"; // Use else if to avoid overriding

        const violationDetails = {
            playerName: player.nameTag,
            itemUseState: itemUseState,
            messageContent: originalMessage
        };

        if (actualExecuteCheckAction) {
            await actualExecuteCheckAction(player, "player_chat_during_item_use", violationDetails, dependencies);
        } else {
            currentPUtils.debugLog("ChatDuringItemUse: executeCheckAction not available.", null);
            if (currentLogManager && typeof currentLogManager.addLog === 'function') {
                currentLogManager.addLog({ adminName: "System", actionType: "error_missing_action_manager", targetName: player.nameTag, details: "ChatDuringItemUse: executeCheckAction missing." });
            }
        }

        const profile = currentConfig.checkActionProfiles?.player_chat_during_item_use;
        if (profile && profile.cancelMessage) {
            eventData.cancel = true;
            currentPUtils.warnPlayer(player, `§cYou cannot chat while ${itemUseState}.`);
            if (currentPUtils.debugLog && pData.isWatched) {
                currentPUtils.debugLog(`Chat cancelled for ${player.nameTag} (item use state: ${itemUseState}).`, player.nameTag);
            }
            return;
        }
    }

    const commonArgs = [player, pData, eventData, currentConfig, currentPUtils, playerDataManager, currentLogManager, actualExecuteCheckAction, currentTick];


    if (checks.checkMessageRate && currentConfig.enableFastMessageSpamCheck) {
        if (await checks.checkMessageRate(...commonArgs)) {
            eventData.cancel = true;
            if (currentPUtils.debugLog) currentPUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled by MessageRateCheck.`, pData.isWatched ? player.nameTag : null);
            return;
        }
    }
    if (checks.checkMessageWordCount && currentConfig.enableMaxWordsSpamCheck) {
        if (await checks.checkMessageWordCount(...commonArgs)) {
            eventData.cancel = true;
            if (currentPUtils.debugLog) currentPUtils.debugLog(`handleBeforeChatSend: Message from ${player.nameTag} cancelled by MessageWordCountCheck.`, pData.isWatched ? player.nameTag : null);
            return;
        }
    }

    // Log if message passed checks before formatting and sending
    if (pData && pData.isWatched && !eventData.cancel && playerUtils.debugLog) {
        playerUtils.debugLog(`Chat message from ${player.nameTag} passed checks, proceeding to format/broadcast. Original: "${originalMessage}"`, player.nameTag);
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
    playerUtils.debugLog(`Player ${player.nameTag} changed dimension from ${fromDimension.id} to ${toDimension.id}. From loc: ${JSON.stringify(fromLocation)}`, player.nameTag);

    if (!player || !fromDimension || !toDimension || !fromLocation) {
        playerUtils.debugLog("DimensionLock: Invalid eventData in handlePlayerDimensionChangeAfter (after initial log).", null);
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
