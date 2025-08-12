import { world, system } from '@minecraft/server';

console.log('[AC Tick Test] Script loaded. Using system.runInterval.');

function processPlayer(player) {
    if (typeof player?.isValid !== 'function') {
        console.error(`[AC Tick Test ERROR] Received an invalid player-like object. Type: ${typeof player}. Keys: ${player ? Object.keys(player).join(', ') : 'null'}`);
        return;
    }
}

system.runInterval(() => {
    try {
        const players = world.getPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            processPlayer(player);
        }
    } catch (e) {
        console.error(`[AC Tick Test CRITICAL] Error in tick loop: ${e.message}\\n${e.stack}`);
    }
}, 1);

console.log('[AC Tick Test] Tick loop started.');
