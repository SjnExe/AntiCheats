/**
 * @file AntiCheatsBP/scripts/checks/player/nameSpoofCheck.js
 * Implements a check to detect player name spoofing attempts, including names that are too long,
 * contain disallowed characters, or are changed too rapidly.
 * Relies on `pData` fields like `lastKnownNameTag` and `lastNameTagChangeTick`.
 * @version 1.0.2
 */
import * as mc from '@minecraft/server';
// getString will be accessed via dependencies.getString

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks player's nameTag for spoofing attempts (length, disallowed characters, rapid changes).
 * Updates `pData.lastKnownNameTag` and `pData.lastNameTagChangeTick` if a name change is detected.
 *
 * @param {mc.Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNameSpoof(
    player,
    pData,
    dependencies
) {
    const { config, playerUtils, actionManager, getString, currentTick } = dependencies;

    if (!config.enableNameSpoofCheck || !pData) {
        return;
    }

    const currentNameTag = player.nameTag;
    const watchedPrefix = pData.isWatched ? player.name : null;
    // No need to reconstruct dependencies for executeCheckAction, pass the main one.

    let reasonDetailKey = null;
    let reasonDetailParams = {};
    let flaggedReasonForLog = ""; // For more detailed internal logging

    const maxLength = config.nameSpoofMaxLength ?? 48;
    if (currentNameTag.length > maxLength) {
        reasonDetailKey = "check.nameSpoof.reason.lengthExceeded";
        reasonDetailParams = { currentLength: currentNameTag.length.toString(), maxLength: maxLength.toString() };
        flaggedReasonForLog = `NameTag length limit exceeded (${currentNameTag.length}/${maxLength})`;
    }

    if (!reasonDetailKey && config.nameSpoofDisallowedCharsRegex) {
        try {
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, "u");
            const match = currentNameTag.match(regex);
            if (match) {
                reasonDetailKey = "check.nameSpoof.reason.disallowedChars";
                reasonDetailParams = { char: match[0] };
                flaggedReasonForLog = `NameTag contains disallowed character(s) (e.g., '${match[0]}')`;
            }
        } catch (e) {
            playerUtils.debugLog(`[NameSpoofCheck] Error compiling regex "${config.nameSpoofDisallowedCharsRegex}": ${e.message}`, dependencies, watchedPrefix);
            console.error(`[NameSpoofCheck] Regex compilation error: ${e.stack || e}`);
        }
    }

    const previousNameTagForLog = pData.lastKnownNameTag;
    if (currentNameTag !== pData.lastKnownNameTag) {
        const minInterval = config.nameSpoofMinChangeIntervalTicks ?? 200;
        const ticksSinceLastChange = currentTick - (pData.lastNameTagChangeTick ?? 0);
        if (!reasonDetailKey &&
            (pData.lastNameTagChangeTick ?? 0) !== 0 &&
            ticksSinceLastChange < minInterval) {
            reasonDetailKey = "check.nameSpoof.reason.rapidChange";
            reasonDetailParams = { interval: ticksSinceLastChange.toString(), minInterval: minInterval.toString() };
            flaggedReasonForLog = `NameTag changed too rapidly (within ${ticksSinceLastChange} ticks, min is ${minInterval}t)`;
        }
        pData.lastKnownNameTag = currentNameTag;
        pData.lastNameTagChangeTick = currentTick;
        pData.isDirtyForSave = true;
    }

    if (reasonDetailKey) {
        const localizedReasonDetail = getString(reasonDetailKey, reasonDetailParams); // getString from dependencies
        const violationDetails = {
            reasonDetail: localizedReasonDetail,
            currentNameTagDisplay: currentNameTag,
            previousNameTagRecorded: (reasonDetailKey === "check.nameSpoof.reason.rapidChange") ? previousNameTagForLog : "N/A",
            actualPlayerName: player.name,
            maxLengthConfig: maxLength.toString(),
            disallowedCharRegexConfig: config.nameSpoofDisallowedCharsRegex ?? "N/A",
            minChangeIntervalConfig: (config.nameSpoofMinChangeIntervalTicks ?? 0).toString()
        };
        const nameSpoofActionProfile = config.nameSpoofActionProfileName ?? "playerNamespoof";
        await actionManager.executeCheckAction(player, nameSpoofActionProfile, violationDetails, dependencies);

        playerUtils.debugLog(`[NameSpoofCheck] Flagged ${player.name} (current nameTag: "${currentNameTag}") for ${flaggedReasonForLog}`, dependencies, watchedPrefix);
    }
}
