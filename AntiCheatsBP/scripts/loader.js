import { system, world } from '@minecraft/server';
import { logError } from './utils/playerUtils.js';

try {
    system.events.beforeWatchdogTerminate.subscribe(data => {
        console.warn(`[AntiCheat] Watchdog termination imminent. Reason: ${data.cancelationReason}`);
    });
} catch (e) {
    console.error(`[AntiCheat] CRITICAL: Failed to subscribe to watchdog event: ${e}`);
}

import './core/initializationManager.js';
import './main.js';

console.log('[AntiCheat] Loader script executed.');
