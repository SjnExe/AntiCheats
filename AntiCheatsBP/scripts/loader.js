import { system, world } from '@minecraft/server';
import * as dependencies from './core/dependencyManager.js';
import { log, logError } from './modules/utils/playerUtils.js';

try {
    system.beforeEvents.watchdogTerminate.subscribe(data => {
        data.cancel = true;
        log(`Watchdog termination prevented. Reason: ${data.terminateReason}`);
        if (world.getDynamicProperty('ac:initialized')) {
            dependencies.playerUtils.notifyAdmins(`§cWatchdog termination prevented. Reason: ${data.terminateReason}`, dependencies);
        }
    });
} catch (e) {
    logError(`CRITICAL: Failed to subscribe to watchdog event: ${e}`);
}

import './core/initializationManager.js';
import './main.js';

log('Loader script executed.');
