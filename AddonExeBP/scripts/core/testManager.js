import { system, world } from '@minecraft/server';
import { getPlayerRank } from './rankManager.js';
import { getConfig } from './configManager.js';
import { debugLog } from './logger.js';

/**
 * Handles the test kick script event.
 */
function handleTestKick() {
    debugLog('[TestManager] Received test_kick scriptevent.');
    const config = getConfig();
    const kickMessage = 'Kicked by Test Method 3: Script Event';

    let kickedPlayers = 0;
    for (const player of world.getAllPlayers()) {
        const rank = getPlayerRank(player, config);
        if (rank.permissionLevel > 1) {
            try {
                player.kick(kickMessage);
                debugLog(`[TestManager] Kicked player ${player.name} (Rank: ${rank.name}, Permission: ${rank.permissionLevel})`);
                kickedPlayers++;
            } catch (error) {
                console.error(`[TestManager] Failed to kick player ${player.name}: ${error}`);
            }
        } else {
            debugLog(`[TestManager] Did not kick player ${player.name} (Rank: ${rank.name}, Permission: ${rank.permissionLevel})`);
        }
    }

    debugLog(`[TestManager] Test kick complete. Kicked ${kickedPlayers} player(s).`);
}

// Register the scriptevent listener
system.afterEvents.scriptEventReceive.subscribe(
    (event) => {
        if (event.id === 'addonexe:test_kick') {
            handleTestKick();
        }
    },
    { namespaces: ['addonexe'] }
);
