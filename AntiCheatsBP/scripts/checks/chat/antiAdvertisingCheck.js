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

    const rawActionProfileName = config?.antiAdvertisingActionProfileName ?? 'chatAdvertisingDetected';
    const actionProfileName = rawActionProfileName
        .replace(/([-_][a-z0-9])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
        .replace(/^[A-Z]/, (match) => match.toLowerCase());

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (config?.enableAdvancedLinkDetection && Array.isArray(config.advancedLinkRegexList) && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            if (typeof regexString !== 'string' || regexString.trim() === '') {
                continue;
            }
            try {
                const regex = new RegExp(regexString, 'i');
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;

                    if (Array.isArray(config.advertisingWhitelistPatterns) && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            if (typeof wlPattern !== 'string' || wlPattern.trim() === '') {
                                continue;
                            }
                            try {
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils?.debugLog(`[AntiAdv] Link '${detectedLink}' for ${playerName} whitelisted by regex: '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            } catch (eRegexWl) {
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils?.debugLog(`[AntiAdv] Link '${detectedLink}' for ${playerName} whitelisted by include: '${wlPattern}'. (Invalid regex: ${eRegexWl.message})`, watchedPlayerName, dependencies);
                                    break;
                                }
                            }
                        }
                    }

                    if (isWhitelisted) {
                        playerUtils?.debugLog(`[AntiAdvertisingCheck] Whitelisted link '${detectedLink}' for ${playerName}. Continuing scan with other regex patterns.`, watchedPlayerName, dependencies);
                        continue;
                    }

                    playerUtils?.debugLog(`[AntiAdv] ${playerName} triggered ADV regex '${regexString}' with link: '${detectedLink}'. Msg: '${message}'`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink,
                        method: 'advancedRegex',
                        patternUsed: regexString,
                        originalMessage: message,
                    };
                    await actionManager?.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    const profile = dependencies.checkActionProfiles?.[actionProfileName];
                    if (profile?.cancelMessage) {
                        eventData.cancel = true;
                    }
                    return;
                }
            } catch (eRegexMain) {
                console.error(`[AntiAdvertisingCheck CRITICAL] Invalid regex pattern in config.advancedLinkRegexList: '${regexString}'. Error: ${eRegexMain.stack || eRegexMain.message}`);
                playerUtils?.debugLog(`[AntiAdvertisingCheck CRITICAL] Error with regex '${regexString}' for ${playerName}: ${eRegexMain.message}`, watchedPlayerName, dependencies);
            }
        }
    }

    if (!eventData.cancel && config?.enableAntiAdvertisingCheck && Array.isArray(config.antiAdvertisingPatterns) && config.antiAdvertisingPatterns.length > 0) {
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (typeof pattern !== 'string' || pattern.trim() === '') {
                continue;
            }

            let isSimplePatternWhitelisted = false;
            if (Array.isArray(config.advertisingWhitelistPatterns) && config.advertisingWhitelistPatterns.length > 0) {
                for (const wlPattern of config.advertisingWhitelistPatterns) {
                    if (typeof wlPattern !== 'string' || wlPattern.trim() === '') {
                        continue;
                    }



                    if (wlPattern.toLowerCase().includes(pattern.toLowerCase())) {
                        isSimplePatternWhitelisted = true;
                        playerUtils?.debugLog(`[AntiAdvertisingCheck] Simple pattern '${pattern}' considered whitelisted due to presence in whitelist entry '${wlPattern}'.`, watchedPlayerName, dependencies);
                        break;
                    }
                }
            }
            if (isSimplePatternWhitelisted) {
                continue;
            }

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
                return;
            }
        }
    } else if (!config?.enableAdvancedLinkDetection && (!config?.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0)) {
        playerUtils?.debugLog('[AntiAdv] Adv/Simple checks disabled or no patterns. Skipping.', watchedPlayerName, dependencies);
    }
}
