import { world, system } from '@minecraft/server';
import { loadConfig } from './configManager.js';
import { getOrCreatePlayer, handlePlayerLeave } from './playerDataManager.js';
import { debugLog } from './logger.js';
import { commandManager } from '../modules/commands/commandManager.js';

// --- Main Initialization ---
system.run(() => {
    loadConfig();
    debugLog('[AddonExe] Addon Initializing...');

    // Import the command index file. This will register all commands.
    import('../modules/commands/index.js').then(() => {
        debugLog('[AddonExe] Commands loaded successfully.');
    }).catch(error => {
        console.error(`[AddonExe] Failed to load commands: ${error.stack}`);
    });

    debugLog('[AddonExe] Core systems loaded. Waiting for players.');
});


// --- Player Event Handling ---
world.afterEvents.playerSpawn.subscribe((event) => {
    const { player, initialSpawn } = event;
    if (initialSpawn) {
        debugLog(`[AddonExe] Player ${player.name} has spawned for the first time. Creating data...`);
        getOrCreatePlayer(player);
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    debugLog(`[AddonExe] Player ${event.playerName} has left. Saving data and clearing from cache.`);
    handlePlayerLeave(event.playerId);
});


// --- Chat Event Handling ---
world.beforeEvents.chatSend.subscribe((eventData) => {
    // Let the command manager handle the message.
    // It will cancel the event if it's a command.
    commandManager.handleCommand(eventData);
});
