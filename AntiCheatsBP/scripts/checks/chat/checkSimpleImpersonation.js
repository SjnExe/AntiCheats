/**
 * @file Implements a check to detect simple impersonation attempts in chat,
 * such as mimicking server announcements.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a message for simple impersonation patterns (e.g., mimicking server announcements).
 * Exempts players with a permission level at or below `config.impersonationExemptPermissionLevel`.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data.
 * @param {PlayerAntiCheatData} pData - Player's anti-cheat data (used for watched status).
 * @param {CommandDependencies} dependencies - Should include config, playerUtils, actionManager, rankManager, and permissionLevels.
 * @returns {Promise<void>}
 */
export async function checkSimpleImpersonation(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies;
    const rawMessageContent = eventData.message;

    const enableCheck = config.enableSimpleImpersonationCheck ?? false;
    if (!enableCheck) {
        return;
    }

    if (!pData && config.enableDebugLogging) { // Log only if debug is on and pData is missing
        playerUtils.debugLog('[SimpleImpersonationCheck] pData is null. Watched player status might be unavailable for logging.', player.nameTag, dependencies);
    }

    const minMessageLength = config.impersonationMinMessageLengthForPatternMatch ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return; // Message too short for pattern matching
    }

    const adminPermissionLevelDefault = permissionLevels?.admin ?? 1; // Use permissionLevels from dependencies
    const exemptPermissionLevel = config.impersonationExemptPermissionLevel ?? adminPermissionLevelDefault;

    const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermission <= exemptPermissionLevel) {
        playerUtils.debugLog(`[SimpleImpersonationCheck] Player ${player.nameTag} (perm: ${playerPermission}) is exempt (threshold: ${exemptPermissionLevel}).`, player.nameTag, dependencies);
        return;
    }

    const serverMessagePatterns = config.impersonationServerMessagePatterns ?? [];
    if (serverMessagePatterns.length === 0) {
        playerUtils.debugLog('[SimpleImpersonationCheck] No serverMessagePatterns configured. Skipping.', player.nameTag, dependencies);
        return;
    }

    const actionProfileKey = config.impersonationActionProfileName || 'chatImpersonationAttempt'; // Standardized key
    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;

    for (const patternString of serverMessagePatterns) {
        if (typeof patternString !== 'string' || patternString.trim() === '') {
            playerUtils.debugLog('[SimpleImpersonationCheck] Encountered empty or invalid pattern string in config.', watchedPlayerName, dependencies);
            continue;
        }
        try {
            const regex = new RegExp(patternString, 'i'); // Case-insensitive matching
            if (regex.test(rawMessageContent)) {
                const violationDetails = {
                    messageSnippet: rawMessageContent.length > 75 ? rawMessageContent.substring(0, 72) + '...' : rawMessageContent,
                    matchedPattern: patternString,
                    playerPermissionLevel: playerPermission.toString(),
                    exemptPermissionLevelRequired: exemptPermissionLevel.toString(),
                };

                await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
                playerUtils.debugLog(`[SimpleImpersonationCheck] Flagged ${player.nameTag} for impersonation attempt. Pattern: '${patternString}'. Msg: '${rawMessageContent.substring(0, 50)}...'`, watchedPlayerName, dependencies);

                if (config.checkActionProfiles[actionProfileKey]?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Stop after first match
            }
        } catch (e) {
            playerUtils.debugLog(`[SimpleImpersonationCheck] Invalid regex pattern '${patternString}' in config. Error: ${e.message}`, watchedPlayerName, dependencies);
            console.error(`[SimpleImpersonationCheck] Regex pattern error for pattern '${patternString}': ${e.stack || e}`);
        }
    }
}
