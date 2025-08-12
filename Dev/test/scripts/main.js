import { world, system } from '@minecraft/server';

console.log('[AC Tick Test] Script loaded. Waiting for initialization command...');

let isTickLoopInitialized = false;

function initializeTickLoop() {
    if (isTickLoopInitialized) {
        console.warn('[AC Tick Test] Tick loop is already initialized.');
        return;
    }

    console.log('[AC Tick Test] Initializing tick loop...');

    system.afterEvents.scriptEventReceive.subscribe(event => {
        if (event.id === 'test:tick') {
            try {
                const players = world.getPlayers();
                for (const player of players) {
                    processPlayer(player);
                }
            } catch (e) {
                console.error(`[AC Tick Test CRITICAL] Error in tick loop: ${e.message}\\n${e.stack}`);
            }
        }
    }, { namespaces: ['test'] });

    isTickLoopInitialized = true;
    console.log('[AC Tick Test] Tick loop initialized successfully.');
}

function processPlayer(player) {
    if (typeof player?.isValid !== 'function') {
        console.error(`[AC Tick Test ERROR] Received an invalid player-like object. Type: ${typeof player}. Keys: ${player ? Object.keys(player).join(', ') : 'null'}`);
        return;
    }
}

// Main listener for initialization commands
system.afterEvents.scriptEventReceive.subscribe(event => {
    if (event.id === 'test:init') {
        initializeTickLoop();
    }
}, { namespaces: ['test'] });
