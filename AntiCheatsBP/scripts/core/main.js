import { world, system, GameMode } from '@minecraft/server';
import { loadConfig, getConfig } from './configManager.js';
import * as rankManager from './rankManager.js';
import * as playerDataManager from './playerDataManager.js';
import { commandManager } from '../modules/commands/commandManager.js';
import { getPunishment, loadPunishments } from './punishmentManager.js';
import { showPanel } from './uiManager.js';
import { debugLog } from './logger.js';

/**
 * Checks a player's gamemode and corrects it if they are in creative without permission.
 * @param {import('@minecraft/server').Player} player The player to check.
 */
function checkPlayerGamemode(player) {
    const config = getConfig();
    const pData = playerDataManager.getPlayer(player.id);
    if (!pData) return;

    if (player.getGameMode() === GameMode.Creative && pData.permissionLevel > 1) {
        player.setGameMode(config.defaultGamemode);
        player.sendMessage('§cYou are not allowed to be in creative mode.');
        debugLog(`[AntiCheats] Detected ${player.name} in creative mode without permission. Switched to ${config.defaultGamemode}.`);
    }
}

// This function will contain the main logic of the addon that runs continuously.
function mainTick() {
    // Rank update check
    for (const player of world.getAllPlayers()) {
        const pData = playerDataManager.getPlayer(player.id);
        if (!pData) continue;

        const currentRank = rankManager.getPlayerRank(player, getConfig());
        if (pData.rankId !== currentRank.id) {
            pData.rankId = currentRank.id;
            pData.permissionLevel = currentRank.permissionLevel;
            playerDataManager.savePlayerData();
            debugLog(`[AntiCheats] Player ${player.name}'s rank updated to ${currentRank.name}.`);
            player.sendMessage(`§aYour rank has been updated to ${currentRank.name}.`);
        }
    }
}

// Run the initialization logic on the next tick after the script is loaded.
system.run(() => {
    playerDataManager.loadPlayerData();
    loadConfig();
    debugLog('[AntiCheats] Initializing addon...');
    loadPunishments();
    rankManager.initialize();

    const config = getConfig();

    // Owner configuration check
    if (!config.ownerPlayerNames || config.ownerPlayerNames.length === 0 || config.ownerPlayerNames[0] === 'Your•Name•Here') {
        const warningMessage = '§l§c[AntiCheats] WARNING: No owner is configured. Please set `ownerPlayerNames` in `scripts/config.js` to gain access to admin commands.';
        // Use a runTimeout to ensure the message is sent after the world is fully initialized.
        system.runTimeout(() => {
            world.sendMessage(warningMessage);
        }, 20);
        console.warn('[AntiCheats] No owner configured.');
    }

    // Setup Creative Detection
    if (config.creativeDetection.enabled) {
        if (config.defaultGamemode === 'creative') {
            console.warn('[AntiCheats] Creative detection is disabled because the default gamemode is set to creative, which would cause a loop.');
        } else {
            // Run periodic check
            if (config.creativeDetection.periodicCheck.enabled) {
                system.runInterval(() => {
                    for (const player of world.getAllPlayers()) {
                        checkPlayerGamemode(player);
                    }
                }, config.creativeDetection.periodicCheck.intervalSeconds * 20);
            }
            // The on-join check is handled in the playerSpawn event
        }
    }


    import('../modules/commands/index.js').then(() => {
        debugLog('[AntiCheats] Commands loaded.');
    }).catch(error => {
        console.error(`[AntiCheats] Failed to load commands: ${error.stack}`);
    });

    system.runInterval(mainTick, 20);
    debugLog('[AntiCheats] Addon initialized successfully.');
});

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
    if (!rank) {
        world.sendMessage(`§7${player.name}§r: ${eventData.message}`);
        return;
    }
    const format = rank.chatFormatting;
    world.sendMessage(`${format.prefixText}${format.nameColor}${player.name}§r: ${format.messageColor}${eventData.message}`);
});

world.afterEvents.playerSpawn.subscribe(async (event) => {
    const { player, initialSpawn } = event;

    // Ban check
    const punishment = getPunishment(player.id);
    if (punishment?.type === 'ban') {
        const remainingTime = Math.round((punishment.expires - Date.now()) / 1000);
        const durationText = punishment.expires === Infinity ? 'permanently' : `for another ${remainingTime} seconds`;

        system.run(() => {
            player.runCommandAsync(`kick "${player.name}" You are banned ${durationText}. Reason: ${punishment.reason}`);
        });
        return;
    }

    const pData = playerDataManager.getOrCreatePlayer(player);
    const rank = rankManager.getPlayerRank(player, getConfig());
    if (pData.rankId !== rank.id) {
        pData.rankId = rank.id;
        pData.permissionLevel = rank.permissionLevel;
        debugLog(`[AntiCheats] Player ${player.name}'s rank updated to ${rank.name}.`);
        player.sendMessage(`§aYour rank has been updated to ${rank.name}.`);
    } else if (initialSpawn) {
        debugLog(`[AntiCheats] Player ${player.name} joined with rank ${rank.name}.`);
    }

    // Creative detection on join (runs after player data is initialized)
    const config = getConfig();
    if (config.creativeDetection.enabled && config.defaultGamemode !== 'creative') {
        checkPlayerGamemode(player);
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    playerDataManager.handlePlayerLeave(event.playerId);
    debugLog(`[AntiCheats] Player ${event.playerName} left.`);
});

// Handle the custom admin panel item being used
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (itemStack.typeId === 'ac:panel') {
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
        const pData = playerDataManager.getPlayer(player.id);
        if (!pData) return;

        const onlineAdmins = world.getAllPlayers().filter(p => {
            const adminPData = playerDataManager.getPlayer(p.id);
            return adminPData && adminPData.permissionLevel <= 1 && adminPData.xrayNotifications;
        });

        const location = brokenBlock.location;
        const message = `§e${player.name}§r mined §e${brokenBlock.typeId.replace('minecraft:', '')}§r at §bX: ${location.x}, Y: ${location.y}, Z: ${location.z}`;

        onlineAdmins.forEach(admin => {
            admin.sendMessage(message);
        });
    }
});
