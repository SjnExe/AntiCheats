/**
 * @file loader.js
 * @description This is the entry point for the AntiCheats script module.
 *              It waits for the server to be ready and then kicks off the main initialization process.
 */

import * as mc from '@minecraft/server';
import { log, logError } from './core/startupLogger.js';

// Use system.run to ensure that the server is fully initialized before we start loading our modules.
// This helps prevent race conditions and ensures all APIs are available.
mc.system.run(() => {
    try {
        log('Server initialized, loading AntiCheat modules...');
        // The initializationManager is responsible for setting up all dependencies,
        // subscribing to events, and starting the main tick loops.
        import('./core/initializationManager.js');
    } catch (e) {
        logError('CRITICAL: Failed to load core initializationManager. The addon will not start.', e);
    }
});
