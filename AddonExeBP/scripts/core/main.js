import { world, system } from '@minecraft/server';
import { loadConfig, getConfig, updateConfig } from './configManager.js';
import * as dataManager from './dataManager.js';
import * as rankManager from './rankManager.js';
import * as playerDataManager from './playerDataManager.js';
import { commandManager } from '../modules/commands/commandManager.js';
import { getPunishment, loadPunishments, clearExpiredPunishments } from './punishmentManager.js';
import { loadReports, clearOldResolvedReports } from './reportManager.js';
import { loadCooldowns, clearExpiredCooldowns } from './cooldownManager.js';
import { clearExpiredPayments } from './economyManager.js';
import { showPanel } from './uiManager.js';
import { debugLog } from './logger.js';
import * as playerCache from './playerCache.js';
import { startRestart } from './restartManager.js';

/**
 * Checks a player's rank and updates it if necessary.
 * @param {import('@minecraft/server').Player} player The player to check.
 */
export function updatePlayerRank(player) {
    const pData = playerDataManager.getPlayer(player.id);
    if (!pData) return;

    const config = getConfig();
    const oldRankId = pData.rankId;
    const newRank = rankManager.getPlayerRank(player, config);

    if (oldRankId !== newRank.id) {
        pData.rankId = newRank.id;
        pData.permissionLevel = newRank.permissionLevel;
        playerDataManager.savePlayerData(player.id); // Save the change immediately
        debugLog(`[AddonExe] Player ${player.name}'s rank updated from ${oldRankId} to ${newRank.name}.`);
        player.sendMessage(`§aYour rank has been updated to ${newRank.name}.`);
    }
}

/**
 * Iterates through all online players and updates their ranks.
 */
export function updateAllPlayerRanks() {
    for (const player of playerCache.getAllPlayersFromCache()) {
        updatePlayerRank(player);
    }
}

/**
 * Loads all persistent data from dynamic properties.
 */
function loadPersistentData() {
    debugLog('[AddonExe] Loading persistent data...');
    playerDataManager.loadNameIdMap();
    loadPunishments();
    loadReports();
    loadCooldowns();
}

/**
 * Initializes all core managers and performs startup data clearing.
 */
function initializeManagers() {
    debugLog('[AddonExe] Initializing managers...');
    rankManager.initialize();
    // Clear any expired data on startup
    clearExpiredPunishments();
    clearOldResolvedReports();
    clearExpiredCooldowns();
    clearExpiredPayments();
}

/**
 * Checks for critical configuration issues.
 */
function checkConfiguration() {
    const config = getConfig();
    if (!config.ownerPlayerNames || config.ownerPlayerNames.length === 0 || config.ownerPlayerNames[0] === 'Your•Name•Here') {
        const warningMessage = '§l§c[AddonExe] WARNING: No owner is configured. Please set `ownerPlayerNames` in `scripts/config.js` to gain access to admin commands.';
        system.runTimeout(() => world.sendMessage(warningMessage), 20);
        console.warn('[AddonExe] No owner configured.');
    }
}

/**
 * Starts all recurring system timers.
 */
function startSystemTimers() {
    // Periodically clear expired payment confirmations
    system.runInterval(clearExpiredPayments, 6000); // 5 minutes
    // Rank updates are now handled by events (e.g., !admin command)
    debugLog('[AddonExe] System timers started.');
}

/**
 * Main entry point for addon initialization.
 */
function initializeAddon() {
    debugLog('[AddonExe] Initializing addon...');
    loadConfig();
    dataManager.initializeDataManager();
    loadPersistentData();
    initializeManagers();
    checkConfiguration();

    // Dynamically load command modules
    import('../modules/commands/index.js').then(() => {
        debugLog('[AddonExe] Commands loaded successfully.');
    }).catch(error => {
        console.error(`[AddonExe] Failed to load commands: ${error.stack}`);
    });

    startSystemTimers();
    debugLog('[AddonExe] Addon initialized successfully.');
}

// Run the initialization logic on the next tick after the script is loaded.
system.run(initializeAddon);

// Handle muted players, commands, and chat formatting
world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;

    const punishment = getPunishment(player.id);
    if (punishment?.type === 'mute') {
        eventData.cancel = true;
        const remainingTime = Math.round((punishment.expires - Date.now()) / 1000);
        const durationText = punishment.expires === Infinity ? 'permanently' : `for another ${remainingTime} seconds`;
        player.sendMessage(`§cYou are muted ${durationText}. Reason: ${punishment.reason}`);
        return;
    }

    const wasCommand = commandManager.handleCommand(eventData, getConfig());
    if (wasCommand) return;

    eventData.cancel = true;
    const pData = playerDataManager.getPlayer(player.id);
    if (!pData) {
        world.sendMessage(`§7${player.name}§r: ${eventData.message}`);
        return;
    }
    const rank = rankManager.getRankById(pData.rankId);
    const formattedMessage = rank
        ? `${rank.chatFormatting.prefixText}${rank.chatFormatting.nameColor}${player.name}§r: ${rank.chatFormatting.messageColor}${eventData.message}`
        : `§7${player.name}§r: ${eventData.message}`;

    // Log to console if enabled
    if (getConfig().chat?.logToConsole) {
        // Using a plain-text version for the console log to avoid clutter from formatting codes
        console.log(`<${player.name}> ${eventData.message}`);
    }

    world.sendMessage(formattedMessage);
});

