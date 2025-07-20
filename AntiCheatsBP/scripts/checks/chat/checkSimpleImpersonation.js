/**
 * @file Detects simple impersonation attempts in chat.
 * @module AntiCheatsBP/scripts/checks/chat/checkSimpleImpersonation
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const LOCAL_ELLIPSIS_LENGTH_SIMP_IMP = 3;
const DEBUG_LOG_SIMP_IMP_SNIPPET_LENGTH = 50;

/**
 * Checks a message for simple impersonation patterns.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData The player's anti-cheat data.
 * @param {Dependencies} dependencies Shared command dependencies.
 */
export async function checkSimpleImpersonation(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager, rankManager, permissionLevels } = dependencies;
    const rawMessageContent = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

    const enableCheck = config?.enableSimpleImpersonationCheck ?? false;
    if (!enableCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;
    if (!pData && config?.enableDebugLogging) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] pData is null for ${playerName}. Watched player status might be unavailable for logging.`, watchedPlayerName, dependencies);
    }

    const defaultMinMessageLength = 10;
    const defaultActionProfileKey = 'chatImpersonationAttempt';

    const minMessageLength = config?.impersonationMinMessageLengthForPatternMatch ?? defaultMinMessageLength;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const adminPermissionLevelDefault = typeof permissionLevels?.admin === 'number' ? permissionLevels.admin : 1;
    const exemptPermissionLevel = config?.impersonationExemptPermissionLevel ?? adminPermissionLevelDefault;

    const playerPermission = rankManager?.getPlayerPermissionLevel(player, dependencies);
    if (typeof playerPermission !== 'number') {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] Could not determine permission level for ${playerName}. Assuming not exempt for safety.`, watchedPlayerName, dependencies);
    } else if (playerPermission <= exemptPermissionLevel) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] Player ${playerName} (perm: ${playerPermission}) is exempt (threshold: ${exemptPermissionLevel}).`, watchedPlayerName, dependencies);
        return;
    }

    const serverMessagePatterns = config?.impersonationServerMessagePatterns ?? [];
    if (!Array.isArray(serverMessagePatterns) || serverMessagePatterns.length === 0) {
        playerUtils?.debugLog(`[SimpleImpersonationCheck] No serverMessagePatterns configured. Skipping check for ${playerName}.`, watchedPlayerName, dependencies);
        return;
    }

    const actionProfileKey = config?.impersonationActionProfileName ?? defaultActionProfileKey;

    for (const patternString of serverMessagePatterns) {
        if (typeof patternString !== 'string' || patternString.trim() === '') {
            playerUtils?.debugLog('[SimpleImpersonationCheck] Encountered empty or invalid pattern string in config.', watchedPlayerName, dependencies);
            continue;
        }
        try {
            const regex = new RegExp(patternString, 'i');
            if (regex.test(rawMessageContent)) {
                const messageSnippetLimit = 75; // This is a local const, might be better at top or from config if shared
                const violationDetails = {
                    messageSnippet: rawMessageContent.length > messageSnippetLimit ? `${rawMessageContent.substring(0, messageSnippetLimit - LOCAL_ELLIPSIS_LENGTH_SIMP_IMP) }...` : rawMessageContent,
                    matchedPattern: patternString,
                    playerPermissionLevel: typeof playerPermission === 'number' ? playerPermission.toString() : 'Unknown',
                    exemptPermissionLevelRequired: exemptPermissionLevel.toString(),
                    originalMessage: rawMessageContent,
                };

                // Await the action to ensure it completes before we potentially cancel the message and exit.
                await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);
                playerUtils?.debugLog(`[SimpleImpersonationCheck] Flagged ${playerName} for impersonation attempt. Pattern: '${patternString}'. Msg: '${rawMessageContent.substring(0, DEBUG_LOG_SIMP_IMP_SNIPPET_LENGTH)}...'`, watchedPlayerName, dependencies);

                const profile = dependencies.checkActionProfiles?.[actionProfileKey];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return;
            }
        } catch (e) {
            playerUtils?.debugLog(`[SimpleImpersonationCheck CRITICAL] Invalid regex pattern '${patternString}' in config for ${playerName}. Error: ${e.message}`, watchedPlayerName, dependencies);
            console.error(`[SimpleImpersonationCheck CRITICAL] Regex pattern error for pattern '${patternString}': ${e.stack || e.message || String(e)}`);
            dependencies.logManager?.addLog({
                actionType: 'errorSystemConfig',
                context: 'SimpleImpersonationCheck.regexCompilation',
                details: { error: `Invalid regex: '${patternString}'`, message: e.message },
                errorStack: e.stack,
            }, dependencies);
        }
    }
}
