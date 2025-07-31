/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Dependencies} Dependencies
 */

/**
 * Checks a message for potential advertising links or patterns.
 * @param {import('@minecraft/server').Player} player The player who sent the message.
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData Player-specific anti-cheat data.
 * @param {Dependencies} dependencies Shared dependencies.
 */
function isWhitelisted(message, config, playerUtils, playerName, watchedPlayerName, dependencies) {
    if (!Array.isArray(config.advertisingWhitelistPatterns) || config.advertisingWhitelistPatterns.length === 0) {
        return false;
    }

    const lowerCaseMessage = message.toLowerCase();

    for (const wlPattern of config.advertisingWhitelistPatterns) {
        if (typeof wlPattern !== 'string' || wlPattern.trim() === '') {
            continue;
        }
        try {
            // Try as regex first
            if (new RegExp(wlPattern, 'i').test(message)) {
                playerUtils?.debugLog(`[AntiAdv] Message for ${playerName} whitelisted by regex: '${wlPattern}'.`, watchedPlayerName, dependencies);
                return true;
            }
        } catch (eRegexWl) {
            // Fallback to simple string inclusion if the pattern is not a valid regex.
            if (lowerCaseMessage.includes(wlPattern.toLowerCase())) {
                playerUtils?.debugLog(`[AntiAdv] Message for ${playerName} whitelisted by include: '${wlPattern}'. (Invalid regex: ${eRegexWl.message})`, watchedPlayerName, dependencies);
                return true;
            }
        }
    }
    return false;
}


let compiledAdvancedLinkRegexList = [];
let lastLoadedAdvancedLinkRegexList = null;

function getCompiledAdvancedLinkRegex(config, playerUtils, watchedPlayerName, dependencies) {
    const currentRegexListJson = JSON.stringify(config.advancedLinkRegexList);
    if (currentRegexListJson !== lastLoadedAdvancedLinkRegexList) {
        playerUtils?.debugLog('[AntiAdv] Compiling new advanced link regex patterns.', watchedPlayerName, dependencies);
        compiledAdvancedLinkRegexList = (config.advancedLinkRegexList ?? []).map(pattern => {
            if (typeof pattern !== 'string' || pattern.trim() === '') return null;
            try {
                return new RegExp(pattern, 'i');
            } catch (e) {
                console.error(`[AntiAdvertisingCheck CRITICAL] Invalid regex pattern in config.advancedLinkRegexList: '${pattern}'. Error: ${e.stack || e.message}`);
                playerUtils?.debugLog(`[AntiAdvertisingCheck CRITICAL] Error compiling regex '${pattern}': ${e.message}`, watchedPlayerName, dependencies);
                return null;
            }
        }).filter(Boolean);
        lastLoadedAdvancedLinkRegexList = currentRegexListJson;
    }
    return compiledAdvancedLinkRegexList;
}


export async function checkAntiAdvertising(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;
    const playerName = player?.name ?? 'UnknownPlayer';

    if (!config?.enableAntiAdvertisingCheck && !config?.enableAdvancedLinkDetection) {
        return;
    }

    const actionProfileName = config?.antiAdvertisingActionProfileName ?? 'chatAdvertisingDetected';

    const watchedPlayerName = pData?.isWatched ? playerName : null;

    if (config?.enableAdvancedLinkDetection) {
        const compiledRegexList = getCompiledAdvancedLinkRegex(config, playerUtils, watchedPlayerName, dependencies);
        if (compiledRegexList.length > 0) {
            if (isWhitelisted(message, config, playerUtils, playerName, watchedPlayerName, dependencies)) {
                return; // Message is whitelisted, stop all advertisement checks for it.
            }
            for (const regex of compiledRegexList) {
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    // No need to call isWhitelisted again here, as we check the whole message once up front.

                    playerUtils?.debugLog(`[AntiAdv] ${playerName} triggered ADV regex '${regex.source}' with link: '${detectedLink}'. Msg: '${message}'`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink,
                        method: 'advancedRegex',
                        patternUsed: regex.source,
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
        }
    }

    if (!eventData.cancel && config?.enableAntiAdvertisingCheck && Array.isArray(config.antiAdvertisingPatterns) && config.antiAdvertisingPatterns.length > 0) {
        // The advanced check already handles whitelisting. If it ran, we can assume the message is not whitelisted.
        // If only simple checks are on, we must check for whitelisting here.
        if (!config.enableAdvancedLinkDetection) {
            if (isWhitelisted(message, config, playerUtils, playerName, watchedPlayerName, dependencies)) {
                return; // Message is whitelisted, stop all advertisement checks for it.
            }
        }

        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (typeof pattern !== 'string' || pattern.trim() === '') {
                continue;
            }

            // No need to call isWhitelisted per-pattern. It's done once for the whole message.

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
