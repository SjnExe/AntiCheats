/**
 * @file Implements a check to detect potential advertising in chat messages.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */

/**
 * Checks a message for potential advertising links or patterns.
 * It first attempts to use advanced regex-based detection if enabled and configured.
 * If not, or if no advanced matches are found, it falls back to simple pattern matching.
 * Whitelisting is supported for advanced regex detection.
 *
 * @async
 * @param {import('@minecraft/server').Player} player - The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData - The chat event data containing the message.
 * @param {PlayerAntiCheatData} pData - Player-specific anti-cheat data.
 * @param {CommandDependencies} dependencies - Shared dependencies including config, actionManager, and playerUtils.
 * @returns {Promise<void>} A promise that resolves when the check is complete.
 */
export async function checkAntiAdvertising(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;

    // Standardized action profile name (ensure this key exists in actionProfiles.js)
    const actionProfileName = config.antiAdvertisingActionProfileName || 'chatAdvertisingDetected';

    if (!config.enableAntiAdvertisingCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;

    if (config.enableAdvancedLinkDetection && config.advancedLinkRegexList && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            try {
                const regex = new RegExp(regexString, 'i'); // Case-insensitive matching
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;

                    if (config.advertisingWhitelistPatterns && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            try {
                                // Attempt to test pattern as regex
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog(`[AntiAdvCheck] Link '${detectedLink}' on ${player.nameTag} whitelisted by regex pattern '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            } catch (e) {
                                // Fallback to simple string inclusion if regex compilation failed for wlPattern
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog(`[AntiAdvCheck] Link '${detectedLink}' on ${player.nameTag} whitelisted by simple string '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            }
                        }
                    }

                    if (isWhitelisted) {
                        playerUtils.debugLog(`[AntiAdvCheck] Whitelisted link '${detectedLink}' found. Continuing scan with other regex patterns.`, watchedPlayerName, dependencies);
                        continue; // Don't flag, but continue checking other regex patterns in case of multiple links
                    }

                    playerUtils.debugLog(`[AntiAdvCheck] Player ${player.nameTag} triggered regex pattern '${regexString}' with link: '${detectedLink}' in message: '${message}'`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink: detectedLink,
                        method: 'regex',
                        patternUsed: regexString,
                        originalMessage: message,
                    };
                    // Use standardized actionProfileName
                    await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    // Assuming one flagged advertisement is enough, cancel and return.
                    // If eventData.cancel is handled by actionManager, this might not be needed here.
                    if (config.checkActionProfiles[actionProfileName]?.cancelMessage) {
                        eventData.cancel = true;
                    }
                    return;
                }
            } catch (e) {
                playerUtils.debugLog(`[AntiAdvCheck] Error executing regex '${regexString}' for ${player.nameTag}: ${e.message}`, watchedPlayerName, dependencies);
                console.error(`[AntiAdvCheck] Regex error for pattern '${regexString}': ${e.stack || e}`);
            }
        }
    } else {
        // Fallback to simple pattern matching if advanced detection is off or not configured
        if (!config.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0) {
            playerUtils.debugLog('[AntiAdvCheck] No simple patterns configured, skipping simple check.', watchedPlayerName, dependencies);
            return;
        }
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                playerUtils.debugLog(`[AntiAdvCheck] Player ${player.nameTag} triggered simple pattern '${pattern}' with message: '${message}'`, watchedPlayerName, dependencies);
                const violationDetails = {
                    matchedPattern: pattern,
                    method: 'simple_pattern',
                    originalMessage: message,
                };
                await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                if (config.checkActionProfiles[actionProfileName]?.cancelMessage) {
                    eventData.cancel = true;
                }
                return;
            }
        }
    }
}
