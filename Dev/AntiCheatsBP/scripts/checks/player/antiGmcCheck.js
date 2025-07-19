/**
 * @file Implements a check to detect and optionally correct players who are in Creative Mode
 * without proper authorization (e.g., not an admin or owner).
 *
 * Its accuracy is critically dependent on the `rankManager.getPlayerPermissionLevel` function
 * returning correct permission levels for players and the `permissionLevels` object (from `dependencies`)
 * being accurately configured to reflect the server's intended permission hierarchy.
 * Misconfiguration in these areas can lead to false positives (incorrectly flagging
 * authorized creative mode) or false negatives (failing to detect unauthorized creative mode).
 * @module AntiCheatsBP/scripts/checks/player/antiGmcCheck
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks if a player is in Creative Mode without authorization.
 * If unauthorized Creative Mode is detected, it flags the player and can optionally
 * switch their gamemode back to a configured default (e.g., survival).
 * This check is typically run periodically for all players (e.g., via main tick loop).
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance to check.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - Object containing necessary dependencies.
 * @returns {Promise<void>}
 */
export async function checkAntiGmc(player, pData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies;
    const playerName = player?.name ?? 'UnknownPlayer';
    const watchedPlayerName = pData?.isWatched ? playerName : null; // Define here

    if (!config?.enableAntiGmcCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[AntiGmcCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const actionProfileKey = config?.antiGmcActionProfileName ?? 'playerAntiGmc';


    if (player.gameMode === mc.GameMode.creative) {
        const playerPermLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);
        const adminPermLevel = permissionLevels?.admin ?? 1;

        if (typeof playerPermLevel === 'number' && playerPermLevel > adminPermLevel) {
            // watchedPlayerName is now defined in the outer scope
            let autoSwitchedGameMode = false;
            let targetGamemodeString = (config?.antiGmcSwitchToGameMode || 'survival').toLowerCase();
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
                playerUtils?.debugLog(`[AntiGmcCheck WARNING] Invalid antiGmcSwitchToGameMode value '${config?.antiGmcSwitchToGameMode}'. Defaulting to survival for ${playerName}.`, watchedPlayerName, dependencies);
                targetMcGameMode = mc.GameMode.survival;
                targetGamemodeString = 'survival';
                break;
            }

            if (config?.antiGmcAutoSwitch) {
                try {
                    player.setGameMode(targetMcGameMode);
                    autoSwitchedGameMode = true;
                    playerUtils?.debugLog(`[AntiGmcCheck] Switched ${playerName} from Creative to ${targetGamemodeString}.`, watchedPlayerName, dependencies);
                } catch (e) {
                    playerUtils?.debugLog(`[AntiGmcCheck ERROR] Error switching ${playerName} from Creative: ${e.message}`, watchedPlayerName, dependencies);
                    dependencies.logManager?.addLog({
                        actionType: 'errorAntiGmcSwitchMode',
                        context: 'AntiGmcCheck.setGameMode',
                        targetName: playerName,
                        details: { targetMode: targetGamemodeString, error: e.message },
                        errorStack: e.stack,
                    }, dependencies);
                }
            }

            const violationDetails = {
                originalGameMode: 'creative',
                switchToMode: targetGamemodeString,
                autoSwitched: autoSwitchedGameMode.toString(),
                permissionLevel: playerPermLevel.toString(),
                adminPermissionThreshold: adminPermLevel.toString(),
            };

            await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

            if (pData.isWatched) {
                if (!autoSwitchedGameMode && config?.antiGmcAutoSwitch) {
                    playerUtils?.debugLog(`[AntiGmcCheck] Flagged ${playerName} for unauthorized creative. Auto-switch was enabled but might have failed.`, watchedPlayerName, dependencies);
                } else if (!config?.antiGmcAutoSwitch) {
                    playerUtils?.debugLog(`[AntiGmcCheck] Flagged ${playerName} for unauthorized creative. Auto-switch disabled in config.`, watchedPlayerName, dependencies);
                }
            }
        } else if (pData.isWatched && typeof playerPermLevel !== 'number') {
            playerUtils?.debugLog(`[AntiGmcCheck] Could not determine permission level for ${playerName} (in Creative). Assuming authorized for now.`, watchedPlayerName, dependencies);
        } else if (pData.isWatched) {
            playerUtils?.debugLog(`[AntiGmcCheck] Player ${playerName} is in Creative mode with sufficient permissions (Level: ${playerPermLevel}, Required: <=${adminPermLevel}). No action.`, watchedPlayerName, dependencies);
        }
    }
}
