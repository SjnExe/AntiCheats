import { getAllPlayerData, savePlayerData, isNameIdMapDirty, saveNameIdMap } from './playerDataManager.js';
import { world } from '@minecraft/server';
import { getConfig } from './configManager.js';
import { system } from '@minecraft/server';
import { debugLog } from './logger.js';

/**
 * Saves all "dirty" data to world properties.
 * This includes player data flagged with `needsSave` and the name-to-ID map if it has changed.
 * @param {object} [options={}]
 * @param {boolean} [options.log=true] - Whether to log the save event.
 * @returns {boolean} - True if any data was saved, false otherwise.
 */
export function saveAllData(options = {}) {
    const { log = true } = options;
    if (log) {
        debugLog('[DataManager] Starting data sync...');
    }

    let anythingWasSaved = false;

    // Save the player name-to-ID map if it's dirty
    if (isNameIdMapDirty) {
        saveNameIdMap(); // This function will log its own success
        anythingWasSaved = true;
    }

    // Save data for online players whose data is dirty
    const allPlayerData = getAllPlayerData();
    let savedPlayerCount = 0;
    for (const [playerId, playerData] of allPlayerData.entries()) {
        if (playerData.needsSave) {
            savePlayerData(playerId);
            savedPlayerCount++;
        }
    }

    if (savedPlayerCount > 0) {
        anythingWasSaved = true;
        if (log) {
            debugLog(`[DataManager] Saved data for ${savedPlayerCount} modified players.`);
        }
    }

    // Reports are saved immediately by the reportManager, so they are not needed here.


    if (log && anythingWasSaved) {
        debugLog('[DataManager] Data sync complete.');
    } else if (log) {
        debugLog('[DataManager] Data sync finished, no changes to save.');
    }
    return anythingWasSaved;
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
            const wasAnythingSaved = saveAllData({ log: false }); // Don't spam logs for auto-saves
            if (wasAnythingSaved) {
                world.sendMessage('§7§o[Auto-Save] Server data has been saved.§r');
            }
        }, intervalTicks);
        debugLog(`[DataManager] Auto-save enabled. Interval: ${autoSaveIntervalSeconds} seconds.`);
    } else {
        debugLog('[DataManager] Auto-save is disabled.');
    }
}
