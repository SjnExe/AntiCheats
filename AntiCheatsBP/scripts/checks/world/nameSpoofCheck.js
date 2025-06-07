/**
 * @file AntiCheatsBP/scripts/checks/world/nameSpoofCheck.js
 * Implements a check to detect player name spoofing attempts, including names that are too long,
 * contain disallowed characters, or are changed too rapidly.
 * Relies on `pData` fields like `lastKnownNameTag` and `lastNameTagChangeTick`.
 * @version 1.0.1
 */
import * as mc from '@minecraft/server';

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').PlayerUtils} PlayerUtils
 * @typedef {import('../../types.js').PlayerDataManager} PlayerDataManager
 * @typedef {import('../../types.js').LogManager} LogManager
 * @typedef {import('../../types.js').ExecuteCheckAction} ExecuteCheckAction
 */

/**
 * Checks player's nameTag for spoofing attempts (length, disallowed characters, rapid changes).
 * Updates `pData.lastKnownNameTag` and `pData.lastNameTagChangeTick` if a name change is detected.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Config} config - The server configuration object.
 * @param {PlayerUtils} playerUtils - Utility functions for player interactions.
 * @param {PlayerDataManager} playerDataManager - Manager for player data.
 * @param {LogManager} logManager - Manager for logging.
 * @param {ExecuteCheckAction} executeCheckAction - Function to execute defined actions for a check.
 * @param {number} currentTick - The current game tick.
 * @returns {Promise<void>}
 */
export async function checkNameSpoof(
    player,
    pData,
    config,
    playerUtils,
    playerDataManager,
    logManager,
    executeCheckAction,
    currentTick
) {
    if (!config.enableNameSpoofCheck || !pData) { // Added null check for pData
        return;
    }

    const currentNameTag = player.nameTag;
    // For watched prefix, use actual player.name as nameTag might be the spoofed one
    const watchedPrefix = pData.isWatched ? player.name : null;
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    let flaggedReason = null;
    let previousNameTagForLog = pData.lastKnownNameTag; // Capture before potential update if change occurs

    // 1. Length Check
    const maxLength = config.nameSpoofMaxLength ?? 48;
    if (currentNameTag.length > maxLength) {
        flaggedReason = `NameTag length limit exceeded (${currentNameTag.length}/${maxLength})`;
    }

    // 2. Disallowed Characters Check (only if not already flagged for length)
    if (!flaggedReason && config.nameSpoofDisallowedCharsRegex) {
        try {
            // 'u' flag for Unicode property escapes, if supported and needed by regex.
            // For basic char sets, it might not be strictly necessary but is good practice for broader compatibility.
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, "u");
            if (regex.test(currentNameTag)) {
                const matchedChars = currentNameTag.match(regex);
                flaggedReason = `NameTag contains disallowed character(s) (e.g., '${matchedChars ? matchedChars[0] : 'N/A'}')`;
            }
        } catch (e) {
            playerUtils.debugLog?.(`NameSpoofCheck: Error compiling regex "${config.nameSpoofDisallowedCharsRegex}": ${e.message}`, watchedPrefix);
            // Potentially add a system log here if regex compilation fails, as it's a config issue.
        }
    }

    // 3. Rapid Change Check & pData Update
    // This logic runs regardless of prior flags to ensure pData is always updated on a name change.
    // The flagging for rapid change only happens if no other reason (length/char) already triggered.
    if (currentNameTag !== pData.lastKnownNameTag) {
        const minInterval = config.nameSpoofMinChangeIntervalTicks ?? 200; // Default to 10 seconds
        // Don't flag on first ever name seen for the session (when lastNameTagChangeTick is 0 or undefined)
        // or if it's the initial pData setup (lastKnownNameTag might be different from current if loaded).
        if (!flaggedReason &&
            (pData.lastNameTagChangeTick ?? 0) !== 0 &&
            (currentTick - (pData.lastNameTagChangeTick ?? 0)) < minInterval) {
            flaggedReason = `NameTag changed too rapidly (within ${currentTick - (pData.lastNameTagChangeTick ?? 0)} ticks, min is ${minInterval}t)`;
        }

        // Update pData because a name change occurred, regardless of flagging for rapid change.
        pData.lastKnownNameTag = currentNameTag;
        pData.lastNameTagChangeTick = currentTick;
        pData.isDirtyForSave = true; // Mark dirty as name history changed
    }


    if (flaggedReason) {
        const violationDetails = {
            reasonDetail: flaggedReason,
            currentNameTagDisplay: currentNameTag, // The potentially spoofed nameTag
            previousNameTagRecorded: (flaggedReason.includes("changed too rapidly")) ? previousNameTagForLog : "N/A",
            actualPlayerName: player.name, // Log the underlying player name for admin reference
            maxLengthConfig: maxLength.toString(),
            disallowedCharRegexConfig: config.nameSpoofDisallowedCharsRegex ?? "N/A",
            minChangeIntervalConfig: (config.nameSpoofMinChangeIntervalTicks ?? 0).toString()
        };
        // Action profile name: config.nameSpoofActionProfileName ?? "player_namespoof"
        await executeCheckAction(player, "player_namespoof", violationDetails, dependencies);

        playerUtils.debugLog?.(`NameSpoof: Flagged ${player.name} (current nameTag: "${currentNameTag}") for ${flaggedReason}`, watchedPrefix);
    }
}
