import { world, system } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { saveAllData } from './dataManager.js';
import { getPlayerRank } from './rankManager.js';
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

    // Use a short delay to allow the "saving" message to be seen
    system.runTimeout(() => {
        debugLog('[RestartManager] Kicking non-admin players.');
        const config = getConfig();
        const kickMessage = config.restart?.kickMessage ?? 'Server is restarting.';

        let kickedPlayers = 0;
        for (const player of world.getAllPlayers()) {
            const rank = getPlayerRank(player, config);
            // Kick players with a permission level greater than 1 (e.g., Member)
            if (rank.permissionLevel > 1) {
                try {
                    // Using system.run() to schedule the kick for the next tick, avoiding context issues.
                    system.run(() => {
                        player.kick(kickMessage);
                    });
                    kickedPlayers++;
                } catch (error) {
                    console.error(`[RestartManager] Failed to kick player ${player.name}: ${error}`);
                }
            } else {
                player.sendMessage('§aYou were not kicked by the restart sequence because you are an admin/owner.');
            }
        }

        debugLog(`[RestartManager] Kicked ${kickedPlayers} player(s).`);
        console.warn('[AddonExe] SERVER IS READY FOR RESTART. Data has been saved and players have been kicked.');

        restartInProgress = false; // Reset the flag
    }, 60); // 3-second delay
}
