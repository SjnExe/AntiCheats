/**
 * @file loader.js
 * @description This is the entry point for the AntiCheats script module.
 *              Its primary role is to set up the watchdog termination handler
 *              and then load the main initialization scripts.
 */

import { system } from '@minecraft/server';
import { log, logError } from './core/startupLogger.js';

try {
    system.beforeEvents.watchdogTerminate.subscribe(data => {
        data.cancel = true;
        log(`Watchdog termination prevented. Reason: ${data.terminateReason}`);
    });
} catch (e) {
    logError('CRITICAL: Failed to subscribe to watchdog event. The addon may not function correctly.', e);
}

// Import the main modules to start the initialization process.
// The order is important: main.js contains functions that initializationManager.js will call.
async function loadCoreModules() {
    try {
        log('Loading core modules...');
        await import('./main.js');
        await import('./core/initializationManager.js');
        log('Core modules loaded into execution context.');
    } catch (e) {
        logError('CRITICAL: Failed to load core modules. The addon will not start.', e);
    }
}

loadCoreModules();
