/**
 * @file AntiCheatsBP/scripts/checks/chat/checkUnicodeAbuse.js
 * Implements a check to detect Unicode abuse (e.g., Zalgo text with excessive diacritics).
 * @version 1.0.1
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks a message for Unicode abuse, specifically excessive combining diacritical marks.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkUnicodeAbuse(player, eventData, pData, dependencies) {
    const { config, playerUtils, actionManager } = dependencies;
    const rawMessageContent = eventData.message;

    if (!config.enableUnicodeAbuseCheck) {
        return;
    }
    if (!pData) { // pData might not be used by this specific check's logic
        playerUtils.debugLog("[UnicodeAbuseCheck] pData is null, skipping check (though not strictly needed for this check's core logic).", dependencies, player.nameTag);
        // return;
    }

    const minMessageLength = config.unicodeAbuseMinMessageLength ?? 5;
    if (rawMessageContent.length < minMessageLength) {
        return;
    }

    const maxDiacriticRatio = config.unicodeAbuseMaxDiacriticRatio ?? 0.5;
    const absoluteMaxDiacritics = config.unicodeAbuseAbsoluteMaxDiacritics ?? 10;
    const actionProfileName = config.unicodeAbuseActionProfileName ?? "chatUnicodeAbuse";
    let diacriticCount = 0;
    let otherCharCount = 0; // Non-diacritic, non-whitespace characters

    for (const char of rawMessageContent) {
        if (char.match(/\p{M}/u) || char.match(/\p{Mn}/u)) { // Check for combining marks
            diacriticCount++;
        } else if (char.match(/\S/)) { // Check if character is not whitespace
            otherCharCount++;
        }
    }

    const totalRelevantChars = diacriticCount + otherCharCount;
    if (totalRelevantChars === 0) {
        return; // Message was empty or whitespace only
    }

    const actualRatio = diacriticCount / totalRelevantChars;
    const flaggedByRatio = actualRatio >= maxDiacriticRatio;
    const flaggedByAbsolute = diacriticCount >= absoluteMaxDiacritics;
    let reason = "";

    if (flaggedByRatio && flaggedByAbsolute) {
        reason = "ratio and absolute count";
    } else if (flaggedByRatio) {
        reason = "ratio";
    } else if (flaggedByAbsolute) {
        reason = "absolute count";
    }

    if (reason) {
        const violationDetails = {
            messageSnippet: rawMessageContent.substring(0, 50),
            diacriticCount: diacriticCount.toString(),
            otherCharCount: otherCharCount.toString(),
            calculatedRatio: actualRatio.toFixed(2),
            ratioThreshold: maxDiacriticRatio.toFixed(2),
            absoluteThreshold: absoluteMaxDiacritics.toString(),
            flagReason: reason
        };

        await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
        playerUtils.debugLog(`[UnicodeAbuseCheck] Flagged ${player.nameTag} for Unicode abuse (${reason}). Ratio: ${actualRatio.toFixed(2)}, Diacritics: ${diacriticCount}. Msg: "${rawMessageContent.substring(0,20)}..."`, dependencies, pData?.isWatched ? player.nameTag : null);
    }
}
