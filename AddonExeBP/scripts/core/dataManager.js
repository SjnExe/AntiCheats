import { savePlayerData, getAllPlayerData } from './playerDataManager.js';
import { saveReports } from './reportManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { system } from '@minecraft/server';
import { debugLog } from './logger.js';

/**
 * Saves all volatile data to world properties.
 * This includes all online player data and all reports.
 * @param {object} [options={}]
 * @param {boolean} [options.log=true] - Whether to log the save event.
 */
export function saveAllData(options = {}) {
    const { log = true } = options;
    if (log) {
        debugLog('[DataManager] Starting full data save...');
    }

    // Save all online players' data
    const allPlayerData = getAllPlayerData();
    let savedPlayerCount = 0;
    for (const playerId of allPlayerData.keys()) {
        savePlayerData(playerId);
        savedPlayerCount++;
    }
    if (log) {
        debugLog(`[DataManager] Saved data for ${savedPlayerCount} online players.`);
    }

    // Save all reports
    saveReports({ force: true }); // Force save, ignoring the needsSave flag for manual/auto saves.

    if (log) {
        debugLog('[DataManager] Full data save complete.');
    }
}

/**
 * Initializes the data manager, including setting up the auto-saver.
 */
export function initializeDataManager() {
    const config = getConfig();
    const autoSaveIntervalSeconds = config.data?.autoSaveIntervalSeconds ?? 300;

    if (autoSaveIntervalSeconds > 0) {
        const intervalTicks = autoSaveIntervalSeconds * 20; // 20 ticks/sec
        system.runInterval(() => {
            debugLog('[DataManager] Auto-save triggered by interval.');
            saveAllData({ log: false }); // Don't spam logs for auto-saves
            world.sendMessage('§7§o[Auto-Save] All server data has been saved.§r');
        }, intervalTicks);
        debugLog(`[DataManager] Auto-save enabled. Interval: ${autoSaveIntervalSeconds} seconds.`);
    } else {
        debugLog('[DataManager] Auto-save is disabled.');
    }
}
