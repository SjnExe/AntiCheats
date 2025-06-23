/**
 * Implements a check to detect potential advertising in chat messages.
 */
/**
 * @typedef {import('../../types.js').PlayerAntiCheatData} PlayerAntiCheatData
 * @typedef {import('../../types.js').Config} Config
 * @typedef {import('../../types.js').ActionManager} ActionManager
 * @typedef {import('../../types.js').CommandDependencies} CommandDependencies
 */
/**
 * Checks a message for potential advertising links or patterns.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ChatSendBeforeEvent} eventData The chat event data.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkAntiAdvertising(player, eventData, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    const message = eventData.message;

    const actionProfileName = config.antiAdvertisingActionProfileName || "chatAdvertisingDetected";

    if (!config.enableAntiAdvertisingCheck) {
        return;
    }
    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;

    if (config.enableAdvancedLinkDetection && config.advancedLinkRegexList && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            try {
                const regex = new RegExp(regexString, 'i');
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;
                    if (config.advertisingWhitelistPatterns && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            try {
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog(`[AntiAdvCheck] Link '${detectedLink}' on ${player.nameTag} whitelisted by regex pattern '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            } catch (e) {
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog(`[AntiAdvCheck] Link '${detectedLink}' on ${player.nameTag} whitelisted by simple string '${wlPattern}'.`, watchedPlayerName, dependencies);
                                    break;
                                }
                            }
                        }
                    }
                    if (isWhitelisted) {
                        playerUtils.debugLog(`[AntiAdvCheck] Whitelisted link "${detectedLink}" found. Continuing scan with other regex patterns.`, watchedPlayerName, dependencies);
                        continue;
                    }
                    playerUtils.debugLog(`[AntiAdvCheck] Player ${player.nameTag} triggered regex pattern '${regexString}' with link: "${detectedLink}" in message: "${message}"`, watchedPlayerName, dependencies);
                    const violationDetails = {
                        detectedLink: detectedLink,
                        method: "regex",
                        patternUsed: regexString,
                        originalMessage: message
                    };
                    await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    return;
                }
            } catch (e) {
                playerUtils.debugLog(`[AntiAdvCheck] Error executing regex '${regexString}' for ${player.nameTag}: ${e.message}`, watchedPlayerName, dependencies);
                console.error(`[AntiAdvCheck] Regex error for pattern "${regexString}": ${e.stack || e}`);
            }
        }
    } else {
        if (!config.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0) {
            playerUtils.debugLog("[AntiAdvCheck] No simple patterns configured, skipping simple check.", watchedPlayerName, dependencies);
            return;
        }
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                playerUtils.debugLog(`[AntiAdvCheck] Player ${player.nameTag} triggered simple pattern '${pattern}' with message: "${message}"`, watchedPlayerName, dependencies);
                const violationDetails = {
                    matchedPattern: pattern,
                    method: "simple_pattern",
                    originalMessage: message
                };
                await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                return;
            }
        }
    }
}
