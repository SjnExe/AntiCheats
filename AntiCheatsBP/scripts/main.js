// AntiCheats Addon - Main script entry point
// This file will be the starting point for the addon's scripting logic.

import { world } from '@minecraft/server';

world.beforeEvents.chatSend.subscribe((eventData) => {
    eventData.cancel = true;
    world.sendMessage(`§l§cAnti §eCheats§r> §a${eventData.sender.name}§r: ${eventData.message}`);
});
