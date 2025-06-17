/**
 * @file AntiCheatsBP/scripts/checks/chat/antiAdvertisingCheck.js
 * Implements a check to detect potential advertising in chat messages.
 * @version 1.1.0
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
 * @param {string} message The raw message content.
 * @param {PlayerAntiCheatData} pData Player-specific data.
 * @param {CommandDependencies} dependencies
 * @returns {Promise<void>}
 */
export async function checkAntiAdvertising(player, message, pData, dependencies) {
    const { config, actionManager, playerUtils } = dependencies;
    // Ensure config.antiAdvertisingActionProfileName (from config.js) is the camelCase version for consistency.
    const actionProfileName = config.antiAdvertisingActionProfileName || "chatAdvertisingDetected";

    if (!config.enableAntiAdvertisingCheck) {
        return;
    }
    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;

    if (config.enableAdvancedLinkDetection && config.advancedLinkRegexList && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            try {
                const regex = new RegExp(regexString, 'i'); // Case-insensitive
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;
                    if (config.advertisingWhitelistPatterns && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            try { // Attempt to treat whitelist pattern as regex
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog?.(\`AntiAdv: Link '\${detectedLink}' on \${player.nameTag} whitelisted by regex pattern '\${wlPattern}'.\`, watchedPlayerName);
                                    break;
                                }
                            } catch (e) { // If wlPattern is not a valid regex, treat as simple string contains (case-insensitive)
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog?.(\`AntiAdv: Link '\${detectedLink}' on \${player.nameTag} whitelisted by simple string '\${wlPattern}'.\`, watchedPlayerName);
                                    break;
                                }
                            }
                        }
                    }
                    if (isWhitelisted) {
                        // Link is whitelisted, continue checking the message with other regex patterns
                        playerUtils.debugLog?.(\`AntiAdv: Whitelisted link "\${detectedLink}" found. Continuing scan with other regex patterns.\`, watchedPlayerName);
                        continue;
                    }
                    // Link not whitelisted, proceed to flag
                    playerUtils.debugLog?.(\`AntiAdv: Player \${player.nameTag} triggered regex pattern '\${regexString}' with link: "\${detectedLink}" in message: "\${message}"\`, watchedPlayerName);
                    const violationDetails = {
                        detectedLink: detectedLink,
                        method: "regex",
                        patternUsed: regexString,
                        originalMessage: message
                    };
                    await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    return; // Stop after first non-whitelisted match
                }
            } catch (e) {
                playerUtils.debugLog?.(\`AntiAdv: Error executing regex '\${regexString}' for \${player.nameTag}: \${e.message}\`, watchedPlayerName);
            }
        }
        // No non-whitelisted links found by advanced regexes
    } else {
        // Fallback to simple pattern checking
        if (!config.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0) {
            playerUtils.debugLog?.("AntiAdv: No simple patterns configured, skipping simple check.", watchedPlayerName);
            return;
        }
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                // Simple patterns currently do not have a separate whitelisting mechanism here.
                playerUtils.debugLog?.(\`AntiAdv: Player \${player.nameTag} triggered simple pattern '\${pattern}' with message: "\${message}"\`, watchedPlayerName);
                const violationDetails = {
                    matchedPattern: pattern,
                    method: "simple_pattern",
                    originalMessage: message
                };
                await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                return; // Stop after first match
            }
        }
    }
}
