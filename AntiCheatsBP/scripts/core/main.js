import { world, system } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import * as rankManager from './rankManager.js';
import * as playerDataManager from './playerDataManager.js';
import { commandManager } from '../modules/commands/commandManager.js';

let addonConfig;

// This function will contain the main logic of the addon that runs continuously.
function mainTick() {
    // Rank update check
    for (const player of world.getAllPlayers()) {
        const pData = playerDataManager.getPlayer(player.id);
        if (!pData) continue;

        const currentRank = rankManager.getPlayerRank(player, addonConfig);
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

    const configStr = world.getDynamicProperty('anticheats:config');
    if (configStr === undefined) {
        world.setDynamicProperty('anticheats:config', JSON.stringify(defaultConfig));
        addonConfig = defaultConfig;
        console.log('[AntiCheats] No existing config found. Created a new one.');
    } else {
        const savedConfig = JSON.parse(configStr);
        addonConfig = { ...defaultConfig, ...savedConfig };
        // Save the merged config back to the dynamic property to persist new default values
        world.setDynamicProperty('anticheats:config', JSON.stringify(addonConfig));
        console.log('[AntiCheats] Existing config found and updated with any new default values.');
    }

    rankManager.initialize();

    // Load all command modules
    import('../modules/commands/index.js').then(() => {
        console.log('[AntiCheats] Commands loaded.');
    }).catch(error => {
        console.error(`[AntiCheats] Failed to load commands: ${error.stack}`);
    });

    // Run the mainTick every 60 ticks (3 seconds) to reduce performance impact
    system.runInterval(mainTick, 60);
    console.log('[AntiCheats] Addon initialized successfully.');
});

// Handle commands and chat formatting
world.beforeEvents.chatSend.subscribe((eventData) => {
    // Try to handle it as a command first.
    const wasCommand = commandManager.handleCommand(eventData, addonConfig);
    if (wasCommand) {
        return; // Command was handled (or was an invalid command), so we're done.
    }

    // If it wasn't a command, proceed with chat formatting.
    eventData.cancel = true; // We need to cancel the original message to format it.

    const player = eventData.sender;
    const pData = playerDataManager.getPlayer(player.id);

    if (!pData) {
        // Player data not found, send a default formatted message
        world.sendMessage(`§7${player.name}§r: ${eventData.message}`);
        return;
    }

    const rank = rankManager.getRankById(pData.rankId);
    if (!rank) {
        // Rank not found, send a default formatted message
        world.sendMessage(`§7${player.name}§r: ${eventData.message}`);
        return;
    }

    const format = rank.chatFormatting;
    world.sendMessage(`${format.prefixText}${format.nameColor}${player.name}§r: ${format.messageColor}${eventData.message}`);
});

world.afterEvents.playerSpawn.subscribe((event) => {
    const { player } = event;
    const pData = playerDataManager.addPlayer(player);
    const rank = rankManager.getPlayerRank(player, addonConfig);
    pData.rankId = rank.id;
    pData.permissionLevel = rank.permissionLevel;
    console.log(`[AntiCheats] Player ${player.name} joined with rank ${rank.name}.`);
});

world.afterEvents.playerLeave.subscribe((event) => {
    const { playerId, playerName } = event;
    playerDataManager.removePlayer(playerId);
    console.log(`[AntiCheats] Player ${playerName} left.`);
});
