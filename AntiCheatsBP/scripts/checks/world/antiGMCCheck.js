import * as mc from '@minecraft/server';
import { getPlayerPermissionLevel } from '../../utils/playerUtils.js'; // Corrected import
import { permissionLevels } from '../../core/rankManager.js';

/**
 * Checks if a player is in Creative Mode without authorization.
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkAntiGMC(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableAntiGMCCheck) return;

    if (player.gameMode === mc.GameMode.creative) {
        const playerPermLevel = getPlayerPermissionLevel(player); // Corrected call, config not needed here as playerUtils.isAdmin/isOwner handle it

        let isExempt = false;
        if (playerPermLevel <= permissionLevels.admin) { // Check if admin or owner (owner is 0, admin is 1)
            isExempt = true;
        }

        if (!isExempt) {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            let autoSwitchedGameMode = false;
            let targetGamemodeString = config.antiGMCSwitchToGameMode.toLowerCase();
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
                    targetGamemodeString = "survival"; // Correct for logging
                    if (playerUtils.debugLog) playerUtils.debugLog(\`AntiGMC: Invalid antiGMCSwitchToGameMode value '\${config.antiGMCSwitchToGameMode}'. Defaulting to survival.\`, watchedPrefix);
            }

            if (config.antiGMCAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    if (playerUtils.debugLog) playerUtils.debugLog(\`AntiGMC: Switched \${player.nameTag} from Creative to \${targetGamemodeString}.\`, watchedPrefix);
                } catch (e) {
                    if (playerUtils.debugLog) playerUtils.debugLog(\`AntiGMC: Error switching \${player.nameTag} from Creative: \${e}\`, watchedPrefix);
                }
            }

            const dependencies = { config, playerDataManager, playerUtils, logManager };
            const violationDetails = {
                originalGameMode: "creative",
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode,
                permissionLevel: playerPermLevel
            };
            await executeCheckAction(player, "player_antigmc", violationDetails, dependencies);

            if (pData.isWatched && playerUtils.debugLog && !autoSwitchedGameMode && config.antiGMCAutoSwitch) {
                 playerUtils.debugLog(\`AntiGMC: Flagged \${player.nameTag} for unauthorized creative. Auto-switch was enabled but might have failed if no error was caught explicitly.\`, watchedPrefix);
            } else if (pData.isWatched && playerUtils.debugLog && !config.antiGMCAutoSwitch) {
                 playerUtils.debugLog(\`AntiGMC: Flagged \${player.nameTag} for unauthorized creative. Auto-switch disabled.\`, watchedPrefix);
            }
        }
    }
}
