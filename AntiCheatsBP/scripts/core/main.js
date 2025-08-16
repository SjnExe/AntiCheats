import { world, system } from '@minecraft/server';
import { config as defaultConfig } from '../config.js';
import * as rankManager from './rankManager.js';
import * as playerDataManager from './playerDataManager.js';

let addonConfig;

// This function will contain the main logic of the addon that runs continuously.
function mainTick() {
    // For now, this is empty. We will add cheat detections here later.
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
        addonConfig = JSON.parse(configStr);
        // We will add config migration logic here in the future
        console.log('[AntiCheats] Existing config found.');
    }

    rankManager.initialize();
    system.runInterval(mainTick);
    console.log('[AntiCheats] Addon initialized successfully.');
});

// For now, I will keep the chat message forwarder to show the addon is active.
world.beforeEvents.chatSend.subscribe((eventData) => {
    eventData.cancel = true;
    world.sendMessage(`§l§cAnti §eCheats§r> §a${eventData.sender.name}§r: ${eventData.message}`);
});

world.afterEvents.playerJoin.subscribe((event) => {
    console.log(`[Debug] playerJoin event fired. Keys on event: ${Object.keys(event).join(', ')}`);
    const { player } = event;

    if (!player) {
        console.error('[Debug] Player object is undefined or null in playerJoin event!');
        return;
    }

    console.log(`[Debug] Player object received. Name: ${player.name}, ID: ${player.id}`);

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