world.afterEvents.playerSpawn.subscribe(async (event) => {
    const { player, initialSpawn } = event;
    playerCache.addPlayerToCache(player);

    // Ban check
    const punishment = getPunishment(player.id);
    if (punishment?.type === 'ban') {
        const remainingTime = Math.round((punishment.expires - Date.now()) / 1000);
        const durationText = punishment.expires === Infinity ? 'permanently' : `for another ${remainingTime} seconds`;

        // Use a command-based kick for reliability.
        // A system.run is still good practice to ensure the command runs in a clean context after the spawn event.
        system.run(() => {
            try {
                world.getDimension('overworld').runCommand(`kick "${player.name}" You have been banned ${durationText}. Reason: ${punishment.reason}`);
            } catch (error) {
                console.error(`[BanCheck] Failed to kick banned player ${player.name}:`, error);
            }
        });
        return;
    }

    const pData = playerDataManager.getOrCreatePlayer(player);
    updatePlayerRank(player); // Check and update rank on join

    if (initialSpawn) {
        const rank = rankManager.getRankById(pData.rankId);
        debugLog(`[AddonExe] Player ${player.name} joined with rank ${rank?.name ?? 'unknown'}.`);
    }

    // Update X-ray notification cache for admins
    if (pData.permissionLevel <= 1 && pData.xrayNotifications) {
        playerCache.addAdminToXrayCache(player.id);
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    playerDataManager.handlePlayerLeave(event.playerId);
    playerCache.removePlayerFromCache(event.playerId);
    debugLog(`[AddonExe] Player ${event.playerName} left.`);
});

// Handle the custom admin panel item being used
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (itemStack.typeId === 'exe:panel') {
        // Player data is still needed for button permissions inside the panel
        const pData = playerDataManager.getPlayer(player.id);
        if (pData) {
            showPanel(player, 'mainPanel');
        }
    }
});

world.afterEvents.blockBreak?.subscribe((event) => {
    const { brokenBlock, player } = event;
    const valuableOres = [
        'minecraft:diamond_ore',
        'minecraft:deepslate_diamond_ore',
        'minecraft:ancient_debris'
    ];

    if (valuableOres.includes(brokenBlock.typeId)) {
        const onlineAdmins = playerCache.getXrayAdmins();
        if (onlineAdmins.length === 0) return;

        const location = brokenBlock.location;
        const message = `§e${player.name}§r mined §e${brokenBlock.typeId.replace('minecraft:', '')}§r at §bX: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)}`;

        onlineAdmins.forEach(admin => {
            // Don't notify the admin if they are the one mining
            if (admin.id !== player.id) {
                admin.sendMessage(message);
            }
        });
    }
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;

    switch (id) {
        case 'addonexe:restart':
            // The script event can be triggered by a player or a command block.
            // If it's a player, we can use their entity as the initiator.
            // If it's a command block, sourceEntity will be undefined.
            // The startRestart function can handle a null initiator.
            startRestart(sourceEntity);
            break;

        case 'addonexe:toggle_chat_log': {
            const config = getConfig();
            const chatConfig = config.chat || { logToConsole: false };
            const newValue = !chatConfig.logToConsole;
            chatConfig.logToConsole = newValue;
            updateConfig('chat', chatConfig);

            const feedbackMessage = `§aChat-to-console has been ${newValue ? '§aenabled' : '§cdisabled'}§a.`;
            // Notify the entity that triggered the event, if possible
            if (sourceEntity && sourceEntity.sendMessage) {
                sourceEntity.sendMessage(feedbackMessage);
            }
            // Also log it to console for confirmation from non-player sources
            console.log(`[AddonExe] ${feedbackMessage}`);
            break;
        }

        case 'addonexe:grant_admin_self': {
            if (sourceEntity && sourceEntity.addTag) {
                sourceEntity.addTag(getConfig().adminTag);
                sourceEntity.sendMessage('§aYou have been promoted to Admin.');
                // Update ranks for everyone to ensure changes are reflected
                updateAllPlayerRanks();
            }
            break;
        }
    }
});
