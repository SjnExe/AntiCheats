import { world, system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { saveAllData } from './dataManager.js';
import { getPlayer } from './playerDataManager.js';
import { debugLog } from './logger.js';

let restartInProgress = false;
let countdownTimer = -1;

/**
 * Starts the server restart sequence.
 * @param {import('@minecraft/server').Player} initiator The player who started the restart.
 */
export function startRestart(initiator) {
    if (restartInProgress) {
        initiator.sendMessage('§cRestart is already in progress.');
        return;
    }

    const config = getConfig();
    const countdownSeconds = config.restart?.countdownSeconds ?? 30;

    restartInProgress = true;
    countdownTimer = countdownSeconds;

    world.sendMessage(`§l§c[SERVER] Attention! The server will restart in ${countdownSeconds} seconds.`);
    if (initiator) {
        initiator.sendMessage('§aYou have initiated the server restart sequence.');
    }

    const countdownInterval = system.runInterval(() => {
        if (countdownTimer > 0) {
            const message = `§l§cServer restarting in ${countdownTimer}...`;
            // Use action bar for a less intrusive, constant reminder
            for (const player of world.getAllPlayers()) {
                player.onScreenDisplay.setActionBar(message);
            }

            // Announce in chat at key moments
            if (countdownTimer === 30 || countdownTimer === 15 || countdownTimer === 10 || countdownTimer <= 5) {
                world.sendMessage(message);
            }

            countdownTimer--;
        } else {
            // Time's up
            system.clearRun(countdownInterval);
            finalizeRestart();
        }
    }, 20); // Run every second
}

/**
 * Finalizes the restart: saves data, kicks players, and logs to console.
 */
function finalizeRestart() {
    debugLog('[RestartManager] Finalizing server restart...');
    world.sendMessage('§l§c[SERVER] Finalizing restart... saving all data now.');

    saveAllData({ log: true });

    const kickMessage = getConfig().restart?.kickMessage ?? 'Server is restarting. Please rejoin shortly.';

    // Use a short delay to allow the "saving" message to be seen
    system.runTimeout(() => {
        debugLog('[RestartManager] Kicking non-admin players.');
        for (const player of world.getAllPlayers()) {
            const pData = getPlayer(player.id);
            // Don't kick owners or admins. This also prevents kicking the host in single-player.
            if (pData && pData.permissionLevel <= 1) {
                player.sendMessage('§eYou were not kicked because you are an admin.');
                continue;
            }
            // Use world.runCommandAsync for server-level permissions, which is required for /kick
            world.runCommandAsync(`kick "${player.name}" ${kickMessage}`);
        }

        // This is the final message to the console operator
        console.warn('[AddonExe] SERVER IS READY FOR RESTART. All players have been kicked and data has been saved.');

        restartInProgress = false; // Reset the flag
    }, 60); // 3-second delay
}
