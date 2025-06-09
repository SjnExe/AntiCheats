/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.2
 */

import { editableConfigValues as runTimeConfig } from '../config.js';

const DEFAULT_LANGUAGE = "en_US";
// Initialize currentLanguage with the value from config, falling back to DEFAULT_LANGUAGE
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

// Export translations so setlang can check for valid language codes
export const translations = {
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
        "common.error.noPermissionCommand": "You do not have permission to use this command.",
        "common.error.invalidPlayer": "Player \"{targetName}\" not found.",

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
        "uinfo.serverRules.noRulesConfigured": "No server rules configured.",
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
        "help.list.noCommandsAvailable": "§7No commands available at your current permission level.",
        "help.descriptionOverride.panel": "Opens the Info/Admin Panel (content varies by permission).",

        // === eventHandlers.js (selected strings) ===
        "ban.kickMessage": "You are banned from this server.\nReason: {reason}\n{durationMessage}",
        "ban.duration.permanent": "This ban is permanent.",
        "ban.duration.expires": "Expires: {expiryDate}",
        "ban.kickMessage.detailsError": "Reason: System detected an active ban, but details could not be fully retrieved. Please contact an admin.",
        "ban.kickMessage.discord": "Discord: {discordLink}",
        "admin.notify.bannedPlayerJoin": "Banned player {playerName} tried to join. Banned by: {bannedBy}, Reason: {reason}",
        "admin.notify.newPlayerJoined": "§eNew player {playerName} has joined the server for the first time!",
        "message.combatLogAdminNotify": "§cCombat Log: {playerName} disconnected {timeSinceCombat}s after combat. Flagged +{incrementAmount}.",
        "dimensionLock.teleportMessage": "Access to {lockedDimensionName} is currently restricted by an administrator.",
        "chat.error.muted": "You are currently muted and cannot send messages.",
        "chat.error.combatCooldown": "§cYou cannot chat for {seconds} seconds after combat.",
        "chat.error.itemUse": "§cYou cannot chat while {itemUseState}.",

        // === Ban Command ===
        "command.ban.usage": "§cUsage: {prefix}ban <playername> [duration] [reason]",
        "command.ban.notFoundOffline": "§cPlayer \"{targetName}\" not found online. Offline banning by name is not yet supported by this command version.",
        "command.ban.self": "§cYou cannot ban yourself.",
        "command.ban.permissionInsufficient": "§cYou do not have sufficient permission to ban this player.",
        "command.ban.ownerByNonOwner": "§cOwners cannot be banned by non-owners.",
        "command.ban.ownerByOwner": "§cOne Owner cannot ban another Owner directly through this command.",
        "command.ban.invalidDuration": "§cInvalid duration format. Use formats like 7d, 2h, 5m, or perm. Default is perm if unspecified.",
        "command.ban.success": "§aSuccessfully banned {targetName}. Duration: {durationString}. Reason: {reason}",
        "command.ban.fail": "§cFailed to ban {targetName}. They might already be banned or an error occurred.",
        "command.ban.kickMessagePrefix": "§cYou have been banned from this server.",
        "command.ban.kickMessageReason": "§rReason: {reason}",
        "command.ban.kickMessageBannedBy": "§cBanned by: {bannedBy}",
        "command.ban.kickMessagePermanent": "§cThis ban is permanent.",
        "command.ban.kickMessageExpires": "§cExpires: {expiryDate}",
        "command.ban.adminNotification": "Player {targetName} was banned by {bannedBy}. Duration: {durationString}. Reason: {reason}",

        // === Kick Command ===
        "command.kick.usage": "§cUsage: {prefix}kick <playername> [reason]",
        "command.kick.self": "§cYou cannot kick yourself.",
        "command.kick.targetNotification": "Kicked by: {adminName}\nReason: {reason}\n§eCheck server rules with {prefix}rules",
        "command.kick.success": "§aPlayer {targetName} has been kicked. Reason: {reason}",
        "command.kick.error": "§cError kicking player {targetName}: {error}",
        "command.kick.notFound": "§cPlayer \"{targetName}\" not found.",
        "command.kick.adminNotification": "Player {targetName} was kicked by {adminName}. Reason: {reason}",

        // === Mute Command ===
        "command.mute.usage": "§cUsage: {prefix}mute <playername> [duration] [reason]",
        "command.mute.notFound": "§cPlayer \"{targetName}\" not found.",
        "command.mute.self": "§cYou cannot mute yourself.",
        "command.mute.permissionInsufficient": "§cYou do not have sufficient permissions to mute this player.",
        "command.mute.invalidDuration": "§cInvalid duration format. Use formats like 5m, 2h, 1d, or perm. Default is {defaultDuration} if unspecified.",
        "command.mute.targetNotification.timed": "§cYou have been muted for {durationString}. Reason: {reason}",
        "command.mute.targetNotification.permanent": "§cYou have been muted permanently (this session/until unmuted). Reason: {reason}",
        "command.mute.success": "§aPlayer {targetName} has been muted {durationText}. Reason: {reason}",
        "command.mute.fail": "§cFailed to apply mute for {targetName}. They might already be muted with a longer or permanent duration, or an error occurred.",
        "command.mute.error": "§cAn unexpected error occurred while trying to mute {targetName}: {error}",
        "command.mute.adminNotification": "Player {targetName} was muted {durationText} by {mutedBy}. Reason: {reason}",

        // === SetLang Command ===
        "command.setlang.description": "Sets the server's default display language for AntiCheat messages.",
        "command.setlang.success": "§aServer language successfully set to {langCode}.",
        "command.setlang.fail": "§cFailed to set server language. Check console for details.",
        "command.setlang.invalidCode": "§cError: Invalid or unsupported language code '{langCode}'. No changes made.",
        "command.setlang.usage": "§cUsage: {prefix}setlang <language_code (e.g., en_US)>"
    }
    // Add other languages here, e.g., "es_ES": { ... }
};

