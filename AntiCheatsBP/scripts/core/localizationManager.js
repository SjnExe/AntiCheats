/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.7
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
        "common.status.enabled": "ENABLED", // Changed to uppercase for consistency with LOCKED/UNLOCKED
        "common.status.disabled": "DISABLED",// Changed to uppercase
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

        // === UI Manager ===
        "ui.adminPanel.title": "Admin Panel",
        // ... (All UI strings) ...

        // === Ban Command ===
        "command.ban.usage": "§cUsage: {prefix}ban <playername> [duration] [reason]",
        // ... (All ban command strings) ...

        // === Kick Command ===
        "command.kick.usage": "§cUsage: {prefix}kick <playername> [reason]",
        // ... (All kick command strings) ...

        // === Mute Command ===
        "command.mute.usage": "§cUsage: {prefix}mute <playername> [duration] [reason]",
        // ... (All mute command strings) ...

        // === SetLang Command ===
        "command.setlang.description": "Sets the server's default display language for AntiCheat messages.",
        // ... (All setlang command strings) ...

        // === WorldBorder Command ===
        "command.worldborder.help.header": "§b--- World Border Commands ---§r",
        // ... (All worldborder command strings) ...

        // === Vanish Command ===
        "command.vanish.description": "Toggles admin visibility and related effects. Optional mode 'silent' (default) or 'notify'.",
        // ... (All vanish command strings) ...

        // === TP (Teleport) Command ===
        "command.tp.description": "Teleports players or self to coordinates/players.",
        // ... (All tp command strings) ...

        // === InvSee Command ===
        "command.invsee.description": "Displays a read-only view of a player's inventory.",
        // ... (All invsee command strings) ...

        // === Gamemode Commands ===
        "command.gma.description": "Sets Adventure mode for self or [playername].",
        "command.gma.success.self": "§aYour game mode has been updated to Adventure.",
        "command.gma.success.other": "§aSuccessfully updated {targetPlayerName}'s game mode to Adventure.",

        "command.gmc.description": "Sets Creative mode for self or [playername].",
        "command.gmc.success.self": "§aYour game mode has been updated to Creative.",
        "command.gmc.success.other": "§aSuccessfully updated {targetPlayerName}'s game mode to Creative.",

        "command.gms.description": "Sets Survival mode for self or [playername].",
        "command.gms.success.self": "§aYour game mode has been updated to Survival.",
        "command.gms.success.other": "§aSuccessfully updated {targetPlayerName}'s game mode to Survival.",

        "command.gmsp.description": "Sets Spectator mode for self or [playername].",
        "command.gmsp.success.self": "§aYour game mode has been updated to Spectator.",
        "command.gmsp.success.other": "§aSuccessfully updated {targetPlayerName}'s game mode to Spectator.",

        // === NetherLock Command ===
        "command.netherlock.description": "Manages the lock state for the Nether dimension. Prevents non-admins from entering when locked.",
        "command.netherlock.status": "§eNether dimension lock status: {status}.",
        "command.netherlock.locked": "§cNether dimension is now LOCKED.§r Non-admins will be prevented from entering.",
        "command.netherlock.unlocked": "§aNether dimension is now UNLOCKED.§r All players can enter.",
        "command.netherlock.fail": "§cFailed to update Nether lock status.", // Kept specific for now.
        "command.netherlock.adminNotify.locked": "§cNether dimension was LOCKED by {adminName}.",
        "command.netherlock.adminNotify.unlocked": "§aNether dimension was UNLOCKED by {adminName}.",
        "command.netherlock.usage": "§cUsage: {prefix}netherlock <on|off|status>",

        // === EndLock Command ===
        "command.endlock.description": "Manages the lock state for the End dimension. Prevents non-admins from entering when locked.",
        "command.endlock.status": "§eThe End dimension lock status: {status}.",
        "command.endlock.locked": "§cThe End dimension is now LOCKED.§r Non-admins will be prevented from entering.",
        "command.endlock.unlocked": "§aThe End dimension is now UNLOCKED.§r All players can enter.",
        "command.endlock.fail": "§cFailed to update The End lock status.", // Kept specific for now.
        "command.endlock.adminNotify.locked": "§cThe End dimension was LOCKED by {adminName}.",
        "command.endlock.adminNotify.unlocked": "§aThe End dimension was UNLOCKED by {adminName}.",
        "command.endlock.usage": "§cUsage: {prefix}endlock <on|off|status>"
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
