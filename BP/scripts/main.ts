import * as mc from '@minecraft/server';
import { isAdmin, warnPlayer, notifyAdmins, debugLog } from './playerUtils';
import { PREFIX } from './config';
import { checkFly, checkSpeed } from './movementChecks';

debugLog("Anti-Cheat Script Loaded. Initializing...");

// --- Event Subscriptions ---

// Example: Before Chat Send Event (for commands or chat filtering)
mc.world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const message = eventData.message;

    if (message.startsWith(PREFIX)) {
        eventData.cancel = true; // Cancel the original message
        const args = message.substring(PREFIX.length).trim().split(/\s+/);
        const command = args.shift()?.toLowerCase();

        debugLog(`Player ${player.nameTag} issued command: ${command} with args: ${args.join(', ')}`);

        if (!isAdmin(player)) {
            warnPlayer(player, "You do not have permission to use Anti-Cheat commands.");
            return;
        }

        // Handle commands
        switch (command) {
            case "testnotify":
                notifyAdmins("This is a test notification!");
                player.sendMessage("Test notification sent to admins.");
                break;
            // Add more admin commands here
            default:
                player.sendMessage(`§cUnknown command: ${command}§r`);
        }
    }
    // Add other chat filtering logic if needed (e.g., spam, offensive language)
});

// Example: Player Hurt Event (for logging or specific responses to damage)
mc.world.afterEvents.entityHurt.subscribe((eventData) => {
    if (eventData.hurtEntity.typeId === 'minecraft:player') {
        const player = eventData.hurtEntity as mc.Player;
        const damage = eventData.damage;
        const cause = eventData.cause;
        const damagingEntity = cause.damagingEntity;

        debugLog(`Player ${player.nameTag} hurt. Damage: ${damage}, Cause: ${cause.category}, Damaging Entity: ${damagingEntity?.typeId ?? 'N/A'}`);
        // Add checks for god mode (e.g., if damage is high but health doesn't change significantly),
        // or to log combat events.
    }
});

// Example: Block Break Event (for nuker, illegal block breaks)
mc.world.beforeEvents.playerBreakBlock.subscribe((eventData) => {
    const player = eventData.player;
    const block = eventData.block;
    // debugLog(`Player ${player.nameTag} attempting to break block ${block.typeId} at ${block.location.x},${block.location.y},${block.location.z}`);
    // Add checks for nuker (too many blocks too fast - would need a tick-based counter)
    // Add checks for breaking unbreakable blocks or blocks in protected regions.
});

// Placeholder for tick event subscription for periodic checks
// let currentTick = 0;
// mc.system.runInterval(() => {
//     currentTick++;
//     if (currentTick % 20 === 0) { // Every second (assuming 20 ticks/sec)
//         for (const player of mc.world.getAllPlayers()) {
//             checkFly(player);
//             checkSpeed(player);
//             // Add other periodic checks
//         }
//     }
// }, 1); // Run every tick

debugLog("Anti-Cheat Event Subscriptions Initialized.");

// --- Additional Initializations ---
// (e.g., load dynamic properties, setup scoreboard objectives)
