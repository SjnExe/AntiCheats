import { world, system } from '@minecraft/server';

console.log('[AC Tick Test] Script loaded. Deferring setup by one tick.');

function processPlayer(player) {
    if (typeof player?.isValid !== 'function') {
        console.error(`[AC Tick Test ERROR] Received an invalid player-like object. Type: ${typeof player}. Keys: ${player ? Object.keys(player).join(', ') : 'null'}`);
        return;
    }
}

// Defer setup by one tick to ensure all game objects are available.
system.run(() => {
    try {
        world.afterEvents.worldInitialize.subscribe(() => {
            console.log('[AC Tick Test] World Initialized.');
        });

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

        console.log('[AC Tick Test] Event subscriptions successful.');

    } catch (e) {
        console.error(`[AC Tick Test CRITICAL] Error during deferred setup: ${e.message}\\n${e.stack}`);
    }
});
