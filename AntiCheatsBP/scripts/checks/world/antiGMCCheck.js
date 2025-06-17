/**
 * @file AntiCheatsBP/scripts/checks/world/antiGMCCheck.js
 * Implements a check to detect and optionally correct players who are in Creative Mode
 * without proper authorization (e.g., not an admin or owner).
 * @version 1.1.0
 */
import * as mc from '@minecraft/server';
import { getPlayerPermissionLevel } from '../../utils/playerUtils.js'; // This is fine as it's a direct utility
import { permissionLevels } from '../../core/rankManager.js'; // Used for comparison

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks if a player is in Creative Mode without authorization.
 * If unauthorized Creative Mode is detected, it flags the player and can optionally
 * switch their gamemode back to a configured default (e.g., survival).
 *
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies like config, playerUtils, actionManager, etc.
 * @returns {Promise<void>}
 */
export async function checkAntiGmc(
    player,
    pData,
    dependencies
) {
    const { config, playerUtils, playerDataManager, logManager, actionManager } = dependencies;

    if (!config.enableAntiGMCCheck || !pData) {
        return;
    }

    if (player.gameMode === mc.GameMode.creative) {
        // getPlayerPermissionLevel itself uses editableConfigValues, so it doesn't need config passed here.
        const playerPermLevel = getPlayerPermissionLevel(player);

        let isExempt = false;
        if (playerPermLevel <= permissionLevels.admin) { // permissionLevels imported directly
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
                    targetMcGameMode = mc.GameMode.survival;
                    targetGamemodeString = "survival";
                    playerUtils.debugLog?.(\`AntiGMC: Invalid antiGMCSwitchToGameMode value "\${config.antiGMCSwitchToGameMode}". Defaulting to survival.\`, watchedPrefix);
            }

            if (config.antiGMCAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    playerUtils.debugLog?.(\`AntiGMC: Switched \${player.nameTag} from Creative to \${targetGamemodeString}.\`, watchedPrefix);
                } catch (e) {
                    playerUtils.debugLog?.(\`AntiGMC: Error switching \${player.nameTag} from Creative: \${e}\`, watchedPrefix);
                }
            }

            const violationDetails = {
                originalGameMode: "creative",
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode.toString(),
                permissionLevel: playerPermLevel.toString()
            };
            const actionProfileName = config.antiGmcActionProfileName ?? "playerAntiGMC";
            // Pass the main dependencies object to executeCheckAction
            await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (pData.isWatched && playerUtils.debugLog) {
                if (!autoSwitchedGameMode && config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`AntiGMC: Flagged ${player.nameTag} for unauthorized creative. Auto-switch was enabled but might have failed.`, watchedPrefix);
                } else if (!config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`AntiGMC: Flagged ${player.nameTag} for unauthorized creative. Auto-switch disabled.`, watchedPrefix);
                }
            }
        }
    }
}
