/**
 * @file Implements a check to detect player name spoofing attempts, including names that are too long,
 * contain disallowed characters, or are changed too rapidly.
 * Relies on `pData` fields like `lastKnownNameTag` and `lastNameTagChangeTick`.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 * @typedef {import('../../types.js').Config} Config
 */

/**
 * Checks a player's nameTag for spoofing attempts based on configured rules
 * regarding length, disallowed characters, and rapid changes.
 * Updates `pData.lastKnownNameTag` and `pData.lastNameTagChangeTick` if a name change is detected.
 * This check should be run periodically for all online players.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNameSpoof(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick } = dependencies;

    if (!config.enableNameSpoofCheck || !pData) {
        return;
    }

    const currentNameTag = player.nameTag;
    // Use player.name for watched prefix if nameTag is the potentially spoofed value
    const watchedPrefix = pData.isWatched ? player.name : null;

    let reasonDetailKey = null;
    let reasonDetailParams = {};
    let flaggedReasonForLog = '';

    const maxLength = config.nameSpoofMaxLength ?? 48;
    if (currentNameTag.length > maxLength) {
        reasonDetailKey = 'check.nameSpoof.reason.lengthExceeded';
        reasonDetailParams = { currentLength: currentNameTag.length.toString(), maxLength: maxLength.toString() };
        flaggedReasonForLog = `NameTag length limit exceeded (${currentNameTag.length}/${maxLength})`;
    }

    if (!reasonDetailKey && config.nameSpoofDisallowedCharsRegex) {
        try {
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, 'u'); // 'u' for Unicode
            const match = currentNameTag.match(regex);
            if (match) {
                reasonDetailKey = 'check.nameSpoof.reason.disallowedChars';
                reasonDetailParams = { char: match[0] }; // The first matched disallowed character/sequence
                flaggedReasonForLog = `NameTag contains disallowed character(s) (e.g., '${match[0]}') matching regex.`;
            }
        } catch (e) {
            playerUtils.debugLog(`[NameSpoofCheck] Error compiling regex '${config.nameSpoofDisallowedCharsRegex}': ${e.message}`, watchedPrefix, dependencies);
            // Potentially add a system log entry about the invalid regex config
        }
    }

    // This part also updates lastKnownNameTag and lastNameTagChangeTick
    const previousNameTagForLog = pData.lastKnownNameTag;
    if (currentNameTag !== pData.lastKnownNameTag) {
        const minIntervalTicks = config.nameSpoofMinChangeIntervalTicks ?? 200; // Default to 10 seconds
        const ticksSinceLastChange = currentTick - (pData.lastNameTagChangeTick ?? 0);

        if (!reasonDetailKey && // Only flag for rapid change if no other issue found yet
            (pData.lastNameTagChangeTick ?? 0) !== 0 && // Ensure there was a previous change logged
            ticksSinceLastChange < minIntervalTicks) {
            reasonDetailKey = 'check.nameSpoof.reason.rapidChange';
            reasonDetailParams = { interval: ticksSinceLastChange.toString(), minInterval: minIntervalTicks.toString() };
            flaggedReasonForLog = `NameTag changed too rapidly (within ${ticksSinceLastChange} ticks, min is ${minIntervalTicks}t). From '${previousNameTagForLog}' to '${currentNameTag}'.`;
        }
        // Update tracking info regardless of whether rapid change was the primary flag reason
        pData.lastKnownNameTag = currentNameTag;
        pData.lastNameTagChangeTick = currentTick;
        pData.isDirtyForSave = true;
    }

    if (reasonDetailKey) {
        let reasonDetailString = flaggedReasonForLog;
        if (reasonDetailKey === 'check.nameSpoof.reason.lengthExceeded' && reasonDetailParams.currentLength && reasonDetailParams.maxLength) {
            reasonDetailString = `Name is too long (${reasonDetailParams.currentLength}/${reasonDetailParams.maxLength}).`;
        } else if (reasonDetailKey === 'check.nameSpoof.reason.disallowedChars' && reasonDetailParams.char) {
            reasonDetailString = `Name contains disallowed character: '${reasonDetailParams.char}'.`;
        } else if (reasonDetailKey === 'check.nameSpoof.reason.rapidChange' && reasonDetailParams.interval && reasonDetailParams.minInterval) {
            reasonDetailString = `Name changed too quickly (last change ${reasonDetailParams.interval} ticks ago, min is ${reasonDetailParams.minInterval}).`;
        }

        const violationDetails = {
            reasonDetail: reasonDetailString,
            currentNameTagDisplay: currentNameTag,
            previousNameTagRecorded: (reasonDetailKey === 'check.nameSpoof.reason.rapidChange') ? previousNameTagForLog : 'N/A',
            actualPlayerName: player.name, // The underlying, immutable player name
            maxLengthConfig: maxLength.toString(),
            disallowedCharRegexConfig: config.nameSpoofDisallowedCharsRegex ?? 'N/A',
            minChangeIntervalConfig: (config.nameSpoofMinChangeIntervalTicks ?? 0).toString(),
        };
        const actionProfileKey = config.nameSpoofActionProfileName || 'playerNamespoof';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[NameSpoofCheck] Flagged ${player.name} (current nameTag: '${currentNameTag}') for ${flaggedReasonForLog}`, watchedPrefix, dependencies);
    }
}
