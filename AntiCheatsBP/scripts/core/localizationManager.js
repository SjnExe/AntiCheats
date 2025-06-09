/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.0
 */

// import * as configModule from '../config.js'; // To get default lang, prefix for help messages, etc.

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = DEFAULT_LANGUAGE;

const translations = {
    "en_US": {
        // === General Messages (from config.js) ===
        "message.welcome": "Welcome, {playerName}, to our amazing server! We're glad to have you.",
        "message.deathCoords": "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.",
        "message.worldBorderWarning": "§cYou have reached the world border!",
        "config.serverRules": "1. Be respectful to all players and staff.\n2. No X-Ray or resource exploitation cheats.\n3. No hacking, combat advantages, or unfair modifications.\n4. No item duplication or exploiting game bugs for personal gain.\n5. Keep chat respectful and constructive.", // Newlines escaped for storage
        "message.generalHelp.welcome": "Welcome to the server! We hope you have a great time.",
        "message.generalHelp.helpCommandPrompt": "For a list of commands, type {prefix}help in chat.",
        "message.generalHelp.reportPrompt": "If you suspect a player of cheating, please use the report link or contact staff.",
        "message.generalHelp.rulesPrompt": "Please be familiar with our server rules, available via {prefix}uinfo.",

        // === Common ===
        "common.button.close": "Close",
        "common.error.noPermissionCommand": "You do not have permission to use this command.", // Used by help.js if perm check fails

        // === uinfo Command ===
        "uinfo.myStats.title": "My Anti-Cheat Stats",
        "uinfo.myStats.header": "§e--- Your Anti-Cheat Stats ---",
        "uinfo.myStats.totalFlags": "§fTotal Flags: §c{totalFlags}",
        "uinfo.myStats.lastFlagType": "§fLast Flag Type: §7{lastFlagType}",
        "uinfo.myStats.breakdownHeader": "§eBreakdown by Type:",
        "uinfo.myStats.flagEntry": "  §f- {flagKey}: §c{count} §7(Last: {lastDetectionTime})",
        "uinfo.myStats.noFlags": "§aYou have no active flags!",
        "uinfo.myStats.noSpecificFlags": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0).",
        "uinfo.myStats.noData": "§aNo flag data found for you, or you have no flags.",
        "uinfo.serverRules.title": "Server Rules",
        "uinfo.serverRules.noRulesConfigured": "No server rules configured.", // Fallback if config.serverRules key is missing/empty
        "uinfo.helpLinks.title": "Helpful Links",
        "uinfo.helpLinks.header": "§e--- Helpful Links ---",
        "uinfo.helpLinks.discord": "§fDiscord: §7{discordLink}",
        "uinfo.helpLinks.website": "§fWebsite: §7{websiteLink}",
        "uinfo.helpLinks.otherLinksHeader": "\n§e--- Other Links ---",
        "uinfo.helpLinks.linkEntry": "§f{title}: §7{url}",
        "uinfo.helpLinks.noLinksConfigured": "No helpful links are currently configured.",
        "uinfo.generalTips.title": "General Tips",
        "uinfo.generalTips.noTipsConfigured": "No general tips configured.",
        "uinfo.mainPanel.title": "Your Info & Server Help",
        "uinfo.mainPanel.body": "Welcome, {playerName}! Select an option:",
        "uinfo.mainPanel.button.myStats": "My Anti-Cheat Stats",
        "uinfo.mainPanel.button.serverRules": "Server Rules",
        "uinfo.mainPanel.button.helpLinks": "Helpful Links",
        "uinfo.mainPanel.button.generalTips": "General Tips",

        // === help Command (selected strings) ===
        "help.error.noCommand": "§cPlease enter a command after the prefix. Type {prefix}help for a list of commands.",
        "help.error.unknownCommand": "§cUnknown command: {prefix}{commandName}§r. Type {prefix}help for assistance.",
        "help.specific.header": "§a--- Help for: {prefix}{commandName} ---",
        "help.specific.syntax": "§eSyntax: {prefix}{commandName} {syntaxArgs}",
        "help.specific.description": "§7Description: {description}",
        "help.specific.permission": "§bPermission Level Required: {permLevelName} (Value: {permissionLevel})",
        "help.specific.notFoundOrNoPermission": "§cCommand '{commandName}' not found or you do not have permission to view its help. Try {prefix}help for a list of your commands.",
        "help.list.header": "§aAvailable commands (for your permission level):",
        "help.list.category.general": "--- General Player Commands ---",
        // Not adding all category headers and command entries for brevity in phase 1, but structure is there.
        "help.list.noCommandsAvailable": "§7No commands available at your current permission level.",
        "help.descriptionOverride.panel": "Opens the Info/Admin Panel (content varies by permission).",


        // === eventHandlers.js (selected strings) ===
        "ban.kickMessage": "You are banned from this server.\nReason: {reason}\n{durationMessage}",
        "ban.duration.permanent": "This ban is permanent.",
        "ban.duration.expires": "Expires: {expiryDate}",
        "ban.kickMessage.detailsError": "Reason: System detected an active ban, but details could not be fully retrieved. Please contact an admin.",
        "ban.kickMessage.discord": "Discord: {discordLink}", // Note: discordLink itself is a config value, not a localized string.
        "admin.notify.bannedPlayerJoin": "Banned player {playerName} tried to join. Banned by: {bannedBy}, Reason: {reason}",
        "admin.notify.newPlayerJoined": "§eNew player {playerName} has joined the server for the first time!",
        "message.combatLogAdminNotify": "§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.",
        "dimensionLock.teleportMessage": "Access to {lockedDimensionName} is currently restricted by an administrator.",
        "chat.error.muted": "You are currently muted and cannot send messages.",
        "chat.error.combatCooldown": "§cYou cannot chat for {seconds} seconds after combat.",
        "chat.error.itemUse": "§cYou cannot chat while {itemUseState}."
        // More can be added.
    }
};

export function setCurrentLanguage(langCode) {
    // For now, language switching isn't fully implemented, default to en_US
    // This function can be expanded later.
    if (translations[langCode]) {
        currentLanguage = langCode;
        // console.log(`[LocalizationManager] Language set to: ${langCode}`);
    } else {
        currentLanguage = DEFAULT_LANGUAGE;
        // console.warn(`[LocalizationManager] Language '${langCode}' not found. Falling back to '${DEFAULT_LANGUAGE}'.`);
    }
}

export function getString(key, args) {
    let langToUse = currentLanguage;
    if (!translations[langToUse] || typeof translations[langToUse][key] !== 'string') {
        if (langToUse !== DEFAULT_LANGUAGE && translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE][key] === 'string') {
            langToUse = DEFAULT_LANGUAGE;
        } else {
            console.warn(`[LocalizationManager] String key "${key}" not found for language "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
            return key;
        }
    }

    let str = translations[langToUse][key];

    if (args) {
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                const regex = new RegExp(`\\{\${i}\\}`, "g");
                str = str.replace(regex, String(args[i]));
            }
        } else if (typeof args === 'object' && args !== null) {
            for (const placeholderKey in args) {
                if (Object.prototype.hasOwnProperty.call(args, placeholderKey)) {
                    const regex = new RegExp(`\\{\${placeholderKey}\\}`, "g");
                    str = str.replace(regex, String(args[placeholderKey]));
                }
            }
        }
    }
    return str;
}
