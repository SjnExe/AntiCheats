/**
 * @file Implements a check to detect and optionally correct players who are in Creative Mode
 * without proper authorization (e.g., not an admin or owner).
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks if a player is in Creative Mode without authorization.
 * If unauthorized Creative Mode is detected, it flags the player and can optionally
 * switch their gamemode back to a configured default (e.g., survival).
 * This check is typically run periodically for all players.
 *
 * @async
 * @param {mc.Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkAntiGmc(player, pData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies; // Added rankManager and permissionLevels

    // Standardized action profile key
    const actionProfileKey = config.antiGmcActionProfileName ?? 'playerAntigmc'; // Ensure 'playerAntigmc' matches actionProfiles.js

    if (!config.enableAntiGmcCheck || !pData) {
        return;
    }

    if (player.gameMode === mc.GameMode.creative) {
        const playerPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        let isExempt = false;

        // Check if player's permission level is admin or lower (owner is 0, admin is typically 1)
        if (playerPermLevel <= permissionLevels.admin) {
            isExempt = true;
        }

        if (!isExempt) {
            const watchedPrefix = pData.isWatched ? player.nameTag : null;
            let autoSwitchedGameMode = false;
            let targetGamemodeString = (config.antiGmcSwitchToGameMode || 'survival').toLowerCase();
            let targetMcGameMode;

            switch (targetGamemodeString) {
                case 'survival':
                    targetMcGameMode = mc.GameMode.survival;
                    break;
                case 'adventure':
                    targetMcGameMode = mc.GameMode.adventure;
                    break;
                case 'spectator':
                    targetMcGameMode = mc.GameMode.spectator;
                    break;
                default:
                    targetMcGameMode = mc.GameMode.survival; // Fallback to survival
                    targetGamemodeString = 'survival';
                    playerUtils.debugLog(`[AntiGmcCheck] Invalid antiGmcSwitchToGameMode value '${config.antiGmcSwitchToGameMode}'. Defaulting to survival.`, watchedPrefix, dependencies);
            }

            if (config.antiGmcAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    playerUtils.debugLog(`[AntiGmcCheck] Switched ${player.nameTag} from Creative to ${targetGamemodeString}.`, watchedPrefix, dependencies);
                } catch (e) {
                    playerUtils.debugLog(`[AntiGmcCheck] Error switching ${player.nameTag} from Creative: ${e.message}`, watchedPrefix, dependencies);
                }
            }

            const violationDetails = {
                originalGameMode: 'creative',
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode.toString(),
                permissionLevel: playerPermLevel.toString(),
            };

            await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            if (pData.isWatched) {
                if (!autoSwitchedGameMode && config.antiGmcAutoSwitch) {
                    playerUtils.debugLog(`[AntiGmcCheck] Flagged ${player.nameTag} for unauthorized creative. Auto-switch was enabled but might have failed.`, watchedPrefix, dependencies);
                } else if (!config.antiGmcAutoSwitch) {
                    playerUtils.debugLog(`[AntiGmcCheck] Flagged ${player.nameTag} for unauthorized creative. Auto-switch disabled.`, watchedPrefix, dependencies);
                }
            }
        }
    }
}
