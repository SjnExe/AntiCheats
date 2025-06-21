/**
 * @file AntiCheatsBP/scripts/checks/player/antiGMCCheck.js
 * Implements a check to detect and optionally correct players who are in Creative Mode
 * without proper authorization (e.g., not an admin or owner).
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
// getPlayerPermissionLevel will be accessed via dependencies.rankManager.getPlayerPermissionLevel
// permissionLevels will be accessed via dependencies.permissionLevels

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
        const playerPermLevel = dependencies.rankManager.getPlayerPermissionLevel(player, dependencies);

        let isExempt = false;
        if (playerPermLevel <= dependencies.permissionLevels.admin) {
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
                    playerUtils.debugLog(`[AntiGMCCheck] Invalid antiGMCSwitchToGameMode value "${config.antiGMCSwitchToGameMode}". Defaulting to survival.`, watchedPrefix, dependencies);
            }

            if (config.antiGMCAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    playerUtils.debugLog(`[AntiGMCCheck] Switched ${player.nameTag} from Creative to ${targetGamemodeString}.`, watchedPrefix, dependencies);
                } catch (e) {
                    playerUtils.debugLog(`[AntiGMCCheck] Error switching ${player.nameTag} from Creative: ${e.message}`, watchedPrefix, dependencies);
                    console.error(`[AntiGMCCheck] Error switching ${player.nameTag} from Creative: ${e.stack || e}`);
                }
            }

            const violationDetails = {
                originalGameMode: "creative",
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode.toString(),
                permissionLevel: playerPermLevel.toString()
            };
            const actionProfileName = config.antiGmcActionProfileName ?? "playerAntiGMC";
            await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);

            if (pData.isWatched) { // playerUtils.debugLog is implicitly available
                if (!autoSwitchedGameMode && config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`[AntiGMCCheck] Flagged ${player.nameTag} for unauthorized creative. Auto-switch was enabled but might have failed.`, watchedPrefix, dependencies);
                } else if (!config.antiGMCAutoSwitch) {
                    playerUtils.debugLog(`[AntiGMCCheck] Flagged ${player.nameTag} for unauthorized creative. Auto-switch disabled.`, watchedPrefix, dependencies);
                }
            }
        }
    }
}
