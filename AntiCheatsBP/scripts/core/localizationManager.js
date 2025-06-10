/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.5
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
        "common.status.enabled": "enabled",
        "common.status.disabled": "disabled",
        "common.page": "Page {currentPage}/{totalPages}",
        "common.button.next": "Next",
        "common.button.previous": "Previous",
        "common.success": "§aSuccess!", // Generic success
        "common.fail": "§cOperation failed.", // Generic failure


        // === UI Manager ===
        "ui.adminPanel.title": "Admin Panel",
        // ... (All UI strings from previous step) ...

        // === Ban Command ===
        "command.ban.usage": "§cUsage: {prefix}ban <playername> [duration] [reason]",
        // ... (All ban command strings from previous step) ...

        // === Kick Command ===
        "command.kick.usage": "§cUsage: {prefix}kick <playername> [reason]",
        // ... (All kick command strings from previous step) ...

        // === Mute Command ===
        "command.mute.usage": "§cUsage: {prefix}mute <playername> [duration] [reason]",
        // ... (All mute command strings from previous step) ...

        // === SetLang Command ===
        "command.setlang.description": "Sets the server's default display language for AntiCheat messages.",
        // ... (All setlang command strings from previous step) ...

        // === WorldBorder Command ===
        "command.worldborder.help.header": "§b--- World Border Commands ---§r",
        // ... (All worldborder command strings from previous step) ...

        // === Vanish Command ===
        "command.vanish.description": "Toggles admin visibility and related effects. Optional mode 'silent' (default) or 'notify'.",
        "command.vanish.enabled.silent": "§7You are now vanished.",
        "command.vanish.enabled.notify": "§7You are now vanished (notify mode).",
        "command.vanish.disabled.silent": "§7You are no longer vanished.",
        "command.vanish.disabled.notify": "§7You are no longer vanished (notify mode).",
        "command.vanish.error.apply": "§cError applying vanish: {error}",
        "command.vanish.error.remove": "§cError removing vanish: {error}",
        "command.vanish.adminNotify.on": "{adminName} has vanished ({mode} mode).",
        "command.vanish.adminNotify.off": "{adminName} is no longer vanished ({mode} mode).",
        "command.vanish.fakeLeave": "§e{playerName} left the game.", // For notify mode
        "command.vanish.fakeJoin": "§e{playerName} joined the game.", // For notify mode

        // === TP (Teleport) Command ===
        "command.tp.description": "Teleports players or self to coordinates/players.",
        "command.tp.usage": "§cUsage: {prefix}tp <target_player | x> [destination_player | y] [z] [dimension]. Try {prefix}help tp.",
        "command.tp.error.playerToMoveNotFound": "§cPlayer to move \"{playerName}\" not found.",
        "command.tp.error.destinationPlayerNotFound": "§cDestination player \"{playerName}\" not found.",
        "command.tp.error.cannotTeleportToSelf": "§7Cannot teleport {playerName} to themselves this way.",
        "command.tp.error.invalidCoordinates": "§cInvalid coordinates for player teleport.",
        "command.tp.error.invalidDimension": "§cInvalid dimension \"{dimensionName}\". Using current or target's current.",
        "command.tp.error.lookupUtilityNotAvailable": "§cTeleport command error: Player lookup utility not available.",
        "command.tp.error.failed": "§cTeleportation failed: {errorMessage}",
        "command.tp.success.playerToPlayer": "§aSuccessfully teleported {playerToMoveName} to player {destinationPlayerName}.",
        "command.tp.success.playerToCoords": "§aSuccessfully teleported {playerToMoveName} to coordinates {x}, {y}, {z}{dimensionInfo}.",
        "command.tp.notifyTarget.byAdmin": "§7You were teleported by {adminName} to {destinationDescription}.",
        "command.tp.dimensionIn": " in {dimensionName}",

        // === InvSee Command ===
        "command.invsee.description": "Displays a read-only view of a player's inventory.",
        "command.invsee.usage": "§cUsage: {prefix}invsee <playername>",
        "command.invsee.error.notFound": "§cPlayer \"{playerName}\" not found.",
        "command.invsee.error.noInventory": "§cCould not access inventory for {playerName}.",
        "command.invsee.form.title": "Inventory: {playerName}",
        "command.invsee.form.bodyHeader": "§lInventory of {playerName}:§r\n",
        "command.invsee.form.itemEntry": "§eSlot {slotNum}:§r {itemName} x{itemAmount}{nameTag}{durability}{enchants}{lore}",
        "command.invsee.form.itemEntry.nameTag": " | Name: \"{nameTag}\"",
        "command.invsee.form.itemEntry.durability": " | Dur: {currentDurability}/{maxDurability}",
        "command.invsee.form.itemEntry.enchants": " | Ench: [{enchantsString}]",
        "command.invsee.form.itemEntry.lore": " | Lore: [\"{loreString}\"]",
        "command.invsee.form.emptyInventory": "Inventory is empty.\n"
    }
    // Add other languages here, e.g., "es_ES": { ... }
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
