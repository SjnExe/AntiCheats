/**
 * @file Implements a check to detect potential advertising in chat messages.
 * All actionProfileName and checkType strings should be camelCase.
 */

/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
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
 * @param {Dependencies} dependencies - Shared dependencies including config, actionManager, and playerUtils.
 * @returns {Promise<void>} A promise that resolves when the check is complete.
 */
export async function checkAntiAdvertising(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!config?.enableAntiAdvertisingCheck && !config?.enableAdvancedLinkDetection) {
        return;
    }

    // Ensure actionProfileName is camelCase, standardizing from config
    const rawActionProfileName = config?.antiAdvertisingActionProfileName ?? 'chatAdvertisingDetected';
    const actionProfileName = rawActionProfileName
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    // Advanced Regex Detection
    if (config?.enableAdvancedLinkDetection && Array.isArray(config.advancedLinkRegexList) && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            if (typeof regexString !== 'string' || regexString.trim() === '') continue;
            try {
                const regex = new RegExp(regexString, 'i'); // Case-insensitive matching
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;

                    // Check Whitelist Patterns
                    if (Array.isArray(config.advertisingWhitelistPatterns) && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            if (typeof wlPattern !== 'string' || wlPattern.trim() === '') continue;
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
                                    playerUtils?.debugLog(`[AntiAdvertisingCheck] Link '${detectedLink}' for ${playerName} whitelisted by simple include: '${wlPattern}'. (Whitelist pattern was not valid regex: ${eRegexWl.message})`, watchedPlayerName, dependencies);
                                    break;
                                }
                            }
                        }
                    }

                    if (isWhitelisted) {
                        playerUtils?.debugLog(`[AntiAdvertisingCheck] Whitelisted link '${detectedLink}' for ${playerName}. Continuing scan with other regex patterns.`, watchedPlayerName, dependencies);
                        continue; // This link was whitelisted, but other regex patterns might find other non-whitelisted links.
                    }

                    // Link detected and not whitelisted by any pattern
                    playerUtils?.debugLog(`[AntiAdvertisingCheck] ${playerName} triggered ADVANCED regex '${regexString}' with link: '${detectedLink}'. Message: '${message}'`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink,
                        method: 'advancedRegex',
                        patternUsed: regexString,
                        originalMessage: message,
                    };
                    await actionManager?.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    // Access cancelMessage from the correct place (checkActionProfiles on config)
                    const profile = dependencies.checkActionProfiles?.[actionProfileName];
                    if (profile?.cancelMessage) {
                        eventData.cancel = true;
                    }
                    return; // Action taken, no need to check further patterns or simple patterns
                }
            } catch (eRegexMain) {
                console.error(`[AntiAdvertisingCheck CRITICAL] Invalid regex pattern in config.advancedLinkRegexList: '${regexString}'. Error: ${eRegexMain.stack || eRegexMain.message}`);
                playerUtils?.debugLog(`[AntiAdvertisingCheck CRITICAL] Error with regex '${regexString}' for ${playerName}: ${eRegexMain.message}`, watchedPlayerName, dependencies);
                // Potentially log this to a more persistent admin log if such errors are frequent
            }
        }
    }

    // Simple Pattern Matching (Fallback or if advanced is disabled/yielded no non-whitelisted results)
    if (!eventData.cancel && config?.enableAntiAdvertisingCheck && Array.isArray(config.antiAdvertisingPatterns) && config.antiAdvertisingPatterns.length > 0) {
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (typeof pattern !== 'string' || pattern.trim() === '') continue; // Skip invalid patterns

            // Check if this simple pattern is whitelisted (less common for simple patterns but possible)
            let isSimplePatternWhitelisted = false;
            if (Array.isArray(config.advertisingWhitelistPatterns) && config.advertisingWhitelistPatterns.length > 0) {
                for (const wlPattern of config.advertisingWhitelistPatterns) {
                     if (typeof wlPattern !== 'string' || wlPattern.trim() === '') continue;
                     // For simple patterns, usually, the whitelist check would be if the *pattern itself* is whitelisted,
                     // or if the message segment that *matches* the pattern is covered by a broader whitelist rule.
                     // Here, we'll check if the simple pattern *is contained within* any whitelist string, which is a basic form.
                     if (wlPattern.toLowerCase().includes(pattern.toLowerCase())) {
                         isSimplePatternWhitelisted = true;
                         playerUtils?.debugLog(`[AntiAdvertisingCheck] Simple pattern '${pattern}' considered whitelisted due to presence in whitelist entry '${wlPattern}'.`, watchedPlayerName, dependencies);
                         break;
                     }
                }
            }
            if (isSimplePatternWhitelisted) continue; // Skip this simple pattern if it's broadly whitelisted

            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                playerUtils?.debugLog(`[AntiAdvertisingCheck] ${playerName} triggered SIMPLE pattern '${pattern}'. Message: '${message}'`, watchedPlayerName, dependencies);
                const violationDetails = {
                    matchedPattern: pattern,
                    method: 'simplePattern',
                    originalMessage: message,
                };
                await actionManager?.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                const profile = dependencies.checkActionProfiles?.[actionProfileName];
                if (profile?.cancelMessage) {
                    eventData.cancel = true;
                }
                return; // Action taken
            }
        }
    } else if (!config?.enableAdvancedLinkDetection && (!config?.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0)) {
        playerUtils?.debugLog('[AntiAdvertisingCheck] Both advanced and simple advertising detection methods are disabled or have no patterns configured. Skipping.', watchedPlayerName, dependencies);
    }
}
