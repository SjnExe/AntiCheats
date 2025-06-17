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
    // Use the action profile name from config. This will be 'chatAdvertisingDetected' after config update.
    // It's CRITICAL that config.antiAdvertisingActionProfileName holds the CAMEL_CASE version.
    const actionProfileName = config.antiAdvertisingActionProfileName || "chatAdvertisingDetected";
    if (!config.enableAntiAdvertisingCheck) {
        return;
    }
    const watchedPlayerName = pData?.isWatched ? player.nameTag : null;
    if (config.enableAdvancedLinkDetection && config.advancedLinkRegexList && config.advancedLinkRegexList.length > 0) {
        for (const regexString of config.advancedLinkRegexList) {
            try {
                const regex = new RegExp(regexString, 'i'); // Case-insensitive, find first match in message
                const match = regex.exec(message);
                if (match) {
                    const detectedLink = match[0];
                    let isWhitelisted = false;
                    if (config.advertisingWhitelistPatterns && config.advertisingWhitelistPatterns.length > 0) {
                        for (const wlPattern of config.advertisingWhitelistPatterns) {
                            // Attempt to treat wlPattern as regex first for flexibility
                            try {
                                if (new RegExp(wlPattern, 'i').test(detectedLink)) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog?.(\`AntiAdv: Link '\${detectedLink}' on \${player.nameTag} whitelisted by regex pattern '\${wlPattern}'.\`, watchedPlayerName);
                                    break;
                                }
                            } catch (e) {
                                // If wlPattern is not a valid regex, treat as simple string contains (case insensitive)
                                if (detectedLink.toLowerCase().includes(wlPattern.toLowerCase())) {
                                    isWhitelisted = true;
                                    playerUtils.debugLog?.(\`AntiAdv: Link '\${detectedLink}' on \${player.nameTag} whitelisted by simple string '\${wlPattern}'.\`, watchedPlayerName);
                                    break;
                                }
                            }
                        }
                    }
                    if (isWhitelisted) {
                        // If whitelisted, this specific link is allowed.
                        // Continue to the next regex in advancedLinkRegexList to check for other potential non-whitelisted links in the same message.
                        playerUtils.debugLog?.(\`AntiAdv: Whitelisted link "\${detectedLink}" found. Continuing scan with other regex patterns.\`, watchedPlayerName);
                        continue;
                    }
                    // Not whitelisted, proceed to flag
                    playerUtils.debugLog?.(\`AntiAdv: Player \${player.nameTag} triggered regex pattern '\${regexString}' with link: "\${detectedLink}" in message: "\${message}"\`, watchedPlayerName);
                    const violationDetails = {
                        detectedLink: detectedLink,
                        method: "regex",
                        patternUsed: regexString,
                        originalMessage: message
                    };
                    await actionManager.executeCheckAction(player, actionProfileName, violationDetails, dependencies);
                    return; // Stop after first non-whitelisted match from any regex
                }
            } catch (e) {
                playerUtils.debugLog?.(\`AntiAdv: Error executing regex '\${regexString}' for \${player.nameTag}: \${e.message}\`, watchedPlayerName);
            }
        }
        // If loop completes, no non-whitelisted links were found by advanced regexes
    } else {
        // Fallback to simple pattern checking if advanced is disabled or no regex patterns are defined
        if (!config.antiAdvertisingPatterns || config.antiAdvertisingPatterns.length === 0) {
            playerUtils.debugLog?.("AntiAdv: No simple patterns configured, skipping simple check.", watchedPlayerName);
            return;
        }
        const lowerCaseMessage = message.toLowerCase();
        for (const pattern of config.antiAdvertisingPatterns) {
            if (lowerCaseMessage.includes(pattern.toLowerCase())) {
                // With simple patterns, whitelisting is harder unless done here too.
                // For now, assume simple patterns don't have a sophisticated whitelist.
                // This could be an area for future enhancement if simple patterns are kept long-term.
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
