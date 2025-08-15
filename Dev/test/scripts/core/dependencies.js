// A minimal, mocked dependency container for the test addon.

import * as commandManager from './commandManager.js';

export const dependencies = {
    config: {
        // We need a prefix for the command test later
        prefix: '!',
        development: {
            enablePerformanceProfiling: false
        },
        commandSettings: {
            help: { enabled: true }
        }
    },
    isInitialized: false,
    commandManager,
    // Add other mocked managers as empty objects if needed to prevent crashes
    logManager: {
        addLog: () => {}
    },
    playerUtils: {
        getString: () => "mock string",
        warnPlayer: () => {},
        debugLog: () => {},
        playSoundForEvent: () => {},
    },
    rankManager: {
        getPlayerPermissionLevel: () => 0 // 0 is usually admin/op
    },
    aliasToCommandMap: new Map(),
};

export function initializeCoreDependencies() {
    // This function will be expanded in later stages.
    // For now, it just sets the initialized flag.
    dependencies.isInitialized = true;
    console.log('[AC Test - Dependencies] Core dependencies marked as initialized.');
}
