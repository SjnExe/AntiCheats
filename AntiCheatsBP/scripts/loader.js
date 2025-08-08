import { system, world } from '@minecraft/server';
import * as dependencies from './core/dependencyManager.js';

try {
    system.beforeEvents.watchdogTerminate.subscribe(data => {
        data.cancel = true;
        dependencies.playerUtils.log(`Watchdog termination prevented. Reason: ${data.terminateReason}`);
        if (world.getDynamicProperty('ac:initialized')) {
            dependencies.playerUtils.notifyAdmins(`§cWatchdog termination prevented. Reason: ${data.terminateReason}`, dependencies);
        }
    });
} catch (e) {
    dependencies.playerUtils.logError(`CRITICAL: Failed to subscribe to watchdog event: ${e}`);
}

import './core/initializationManager.js';
import './main.js';

dependencies.playerUtils.log('Loader script executed.');
