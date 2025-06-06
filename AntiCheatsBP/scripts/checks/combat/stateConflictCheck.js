import * as mc from '@minecraft/server';
// Removed direct imports for playerDataManager, playerUtils, config

/**
 * @typedef {import('../../core/playerDataManager.js').PlayerAntiCheatData} PlayerAntiCheatData
 */

/**
 * Checks if the player is attacking while in a state that should prevent it (e.g., sleeping).
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkAttackWhileSleeping(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableStateConflictCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;

    if (player.isSleeping) {
        const violationDetails = {
            state: "isSleeping",
            // The original call was from handleEntityHurt(attacker, attackerPData,...),
            // so eventData for the specific hurt entity isn't directly available here unless passed.
            // For simplicity, we'll just note the state. If target info is crucial,
            // it would need to be passed from handleEntityHurt to this function.
            targetEntity: pData.lastAttackedEntityId || "unknown" // Assuming pData might store last attacked entity ID
        };
        const dependencies = { config, playerDataManager, playerUtils, logManager };
        await executeCheckAction(player, "combat_attack_while_sleeping", violationDetails, dependencies);

        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`Flagged ${player.nameTag} for Attack While Sleeping.`, watchedPrefix);
        }
    }
}

// Future state conflict checks (e.g., attack while using item) could be added here.
// export function checkAttackWhileUsingItem(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) { ... }
