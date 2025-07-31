import { system } from '@minecraft/server';
import * as dependencies from './core/dependencyManager.js';

try {
    system.beforeEvents.watchdogTerminate.subscribe(data => {
        data.cancel = true;
        console.warn(`[AntiCheat] Watchdog termination prevented. Reason: ${data.terminateReason}`);
        dependencies.playerUtils.notifyAdmins(`§cWatchdog termination prevented. Reason: ${data.terminateReason}`, dependencies);
    });
} catch (e) {
    console.error(`[AntiCheat] CRITICAL: Failed to subscribe to watchdog event: ${e}`);
}

import './core/initializationManager.js';
import './main.js';

console.log('[AntiCheat] Loader script executed.');
