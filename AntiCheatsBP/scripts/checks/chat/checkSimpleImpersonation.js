/**
 * @file AntiCheatsBP/scripts/checks/chat/checkSimpleImpersonation.js
 * Implements a check to detect simple impersonation attempts in chat.
 * @version 1.0.0
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../core/rankManager.js').PermissionLevel} PermissionLevel // If using named import for permissionLevels
 */
/**
 * Checks a message for simple impersonation patterns (e.g., mimicking server announcements).
 * @param {import('@minecraft/server').Player} player
 * @param {PlayerAntiCheatData} pData
 * @param {string} rawMessageContent The raw message from the chat event.
 * @param {CommandDependencies & {permissionLevels?: any, rankManager?: {permissionLevels: any}}} dependencies Should include config, playerUtils, actionManager.
 *                                                                                                   It might also include permissionLevels directly or via a rankManager object.
 * @returns {Promise<void>}
 */
export async function checkSimpleImpersonation(player, pData, rawMessageContent, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;

    const enableSimpleImpersonationCheck = config.enableSimpleImpersonationCheck ?? false;
    if (!enableSimpleImpersonationCheck) {
        return;
    }
    if (!pData) {
        playerUtils.debugLog?.("SimpleImpersonation: pData is null, skipping check.", player.nameTag);
        return;
    }

    const minMessageLength = config.impersonationMinMessageLengthForPatternMatch ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }
    // Resolve permission levels: Prefer from dependencies.rankManager, then dependencies.permissionLevels, then default.
    // This assumes rankManager is passed in dependencies if it contains permissionLevels.
    const adminPermissionLevelDefault = 1; // A common default for admin level if not found.
    const exemptPermissionLevel = config.impersonationExemptPermissionLevel ??
                                  (dependencies.rankManager?.permissionLevels?.admin ??
                                  (dependencies.permissionLevels?.admin ?? adminPermissionLevelDefault));
    const playerPermission = playerUtils.getPlayerPermissionLevel(player);
    if (playerPermission <= exemptPermissionLevel) {
        playerUtils.debugLog?.(\`SimpleImpersonation: Player \${player.nameTag} (perm: \${playerPermission}) is exempt (threshold: \${exemptPermissionLevel}).\`, player.nameTag);
        return; // Player is exempt
    }
    const serverMessagePatterns = config.impersonationServerMessagePatterns ?? [];
    if (serverMessagePatterns.length === 0) {
        return;
    }
    const actionProfileName = config.impersonationActionProfileName ?? "chatImpersonationAttempt";
    const watchedPlayerName = pData.isWatched ? player.nameTag : null;
    for (const patternString of serverMessagePatterns) {
        if (typeof patternString !== 'string' || patternString.trim() === '') {
            playerUtils.debugLog?.("SimpleImpersonation: Encountered empty or invalid pattern string in config.", watchedPlayerName);
            continue;
        }
        try {
            const regex = new RegExp(patternString, 'i'); // Case-insensitive
            if (regex.test(rawMessageContent)) {
                const violationDetails = {
                    messageSnippet: rawMessageContent.substring(0, 75),
                    matchedPattern: patternString,
                    playerPermissionLevel: playerPermission.toString(),
                    exemptPermissionLevelRequired: exemptPermissionLevel.toString()
                };

                await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                playerUtils.debugLog?.(\`SimpleImpersonation: Flagged \${player.nameTag} for impersonation attempt. Pattern: '\${patternString}'. Msg: "\${rawMessageContent.substring(0,50)}..."\`, watchedPlayerName);
                return; // Stop on first match
            }
        } catch (e) {
            playerUtils.debugLog?.(\`SimpleImpersonation: Invalid regex pattern '\${patternString}' in config. Error: \${e.message}\`, watchedPlayerName);
            // Continue to next pattern
        }
    }
}
