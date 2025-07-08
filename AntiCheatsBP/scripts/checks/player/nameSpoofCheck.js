/**
 * @file Implements a check to detect player name spoofing attempts, including names that are too long,
 * contain disallowed characters, or are changed too rapidly.
 * Relies on `pData` fields like `lastKnownNameTag` and `lastNameTagChangeTick`.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

// Constants for magic numbers
const defaultNameSpoofMaxLength = 48;
const defaultNameSpoofMinChangeIntervalTicks = 200;

/**
 * Checks a player's nameTag for spoofing attempts based on configured rules
 * regarding length, disallowed characters, and rapid changes.
 * Updates `pData.lastKnownNameTag` and `pData.lastNameTagChangeTick` if a name change is detected.
 * This check should be run periodically for all online players (e.g., via main tick loop).
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player instance.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {Dependencies} dependencies - The standard dependencies object.
 * @returns {Promise<void>}
 */
export async function checkNameSpoof(player, pData, dependencies) {
    const { config, playerUtils, actionManager, currentTick, logManager } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableNameSpoofCheck) {
        return;
    }
    if (!pData) {
        playerUtils?.debugLog(`[NameSpoofCheck] Skipping for ${playerName}: pData is null.`, playerName, dependencies);
        return;
    }

    const currentNameTag = player.nameTag;
    const watchedPlayerName = pData.isWatched ? playerName : null;

    let reasonDetailString = null;
    let flaggedReasonForLog = null;
    const previousNameTagForViolationDetails = pData.lastKnownNameTag ?? 'N/A';

    const maxLength = config?.nameSpoofMaxLength ?? defaultNameSpoofMaxLength;
    if (currentNameTag.length > maxLength) {
        reasonDetailString = `Name is too long (${currentNameTag.length}/${maxLength}).`;
        flaggedReasonForLog = `NameTag length limit exceeded (${currentNameTag.length}/${maxLength}). Name: '${currentNameTag}'`;
    }

    if (!reasonDetailString && config?.nameSpoofDisallowedCharsRegex) {
        try {
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, 'u');
            const match = currentNameTag.match(regex);
            if (match) {
                reasonDetailString = `Name contains disallowed character: '${match[0]}'.`;
                flaggedReasonForLog = `NameTag contains disallowed character(s) (e.g., '${match[0]}') matching regex. Name: '${currentNameTag}'`;
            }
        } catch (e) {
            playerUtils?.debugLog(`[NameSpoofCheck CRITICAL] Error compiling regex '${config.nameSpoofDisallowedCharsRegex}': ${e.message}`, watchedPlayerName, dependencies);
            console.error(`[NameSpoofCheck CRITICAL] Regex compilation error: ${e.stack || e}`);
            logManager?.addLog({
                actionType: 'errorSystemConfig', context: 'NameSpoofCheck.regexCompilation',
                details: { error: `Invalid regex: '${config.nameSpoofDisallowedCharsRegex}'`, message: e.message },
                errorStack: e.stack,
            }, dependencies);
        }
    }

    if (currentNameTag !== pData.lastKnownNameTag) {
        const minIntervalTicks = config?.nameSpoofMinChangeIntervalTicks ?? defaultNameSpoofMinChangeIntervalTicks;
        const ticksSinceLastChange = currentTick - (pData.lastNameTagChangeTick ?? 0); // 0 is fine

        if (!reasonDetailString &&
            (pData.lastNameTagChangeTick ?? 0) !== 0 &&
            ticksSinceLastChange < minIntervalTicks) {
            reasonDetailString = `Name changed too quickly (last change ${ticksSinceLastChange} ticks ago, min is ${minIntervalTicks}).`;
            flaggedReasonForLog = `NameTag changed too rapidly (within ${ticksSinceLastChange} ticks, min is ${minIntervalTicks}t). From '${pData.lastKnownNameTag}' to '${currentNameTag}'.`;
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
            disallowedCharRegexConfig: config?.nameSpoofDisallowedCharsRegex ?? 'N/A',
            minChangeIntervalConfig: (config?.nameSpoofMinChangeIntervalTicks ?? 0).toString(),
        };
        const rawActionProfileKey = config?.nameSpoofActionProfileName ?? 'playerNameSpoof';
        const actionProfileKey = rawActionProfileKey
            .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
            .replace(/^[A-Z]/, (match) => match.toLowerCase());

        await actionManager?.executeCheckAction(player, actionProfileKey, violationDetails, dependencies);

        playerUtils?.debugLog(`[NameSpoofCheck] Flagged ${player.name} (current nameTag: '${currentNameTag}') for NameSpoof. Reason: ${flaggedReasonForLog}`, watchedPlayerName, dependencies);
    } else if (pData.isWatched && config?.enableDebugLogging && currentNameTag !== previousNameTagForViolationDetails && previousNameTagForViolationDetails !== 'N/A') {
        playerUtils?.debugLog(`[NameSpoofCheck] Name change detected for watched player ${player.name}: from '${previousNameTagForViolationDetails}' to '${currentNameTag}'. Not flagged this time.`, watchedPlayerName, dependencies);
    }
}