export function setCurrentLanguage(langCode) {
    if (translations[langCode]) {
        currentLanguage = langCode;
        console.log(`[LocalizationManager] Runtime language set to: ${langCode}`);
    } else {
        // Don't fallback here, let the calling function (like setlang command) handle invalid codes.
        // If called internally and langCode is from config, it might be an issue.
        console.warn(`[LocalizationManager] Attempted to set runtime language to '${langCode}', which is not loaded. Current language remains '${currentLanguage}'.`);
    }
}

// Initialize language on load
setCurrentLanguage(runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE);

export function getString(key, args) {
    let langToUse = currentLanguage;

    // Check if currentLanguage (from config or setCurrentLanguage) is valid and has the key
    if (!translations[langToUse] || typeof translations[langToUse][key] !== 'string') {
        // If not, try DEFAULT_LANGUAGE if it's different
        if (langToUse !== DEFAULT_LANGUAGE && translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE][key] === 'string') {
            // console.warn(`[LocalizationManager] String key "${key}" not found for language "${currentLanguage}". Using fallback "${DEFAULT_LANGUAGE}".`);
            langToUse = DEFAULT_LANGUAGE;
        } else {
            // If still not found, log a warning and return the key itself
            console.warn(`[LocalizationManager] String key "${key}" not found for language "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
            return key;
        }
    }

    let str = translations[langToUse][key];

    if (args) {
        if (Array.isArray(args)) { // For ordered placeholders like {0}, {1}
            for (let i = 0; i < args.length; i++) {
                const regex = new RegExp(`\\{\${i}\\}`, "g");
                str = str.replace(regex, String(args[i]));
            }
        } else if (typeof args === 'object' && args !== null) { // For named placeholders like {playerName}
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

// Call once at startup to ensure currentLanguage is set from config.
// This is now handled by the direct initialization of currentLanguage and the setCurrentLanguage call below it.
// console.log(`[LocalizationManager] Initial language set to: ${currentLanguage}`);
