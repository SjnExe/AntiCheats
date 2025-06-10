/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.10
 */

import { editableConfigValues as runTimeConfig } from '../config.js';

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

export const translations = {
    "en_US": {
        // === General Messages (from config.js) ===
        "message.welcome": "Welcome, {playerName}, to our amazing server! We're glad to have you.",
        "message.deathCoords": "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.",
        "message.worldBorderWarning": "§cYou have reached the world border!",
        "config.serverRules": "1. Be respectful to all players and staff.\n2. No X-Ray or resource exploitation cheats.\n3. No hacking, combat advantages, or unfair modifications.\n4. No item duplication or exploiting game bugs for personal gain.\n5. Keep chat respectful and constructive.",
        "message.generalHelp.welcome": "Welcome to the server! We hope you have a great time.",
        "message.generalHelp.helpCommandPrompt": "For a list of commands, type {prefix}help in chat.",
        "message.generalHelp.reportPrompt": "If you suspect a player of cheating, please use the report link or contact staff.",
        "message.generalHelp.rulesPrompt": "Please be familiar with our server rules, available via {prefix}uinfo.",

        // === Common ===
        "common.button.close": "Close",
        "common.button.back": "Back",
        "common.button.confirm": "Confirm",
        "common.button.cancel": "Cancel",
        "common.error.noPermissionCommand": "You do not have permission to use this command.",
        "common.error.invalidPlayer": "Player \"{targetName}\" not found.",
        "common.error.genericForm": "An error occurred while displaying or processing the form.",
        "common.error.commandModuleNotFound": "§cCommand module '{moduleName}' not found.",
        "common.error.playerNotFoundOnline": "§cPlayer '{playerName}' not found online.",
        "common.error.nameEmpty": "§cName cannot be empty.",
        "common.error.generic": "§cAn unexpected error occurred.",
        "common.status.enabled": "ENABLED",
        "common.status.disabled": "DISABLED",
        "common.status.locked": "§cLOCKED",
        "common.status.unlocked": "§aUNLOCKED",
        "common.page": "Page {currentPage}/{totalPages}",
        "common.button.next": "Next",
        "common.button.previous": "Previous",
        "common.success": "§aSuccess!",
        "common.fail": "§cOperation failed.",

        // === Command Specific Errors / Usage ===
        "command.error.specifyPlayer": "§cPlease specify a player name to target their game mode.",
        "command.error.gamemodeSettingFailed": "§cError setting game mode for {playerName}.",
        "command.error.invalidArgOnOffStatus": "§cInvalid argument. Use 'on', 'off', or 'status'.",
        "command.error.invalidArgOnOffStatusToggle": "§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.",

        // === UI Manager (condensed for brevity, full list in actual file) ===
        "ui.adminPanel.title": "Admin Panel",
        // ... (Assume all other UI strings are here) ...

        // === Ban Command ===
        "command.ban.usage": "§cUsage: {prefix}ban <playername> [duration] [reason]",
        // ... (Assume all other ban command strings are here) ...

        // === Kick Command ===
        "command.kick.usage": "§cUsage: {prefix}kick <playername> [reason]",
        // ... (Assume all other kick command strings are here) ...

        // === Mute Command ===
        "command.mute.usage": "§cUsage: {prefix}mute <playername> [duration] [reason]",
        // ... (Assume all other mute command strings are here) ...

        // === SetLang Command ===
        "command.setlang.description": "Sets the server's default display language for AntiCheat messages.",
        // ... (Assume all other setlang command strings are here) ...

        // === WorldBorder Command ===
        "command.worldborder.help.header": "§b--- World Border Commands ---§r",
        // ... (Assume all other worldborder command strings are here) ...

        // === Vanish Command ===
        "command.vanish.description": "Toggles admin visibility and related effects. Optional mode 'silent' (default) or 'notify'.",
        // ... (Assume all other vanish command strings are here) ...

        // === TP (Teleport) Command ===
        "command.tp.description": "Teleports players or self to coordinates/players.",
        // ... (Assume all other tp command strings are here) ...

        // === InvSee Command ===
        "command.invsee.description": "Displays a read-only view of a player's inventory.",
        // ... (Assume all other invsee command strings are here) ...

        // === Gamemode Commands ===
        "command.gma.description": "Sets Adventure mode for self or [playername].",
        // ... (Assume all other gamemode command strings are here) ...

        // === NetherLock Command ===
        "command.netherlock.description": "Manages the lock state for the Nether dimension. Prevents non-admins from entering when locked.",
        // ... (Assume all other netherlock command strings are here) ...

        // === EndLock Command ===
        "command.endlock.description": "Manages the lock state for the End dimension. Prevents non-admins from entering when locked.",
        // ... (Assume all other endlock command strings are here) ...

        // === Notify Command ===
        "command.notify.description": "Toggles your AntiCheat notifications preference.",
        // ... (Assume all other notify command strings are here) ...

        // === XRayNotify Command ===
        "command.xraynotify.description": "Manage X-Ray ore mining notifications for yourself.",
        // ... (Assume all other xraynotify command strings are here) ...

        // === Unmute Command ===
        "command.unmute.description": "Unmutes a specified player.",
        // ... (Assume all other unmute command strings are here) ...

        // === Unban Command ===
        "command.unban.description": "Unbans a player. Note: Player must be online for this version.",
        // ... (Assume all other unban command strings are here) ...

        // === ResetFlags Command (also for ClearWarnings alias) ===
        "command.resetflags.description": "Resets all AntiCheat flags and violation data for a player.",
        "command.resetflags.usage": "§cUsage: {prefix}resetflags <playername>",
        "command.resetflags.success": "§aAll AntiCheat flags and violation data for {targetName} have been reset.",
        "command.resetflags.failNoData": "§cCould not retrieve data for {targetName}. No flags reset.",
        "command.resetflags.adminNotify": "Flags for {targetName} were reset by {adminName}.",
        // For ClearWarnings alias, if specific wording is desired (though functionality is same)
        "command.clearwarnings.description": "Clears all AntiCheat warnings (flags) for a player. Alias for resetflags.",
        "command.clearwarnings.success": "§aAll warnings (flags) and violation data for {targetName} have been cleared.",
        "command.clearwarnings.adminNotify": "Warnings for {targetName} were cleared by {adminName}."
        // Note: Usage for clearwarnings would be {prefix}clearwarnings <playername>, handled by command manager alias.
        // Player not found and fail messages can reuse resetflags or common keys.
    }
};

export function setCurrentLanguage(langCode) {
    if (translations[langCode]) {
        currentLanguage = langCode;
        console.log(`[LocalizationManager] Runtime language set to: ${langCode}`);
    } else {
        console.warn(`[LocalizationManager] Attempted to set runtime language to '${langCode}', which is not loaded. Current language remains '${currentLanguage}'.`);
    }
}

setCurrentLanguage(runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE);

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
