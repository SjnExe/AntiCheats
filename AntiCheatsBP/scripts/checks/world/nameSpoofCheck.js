import * as mc from '@minecraft/server';

/**
 * Checks player's nameTag for spoofing attempts (length, disallowed characters, rapid changes).
 * @param {mc.Player} player The player instance.
 * @param {import('../../core/playerDataManager.js').PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {object} config The configuration object.
 * @param {object} playerUtils Utility functions for players.
 * @param {object} playerDataManager Manager for player data.
 * @param {object} logManager Manager for logging.
 * @param {function} executeCheckAction Function to execute defined actions for a check.
 * @param {number} currentTick The current game tick.
 */
export async function checkNameSpoof(player, pData, config, playerUtils, playerDataManager, logManager, executeCheckAction, currentTick) {
    if (!config.enableNameSpoofCheck) return;

    const currentNameTag = player.nameTag;
    const watchedPrefix = pData.isWatched ? player.name : null; // Use actual player.name for watched prefix if nameTag is spoofed
    const dependencies = { config, playerDataManager, playerUtils, logManager };

    let flaggedReason = null;
    let previousNameTagForLog = pData.lastKnownNameTag; // Capture before potential update

    // 1. Length Check
    if (currentNameTag.length > config.nameSpoofMaxLength) {
        flaggedReason = `Length limit exceeded (\${currentNameTag.length}/\${config.nameSpoofMaxLength})`;
    }

    // 2. Disallowed Characters Check (only if not already flagged for length)
    if (!flaggedReason && config.nameSpoofDisallowedCharsRegex) {
        try {
            const regex = new RegExp(config.nameSpoofDisallowedCharsRegex, "u");
            if (regex.test(currentNameTag)) {
                const matchedChars = currentNameTag.match(regex);
                flaggedReason = `Disallowed character(s) found (e.g., '\${matchedChars ? matchedChars[0] : 'N/A'}')`;
            }
        } catch (e) {
            if (playerUtils.debugLog) playerUtils.debugLog(\`NameSpoofCheck: Error compiling regex '\${config.nameSpoofDisallowedCharsRegex}': \${e.message}\`, watchedPrefix);
        }
    }

    // 3. Rapid Change Check
    // This check happens *before* updating lastKnownNameTag for the current tick if no other flag has occurred yet.
    // If a length/char flag occurred, we still note the change for the next cycle's rapid check.
    if (currentNameTag !== pData.lastKnownNameTag) {
        if (!flaggedReason && // Only flag for rapid change if no other reason yet
            pData.lastNameTagChangeTick !== 0 && // Don't flag on first ever name change seen for the session
            (currentTick - pData.lastNameTagChangeTick) < config.nameSpoofMinChangeIntervalTicks) {
            flaggedReason = `Name changed too rapidly (within \${currentTick - pData.lastNameTagChangeTick}t, min \${config.nameSpoofMinChangeIntervalTicks}t)`;
        }
        // Update pData because a change occurred, regardless of flagging.
        pData.lastKnownNameTag = currentNameTag;
        pData.lastNameTagChangeTick = currentTick;
    }


    if (flaggedReason) {
        const violationDetails = {
            reasonDetail: flaggedReason,
            nameTag: currentNameTag,
            previousNameTag: (flaggedReason && flaggedReason.startsWith("Name changed too rapidly")) ? previousNameTagForLog : "N/A (not a rapid change issue or first change)",
            currentActualName: player.name
        };

        await executeCheckAction(player, "player_namespoof", violationDetails, dependencies);

        if (pData.isWatched && playerUtils.debugLog) {
            playerUtils.debugLog(\`NameSpoof: Flagged \${player.name} (\${currentNameTag}) for \${flaggedReason}\`, watchedPrefix);
        }
    }
}
