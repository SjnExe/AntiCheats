/**
 * @file AntiCheatsBP/scripts/checks/chat/checkSimpleImpersonation.js
 * Implements a check to detect simple impersonation attempts in chat.
 * @version 1.0.1
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
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData
 * @param {CommandDependencies} dependencies Should include config, playerUtils, actionManager, and potentially permissionLevels or rankManager.
 * @returns {Promise<void>}
 */
export async function checkSimpleImpersonation(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    const enableSimpleImpersonationCheck = config.enableSimpleImpersonationCheck ?? false;
    if (!enableSimpleImpersonationCheck) {
        return;
    }
    if (!pData) { // pData might not be used by this specific check's logic
        playerUtils.debugLog("[SimpleImpersonationCheck] pData is null, skipping check (though not strictly needed for this check's core logic).", dependencies, player.nameTag);
        // return;
    }

    const minMessageLength = config.impersonationMinMessageLengthForPatternMatch ?? 10;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    // Resolve permission levels: Access from dependencies.permissionLevels
    const adminPermissionLevelDefault = dependencies.permissionLevels?.admin ?? 1; // Default to 1 if not found in deps
    const exemptPermissionLevel = config.impersonationExemptPermissionLevel ?? adminPermissionLevelDefault;

    const playerPermission = dependencies.rankManager.getPlayerPermissionLevel(player, dependencies);
    if (playerPermission <= exemptPermissionLevel) {
        playerUtils.debugLog(`[SimpleImpersonationCheck] Player ${player.nameTag} (perm: ${playerPermission}) is exempt (threshold: ${exemptPermissionLevel}).`, dependencies, player.nameTag);
        return;
    }

    const serverMessagePatterns = config.impersonationServerMessagePatterns ?? [];
    if (serverMessagePatterns.length === 0) {
        return;
    }

    const actionProfileName = config.impersonationActionProfileName ?? "chatImpersonationAttempt";
    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;

    for (const patternString of serverMessagePatterns) {
        if (typeof patternString !== 'string' || patternString.trim() === '') {
            playerUtils.debugLog("[SimpleImpersonationCheck] Encountered empty or invalid pattern string in config.", dependencies, watchedPlayerName);
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
                playerUtils.debugLog(`[SimpleImpersonationCheck] Flagged ${player.nameTag} for impersonation attempt. Pattern: '${patternString}'. Msg: "${rawMessageContent.substring(0,50)}..."`, watchedPlayerName, dependencies);
                return; // Stop on first match
            }
        } catch (e) {
            playerUtils.debugLog(`[SimpleImpersonationCheck] Invalid regex pattern '${patternString}' in config. Error: ${e.message}`, watchedPlayerName, dependencies);
            console.error(`[SimpleImpersonationCheck] Regex pattern error: ${e.stack || e}`);
        }
    }
}
