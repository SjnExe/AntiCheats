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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const enableCheck = config?.enableSimpleImpersonationCheck ?? false;
    if (!enableCheck) {
        return;
    }

    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, playerName, dependencies);
    }

    const DEFAULT_MIN_MESSAGE_LENGTH = 10;
    const DEFAULT_ACTION_PROFILE_KEY = 'chatImpersonationAttempt';

    const minMessageLength = config?.impersonationMinMessageLengthForPatternMatch ?? DEFAULT_MIN_MESSAGE_LENGTH;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    // Use permissionLevels from dependencies, with a fallback if it's not fully defined.
    const adminPermissionLevelDefault = permissionLevels?.admin ?? 1;
    const exemptPermissionLevel = config?.impersonationExemptPermissionLevel ?? adminPermissionLevelDefault;

    const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
    // If playerPermission is undefined (e.g. rankManager failed or player not found), treat as highest (most restricted) or handle error
    if (typeof playerPermission !== 'number') {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] Could not determine permission level for ${playerName}. Assuming not exempt.`, playerName, dependencies);
        // Depending on policy, might want to let check proceed or block. For now, proceed.
    } else if (playerPermission <= exemptPermissionLevel) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] Player ${playerName} (perm: ${playerPermission}) is exempt (threshold: ${exemptPermissionLevel}).`, playerName, dependencies);
        return;
    }

    const serverMessagePatterns = config?.impersonationServerMessagePatterns ?? [];
    if (serverMessagePatterns.length === 0) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] No serverMessagePatterns configured for ${playerName}. Skipping.`, playerName, dependencies);
        return;
    }

    // Ensure actionProfileKey is camelCase
    const actionProfileKey = config?.impersonationActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? DEFAULT_ACTION_PROFILE_KEY;
    const watchedPlayerName = pData?.isWatched ? playerName : null;

    for (const patternString of serverMessagePatterns) {
        if (typeof patternString !== 'string' || patternString.trim() === '') {
            playerUtils?.debugLog('[SimpleImpersonationCheck] Encountered empty or invalid pattern string in config.', watchedPlayerName, dependencies);
            continue;
        }
        try {
            const regex = new RegExp(patternString, 'i');
            if (regex.test(rawMessageContent)) {
                const violationDetails = {
                    messageSnippet: rawMessageContent.length > 75 ? rawMessageContent.substring(0, 72) + '...' : rawMessageContent,
                    matchedPattern: patternString,
                    playerPermissionLevel: typeof playerPermission === 'number' ? playerPermission.toString() : 'Unknown',
                    exemptPermissionLevelRequired: exemptPermissionLevel.toString(),
                };

                await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SimpleImpersonationCheck] Flagged ${playerName} for impersonation attempt. Pattern: '${patternString}'. Msg: '${rawMessageContent.substring(0, 50)}...'`, watchedPlayerName, dependencies);

                const profile = config?.checkActionProfiles?.[actionProfileKey];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Stop after first match
            }
        } catch (e) {
            playerUtils?.debugLog(`[SimpleImpersonationCheck] Invalid regex pattern '${patternString}' in config for ${playerName}. Error: ${e.message}`, watchedPlayerName, dependencies);
            console.error(`[SimpleImpersonationCheck] Regex pattern error for pattern '${patternString}': ${e.stack || e.message || String(e)}`);
        }
    }
}
