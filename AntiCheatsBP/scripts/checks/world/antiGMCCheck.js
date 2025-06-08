/**
 * @file AntiCheatsBP/scripts/checks/world/antiGMCCheck.js
 * Implements a check to detect and optionally correct players who are in Creative Mode
 * without proper authorization (e.g., not an admin or owner).
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';
import { getPlayerPermissionLevel } from '../../utils/playerUtils.js'; // Corrected import
import { permissionLevels } from '../../core/rankManager.js';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks if a player is in Creative Mode without authorization.
 * If unauthorized Creative Mode is detected, it flags the player and can optionally
 * switch their gamemode back to a configured default (e.g., survival).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object, containing settings like
 *                          `enableAntiGMCCheck`, `antiGMCSwitchToGameMode`, and `antiGMCAutoSwitch`.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick (not directly used in this check's core logic).
 * @returns {Promise<void>}
 */
export async function checkAntiGmc(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick // Not directly used by this check's core logic
) {
    if (!config.enableAntiGMCCheck || !pData) { // Added null check for pData
        return;
    }

    if (player.gameMode === mc.GameMode.creative) {
        const playerPermLevel = getPlayerPermissionLevel(player); // Function using rankManager

        let isExempt = false;
        // Owners and Admins are exempt from Anti-GMC checks.
        if (playerPermLevel <= permissionLevels.admin) {
            isExempt = true;
        }

        if (!isExempt) {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            let autoSwitchedGameMode = false;
            let targetGamemodeString = (config.antiGMCSwitchToGameMode ?? "survival").toLowerCase();
            let targetMcGameMode;

            switch (targetGamemodeString) {
                case "survival":
                    targetMcGameMode = mc.GameMode.survival;
                    break;
                case "adventure":
                    targetMcGameMode = mc.GameMode.adventure;
                    break;
                case "spectator":
                    targetMcGameMode = mc.GameMode.spectator;
                    break;
                default:
                    targetMcGameMode = mc.GameMode.survival; // Default to survival if config is invalid
                    targetGamemodeString = "survival";
                    playerUtils.debugLog?.(`AntiGMC: Invalid antiGMCSwitchToGameMode value "${config.antiGMCSwitchToGameMode}". Defaulting to survival.`, watchedPrefix);
            }

            if (config.antiGMCAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    playerUtils.debugLog?.(`AntiGMC: Switched ${player.nameTag} from Creative to ${targetGamemodeString}.`, watchedPrefix);
                } catch (e) {
                    playerUtils.debugLog?.(`AntiGMC: Error switching ${player.nameTag} from Creative: ${e}`, watchedPrefix);
                }
            }

            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                originalGameMode: "creative",
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode.toString(), // Stringify boolean for details
                permissionLevel: playerPermLevel.toString()   // Stringify number for details
            };
            const actionProfileName = config.antiGmcActionProfileName ?? "player_antigmc";
            await executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (pData.isWatched && playerUtils.debugLog) {
                if (!autoSwitchedGameMode && config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`AntiGMC: Flagged ${player.nameTag} for unauthorized creative. Auto-switch was enabled but might have failed.`, watchedPrefix);
                } else if (!config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`AntiGMC: Flagged ${player.nameTag} for unauthorized creative. Auto-switch disabled.`, watchedPrefix);
                }
            }
        }
    }
    // This check doesn't modify pData fields that need saving unless an action profile does so.
}
