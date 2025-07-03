/**
 * @file Implements a check to detect potential advertising in chat messages.
 * All actionProfileName and checkType strings should be camelCase.
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
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    // Ensure actionProfileName is camelCase
    const actionProfileName = config?.antiAdvertisingActionProfileName?.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase()) ?? 'chatAdvertisingDetected';

    if (!config?.enableAntiAdvertisingCheck) {
        return;
    }

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    // Advanced Regex Detection
    if (config.enableAdvancedLinkDetection && Array.isArray(config.advancedLinkRegexList) && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            if (typeof regexString !== 'string') continue; // Skip invalid regex strings
            try {
                const regex = new RegExp(regexString, 'i'); // Case-insensitive matching
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;

                    // Check Whitelist Patterns
                    if (Array.isArray(config.advertisingWhitelistPatterns) && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            if (typeof wlPattern !== 'string') continue; // Skip invalid whitelist patterns
                            try {
                                // Attempt regex match for whitelist pattern
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils?.debugLog(`[AntiAdvertisingCheck] Link '${detectedLink}' for ${playerName} whitelisted by regex: '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            } catch (eRegexWl) {
                                // Fallback to simple string inclusion if regex for whitelist pattern is invalid
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils?.debugLog(`[AntiAdvertisingCheck] Link '${detectedLink}' for ${playerName} whitelisted by simple include: '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            }
                        }
                    }

                    if (isWhitelisted) {
                        playerUtils?.debugLog(`[AntiAdvertisingCheck] Whitelisted link '${detectedLink}' for ${playerName}. Continuing scan.`, watchedPlayerName, dependencies);
                        continue; // Check next regex, this one was whitelisted
                    }

                    // Link detected and not whitelisted
                    playerUtils?.debugLog(`[AntiAdvertisingCheck] ${playerName} triggered regex '${regexString}' with link: '${detectedLink}'. Message: '${message}'`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink,
                        method: 'regex',
                        patternUsed: regexString,
                        originalMessage: message,
                    };
                    await actionManager?.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    const profile = config.checkActionProfiles?.[actionProfileName];
                    if (profile?.cancelMessage) {
                        eventData.cancel = true;
                    }
                    return; // Action taken, no need to check further patterns
                }
            } catch (eRegexMain) {
                console.error(`[AntiAdvertisingCheck] Invalid regex pattern '${regexString}': ${eRegexMain.stack || eRegexMain.message || String(eRegexMain)}`);
                playerUtils?.debugLog(`[AntiAdvertisingCheck] Error with regex '${regexString}' for ${playerName}: ${eRegexMain.message}`, watchedPlayerName, dependencies);
            }
        }
    }
    // Simple Pattern Matching (Fallback or if advanced is disabled)
    // This part only runs if no advanced regex match was found and actioned upon.
    if (!eventData.cancel && Array.isArray(config.antiAdvertisingPatterns) && config.antiAdvertisingPatterns.length > 0) {
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (typeof pattern !== 'string') continue; // Skip invalid patterns
            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                playerUtils?.debugLog(`[AntiAdvertisingCheck] ${playerName} triggered simple pattern '${pattern}'. Message: '${message}'`, watchedPlayerName, dependencies);
                const violationDetails = {
                    matchedPattern: pattern,
                    method: 'simplePattern',
                    originalMessage: message,
                };
                await actionManager?.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                const profile = config.checkActionProfiles?.[actionProfileName];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Action taken
            }
        }
    } else if (!config.enableAdvancedLinkDetection) {
        playerUtils?.debugLog('[AntiAdvertisingCheck] Advanced detection disabled and no simple patterns configured. Skipping.', watchedPlayerName, dependencies);
    }
}
