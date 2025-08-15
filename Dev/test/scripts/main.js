import { world, system, Player } from '@minecraft/server';
import { performInitializations } from './core/initializationManager.js';

let isInitialized = false;

console.log('[AC Test - Stage 2] Script loaded. Run /function ac to initialize.');

// Listener for the initialization event
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === 'ac:init') {
        if (isInitialized) {
            console.warn('[AC Test - Stage 2] Already initialized.');
            return;
        }
        performInitializations();
        isInitialized = true;
    }
}, { namespaces: ['ac'] });

// The main tick loop listener. It remains here from the baseline test.
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === 'ac:main_tick') {
        if (!isInitialized) return;

        try {
            const allEntities = world.getPlayers();
            for (const entity of allEntities) {
                if (entity instanceof Player) {
                    // Stable loop is working.
                }
            }
        } catch (e) {
            console.error(`[AC Test - Stage 2 CRITICAL] Error in tick loop: ${e.message}\\n${e.stack}`);
        }
    }
}, { namespaces: ['ac'] });
