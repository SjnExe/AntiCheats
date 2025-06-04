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
    // This specific check uses ENABLE_STATE_CONFLICT_CHECK,
    // but more specific toggles could be added if needed for different state conflicts.
    if (!config.ENABLE_STATE_CONFLICT_CHECK) return;

    if (player.isSleeping) {
        playerDataManager.addFlag(
            player,
            "attackWhileSleeping", // New flag type
            config.FLAG_REASON_ATTACK_WHILE_SLEEPING,
            // config.FLAG_INCREMENT_ATTACK_SLEEP, // Assuming addFlag handles increment or uses a default
            "Player attacked while isSleeping was true."
        );
        if (pData.isWatched) {
            playerUtils.debugLog(`Flagged ${player.nameTag} for Attack While Sleeping.`, player.nameTag);
        }
    }
}

// Future state conflict checks (e.g., attack while using item) could be added here.
// export function checkAttackWhileUsingItem(player, pData, config) { ... }
