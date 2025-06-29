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
    const watchedPrefix = pData.isWatched ? player.name : null;

    let reasonDetailString = null;
    let flaggedReasonForLog = null;
    let previousNameTagForViolationDetails = 'N/A';

    const maxLength = config.nameSpoofMaxLength ?? 48;
    if (currentNameTag.length > maxLength) {
        reasonDetailString = `Name is too long (${currentNameTag.length}/${maxLength}).`;
        flaggedReasonForLog = `NameTag length limit exceeded (${currentNameTag.length}/${maxLength})`;
    }

    if (!reasonDetailString && config.nameSpoofDisallowedCharsRegex) {
        try {
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, 'u');
            const match = currentNameTag.match(regex);
            if (match) {
                reasonDetailString = `Name contains disallowed character: '${match[0]}'.`;
                flaggedReasonForLog = `NameTag contains disallowed character(s) (e.g., '${match[0]}') matching regex.`;
            }
        } catch (e) {
            playerUtils.debugLog(`[NameSpoofCheck] Error compiling regex '${config.nameSpoofDisallowedCharsRegex}': ${e.message}`, watchedPrefix, dependencies);
        }
    }

    if (currentNameTag !== pData.lastKnownNameTag) {
        const minIntervalTicks = config.nameSpoofMinChangeIntervalTicks ?? 200;
        const ticksSinceLastChange = currentTick - (pData.lastNameTagChangeTick ?? 0);

        if (!reasonDetailString &&
            (pData.lastNameTagChangeTick ?? 0) !== 0 &&
            ticksSinceLastChange < minIntervalTicks) {
            reasonDetailString = `Name changed too quickly (last change ${ticksSinceLastChange} ticks ago, min is ${minIntervalTicks}).`;
            flaggedReasonForLog = `NameTag changed too rapidly (within ${ticksSinceLastChange} ticks, min is ${minIntervalTicks}t). From '${pData.lastKnownNameTag}' to '${currentNameTag}'.`;
            previousNameTagForViolationDetails = pData.lastKnownNameTag;
        }
        pData.lastKnownNameTag = currentNameTag;
        pData.lastNameTagChangeTick = currentTick;
        pData.isDirtyForSave = true;
    }

    if (reasonDetailString) {
        const violationDetails = {
            reasonDetail: reasonDetailString,
            currentNameTagDisplay: currentNameTag,
            previousNameTagRecorded: previousNameTagForViolationDetails,
            actualPlayerName: player.name,
            maxLengthConfig: maxLength.toString(),
            disallowedCharRegexConfig: config.nameSpoofDisallowedCharsRegex ?? 'N/A',
            minChangeIntervalConfig: (config.nameSpoofMinChangeIntervalTicks ?? 0).toString(),
        };
        const actionProfileKey = config.nameSpoofActionProfileName || 'playerNamespoof';
        await actionManager.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils.debugLog(`[NameSpoofCheck] Flagged ${player.name} (current nameTag: '${currentNameTag}') for ${flaggedReasonForLog}`, watchedPrefix, dependencies);
    }
}
