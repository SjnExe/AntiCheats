import * as mc from '@minecraft/server';
import * as playerDataManager from '../../../core/playerDataManager.js';
import * as playerUtils from '../../../utils/playerUtils.js'; // For debugLog if pData.isWatched
import * as config from '../../../config.js';

/**
 * @typedef {import('../../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if the player is attacking while in a state that should prevent it (e.g., sleeping).
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 */
export function checkAttackWhileSleeping(player, pData, config) {
    if (!config.enableStateConflictCheck) return; // Renamed

    if (player.isSleeping) {
        playerDataManager.addFlag(
            player,
            "attackWhileSleeping",
            config.flagReasonAttackWhileSleeping, // Renamed
            "Player attacked while isSleeping was true."
        );
        if (pData.isWatched) {
            playerUtils.debugLog(`Flagged ${player.nameTag} for Attack While Sleeping.`, player.nameTag);
        }
    }
}

// Future state conflict checks (e.g., attack while using item) could be added here.
// export function checkAttackWhileUsingItem(player, pData, config) { ... }
