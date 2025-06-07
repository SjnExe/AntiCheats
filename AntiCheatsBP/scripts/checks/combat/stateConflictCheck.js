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

/**
 * Checks if the player is attacking while in a state that should prevent it (e.g., using an item, charging a bow, using a shield).
 * @param {mc.Player} player The player instance to check.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 */
export async function checkAttackWhileUsingItem(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction) {
    if (!config.enableStateConflictCheck) return;
    const watchedPrefix = pData.isWatched ? player.nameTag : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    if (pData.isUsingConsumable) {
        const violationDetails = {
            state: "isUsingConsumable",
            itemUsed: "consumable",
            // Consider adding itemStack.typeId if readily available or stored in pData from item use event
        };
        await executeCheckAction(player, "combat_attack_while_consuming", violationDetails, dependencies);
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`StateConflict: Flagged ${player.nameTag} for Attack While Consuming.`, watchedPrefix);
        }
    }

    if (pData.isChargingBow) {
        const violationDetails = {
            state: "isChargingBow",
            itemUsed: "bow",
        };
        await executeCheckAction(player, "combat_attack_while_bow_charging", violationDetails, dependencies);
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`StateConflict: Flagged ${player.nameTag} for Attack While Charging Bow.`, watchedPrefix);
        }
    }

    if (pData.isUsingShield) {
        const violationDetails = {
            state: "isUsingShield",
            itemUsed: "shield",
        };
        await executeCheckAction(player, "combat_attack_while_shielding", violationDetails, dependencies);
        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(`StateConflict: Flagged ${player.nameTag} for Attack While Shielding.`, watchedPrefix);
        }
    }
}
