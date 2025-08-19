import { world, system } from '@minecraft/server';
import { loadConfig, getConfig } from './configManager.js';
import * as rankManager from './rankManager.js';
import * as playerDataManager from './playerDataManager.js';
import { commandManager } from '../modules/commands/commandManager.js';
import { getBanInfo } from './banManager.js';
import { showPanel } from './uiManager.js';

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
            console.log(`[AntiCheats] Player ${player.name}'s rank updated to ${currentRank.name}.`);
            player.sendMessage(`§aYour rank has been updated to ${currentRank.name}.`);
        }
    }
}

// Run the initialization logic on the next tick after the script is loaded.
system.run(() => {
    console.log('[AntiCheats] Initializing addon...');
    loadConfig();
    rankManager.initialize();

    import('../modules/commands/index.js').then(() => {
        console.log('[AntiCheats] Commands loaded.');
    }).catch(error => {
        console.error(`[AntiCheats] Failed to load commands: ${error.stack}`);
    });

    system.runInterval(mainTick, 20);
    console.log('[AntiCheats] Addon initialized successfully.');
});

// Handle muted players, commands, and chat formatting
world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;

    if (player.hasTag('muted')) {
        eventData.cancel = true;
        player.sendMessage('§cYou are muted and cannot send messages.');
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

    const banInfo = getBanInfo(player.name);
    if (banInfo) {
        system.run(() => {
            player.runCommandAsync(`kick "${player.name}" You are banned. Reason: ${banInfo.reason}`);
        });
        return;
    }

    if (initialSpawn) {
        const pData = playerDataManager.addPlayer(player);
        const rank = rankManager.getPlayerRank(player, getConfig());
        pData.rankId = rank.id;
        pData.permissionLevel = rank.permissionLevel;
        console.log(`[AntiCheats] Player ${player.name} joined with rank ${rank.name}.`);
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    playerDataManager.removePlayer(event.playerId);
    console.log(`[AntiCheats] Player ${event.playerName} left.`);
});

world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (itemStack.typeId === 'anticheats:admin_panel') {
        const pData = playerDataManager.getPlayer(player.id);
        // Permission level 1 or lower (Admins and Owners)
        if (pData && pData.permissionLevel <= 1) {
            showPanel(player, 'mainAdminPanel');
        } else {
            player.sendMessage('§cYou do not have permission to use this item.');
        }
    }
});
