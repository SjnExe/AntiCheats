/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.4
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

        // === UI Manager ===
        "ui.adminPanel.title": "Admin Panel",
        "ui.adminPanel.body": "Welcome, {playerName}. Select an action:",
        "ui.adminPanel.button.viewPlayers": "View Online Players",
        "ui.adminPanel.button.inspectPlayerText": "Inspect Player (Text)",
        "ui.adminPanel.button.resetFlagsText": "Reset Flags (Text)",
        "ui.adminPanel.button.listWatched": "List Watched Players",
        "ui.adminPanel.button.serverManagement": "Server Management",
        "ui.adminPanel.button.editConfig": "Edit Configuration",
        "ui.adminPanel.error.noAccess": "§7Please use the `!uinfo` command to access player-specific information and other features.",
        "ui.adminPanel.error.generic": "§cAn error occurred displaying the admin panel.",
        "ui.adminPanel.error.invalidSelection": "§cInvalid selection or panel closed.",

        "ui.normalPanel.title": "Info Panel",
        "ui.normalPanel.body": "Welcome, {playerName}. View your info or server help.",
        "ui.normalPanel.button.myStats": "My Stats (via !uinfo)",
        "ui.normalPanel.button.serverRules": "Server Rules (via !uinfo)",
        "ui.normalPanel.button.helpLinks": "Helpful Links & Tips (via !uinfo)",
        "ui.normalPanel.info.useUinfo": "§7Please use the `!uinfo` command and select '{option}'.",


        "ui.onlinePlayers.title": "Online Players ({playerCount})",
        "ui.onlinePlayers.body": "Select a player to view actions or information.",
        "ui.onlinePlayers.button.playerEntry": "{playerName} (Flags: {flagCount})",
        "ui.onlinePlayers.noPlayers": "No players currently online.",
        "ui.onlinePlayers.error.selectedPlayerNotFound": "§cSelected player not found (may have logged off).",
        "ui.onlinePlayers.error.generic": "§cAn error occurred displaying the player list.",
        "ui.button.backToAdminPanel": "Back to Admin Panel", // Used in multiple forms

        "ui.playerActions.title": "Actions for {targetPlayerName}",
        "ui.playerActions.body": "Player Flags: {flagCount}. Watched: {isWatched}.",
        "ui.playerActions.button.viewFlags": "View Detailed Info/Flags",
        "ui.playerActions.button.viewInventory": "View Inventory (InvSee)",
        "ui.playerActions.button.teleportTo": "Teleport to Player",
        "ui.playerActions.button.teleportHere": "Teleport Player Here",
        "ui.playerActions.button.kick": "Kick Player",
        "ui.playerActions.button.freeze": "Freeze Player",
        "ui.playerActions.button.unfreeze": "Unfreeze Player",
        "ui.playerActions.button.mute": "Mute Player",
        "ui.playerActions.button.unmute": "Unmute Player",
        "ui.playerActions.button.unmutePermanent": "Unmute Player (Permanent)",
        "ui.playerActions.button.unmuteTimed": "Unmute Player (exp. {time})",
        "ui.playerActions.button.ban": "Ban Player",
        "ui.playerActions.button.resetFlags": "Reset Player Flags",
        "ui.playerActions.button.clearInventory": "Clear Inventory",
        "ui.playerActions.button.viewSystemInfo": "View System Info",
        "ui.playerActions.button.backToList": "Back to Player List",
        "ui.playerActions.kick.title": "Kick {targetPlayerName}",
        "ui.playerActions.kick.reasonPrompt": "Kick Reason:",
        "ui.playerActions.kick.reasonPlaceholder": "Enter reason",
        "ui.playerActions.kick.cancelled": "§7Kick action cancelled.",
        "ui.playerActions.mute.title": "Mute {targetPlayerName}",
        "ui.playerActions.mute.durationPrompt": "Duration (e.g., 5m, 1h, perm):",
        "ui.playerActions.mute.durationPlaceholder": "5m",
        "ui.playerActions.mute.reasonPrompt": "Reason:",
        "ui.playerActions.mute.reasonPlaceholder": "Enter reason",
        "ui.playerActions.mute.cancelled": "§7Mute action cancelled.",
        "ui.playerActions.ban.title": "Ban {targetPlayerName}",
        "ui.playerActions.ban.durationPrompt": "Duration (e.g., 1d, 2w, perm):",
        "ui.playerActions.ban.durationPlaceholder": "1d",
        "ui.playerActions.ban.reasonPrompt": "Reason:",
        "ui.playerActions.ban.reasonPlaceholder": "Enter reason",
        "ui.playerActions.ban.cancelled": "§7Ban action cancelled.",
        "ui.playerActions.clearInventory.confirmTitle": "Confirm Clear Inventory",
        "ui.playerActions.clearInventory.confirmBody": "Are you sure you want to clear {targetPlayerName}'s main inventory? This action cannot be undone.",
        "ui.playerActions.clearInventory.confirmToggle": "Yes, clear main inventory.",
        "ui.playerActions.clearInventory.cancelled": "§7Clear Inventory action cancelled.",
        "ui.playerActions.clearInventory.success": "§aSuccessfully cleared {targetPlayerName}'s inventory.",
        "ui.playerActions.clearInventory.fail": "§cCould not access {targetPlayerName}'s inventory component.",
        "ui.playerActions.teleport.toPlayerSuccess": "§aSuccessfully teleported to {targetPlayerName}.",
        "ui.playerActions.teleport.playerToAdminSuccess": "§aSuccessfully teleported {targetPlayerName} to your location.",
        "ui.playerActions.teleport.playerToAdminNotifyTarget": "§7You have been teleported by an admin.",
        "ui.playerActions.teleport.error": "§cError teleporting: {errorMessage}",
        "ui.playerActions.error.generic": "§cAn error occurred while displaying player actions.",

        "ui.inspectPlayerForm.title": "Inspect Player Data (Text)",
        "ui.inspectPlayerForm.textField.label": "Enter Player Name:",
        "ui.inspectPlayerForm.textField.placeholder": "TargetPlayerName",

        "ui.resetFlagsForm.title": "Reset Player Flags (Text Entry)",
        "ui.resetFlagsForm.textField.label": "Enter Player Name to Reset Flags:",
        "ui.resetFlagsForm.textField.placeholder": "TargetPlayerName",
        "ui.resetFlagsForm.toggle.label": "Confirm Reset (Cannot be undone!)",
        "ui.resetFlagsForm.cancelled": "§7Flag reset cancelled.",
        "ui.resetFlagsForm.error.nameEmpty": "§cPlayer name cannot be empty.",
        "ui.resetFlagsForm.error.generic": "§cAn error occurred during the reset flags process.",

        "ui.watchedPlayers.title": "Watched Players",
        "ui.watchedPlayers.header": "§e--- Watched Players ---",
        "ui.watchedPlayers.playerEntry": "§f- {playerName}",
        "ui.watchedPlayers.noPlayers": "§7No players are currently being watched.",
        "ui.watchedPlayers.button.ok": "OK",

        "ui.detailedFlags.title": "Detailed Flags for {targetPlayerName}",
        "ui.detailedFlags.flagEntry": "Flag Type: {flagType}, Count: {count}, Last: {timestamp}",
        "ui.detailedFlags.noFlags": "No flags recorded for this player.",

        "ui.serverManagement.title": "Server Management",
        "ui.serverManagement.body": "Select an administrative action:",
        "ui.serverManagement.button.systemInfo": "View System Info",
        "ui.serverManagement.button.actionLogs": "View General Action Logs",
        "ui.serverManagement.button.modLogs": "View Moderation Logs",
        "ui.serverManagement.button.clearChat": "Clear Chat for All Players",
        "ui.serverManagement.button.lagClear": "Lag Clear (Ground Items)",
        "ui.serverManagement.button.editConfig": "Edit Configuration", // Same as ui.adminPanel.button.editConfig
        "ui.serverManagement.button.backToAdminPanel": "Back to Main Admin Panel", // Same as ui.button.backToAdminPanel
        "ui.serverManagement.clearChat.confirmTitle": "Confirm Clear Chat",
        "ui.serverManagement.clearChat.confirmBody": "Are you sure you want to clear global chat for all players?",
        "ui.serverManagement.clearChat.confirmToggle": "Yes, clear global chat.",
        "ui.serverManagement.clearChat.cancelled": "§7Clear chat action cancelled.",
        "ui.serverManagement.clearChat.success": "§aGlobal chat has been cleared.",
        "ui.serverManagement.lagClear.confirmTitle": "Confirm Lag Clear",
        "ui.serverManagement.lagClear.confirmBody": "Are you sure you want to remove ALL dropped item entities from the server (Overworld, Nether, End)? This action cannot be undone.",
        "ui.serverManagement.lagClear.confirmToggle": "Yes, remove all dropped items.",
        "ui.serverManagement.lagClear.cancelled": "§7Lag clear action cancelled.",
        "ui.serverManagement.lagClear.success": "§aRemoved {count} dropped item entities from the server.",
        "ui.serverManagement.lagClear.fail": "§cFailed to execute lag clear: {error}",
        "ui.serverManagement.error.generic": "§cAn error occurred displaying server management options.",
        "ui.serverManagement.error.invalidSelection": "§cInvalid selection from server management.",


        "ui.systemInfo.title": "System Information",
        "ui.systemInfo.bodyNotImplemented": "System information display is not yet fully implemented.\nMore details will be available in a future update.",
        "ui.systemInfo.entry.acVersion": "AC Version: {version}",
        "ui.systemInfo.entry.mcVersion": "MC Version: {version}",
        "ui.systemInfo.entry.serverTime": "Server Time: {time}",
        "ui.systemInfo.entry.onlinePlayers": "Online Players: {onlineCount}/{maxCount}",
        "ui.systemInfo.entry.totalPlayerData": "Total Player Data Entries: {count}",
        "ui.systemInfo.entry.watchedPlayers": "Watched Players: {count}",
        "ui.systemInfo.entry.mutedSession": "Muted (Session): {count}",
        "ui.systemInfo.entry.mutedPersistent": "Muted (Persistent): {count}",
        "ui.systemInfo.entry.bannedPersistent": "Banned (Persistent): {count}",
        "ui.systemInfo.entry.activeWorldBorders": "Active World Borders: {count}",
        "ui.systemInfo.entry.logManagerEntries": "LogManager Entries: {count}",
        "ui.systemInfo.entry.reportManagerEntries": "ReportManager Entries: {count}",
        "ui.systemInfo.button.backToServerMgmt": "Back to Server Management",

        "ui.actionLogs.title": "Action Logs (All - Latest)",
        "ui.actionLogs.noLogs": "No action logs found.",
        "ui.actionLogs.bodyHeader": "", // Can be empty if logs start immediately
        "ui.actionLogs.logEntry": "§7[{timestamp}] §e{adminNameOrPlayer}§r {actionType} §b{targetNameOrEmpty}§r{duration}{reason}{details}",
        "ui.actionLogs.logEntry.durationPrefix": " (§7Dur: ",
        "ui.actionLogs.logEntry.reasonPrefix": " (§7Reason: ",
        "ui.actionLogs.logEntry.detailsPrefix": " (§7Details: ",
        "ui.actionLogs.logEntry.suffix": "§r)",
        "ui.actionLogs.footer.showingLatest": "\n§o(Displaying latest {count} logs. Older logs may exist.)§r",
        "ui.actionLogs.body.empty": "No logs to display.",
        "ui.actionLogs.button.backToServerMgmt": "Back to Server Management",

        "ui.modLogSelect.title": "Select Moderation Log Type",
        "ui.modLogSelect.body.all": "View all moderation logs or filter by player.",
        "ui.modLogSelect.body.filtered": "View logs filtered by: §e{filterName}§r",
        "ui.modLogSelect.button.banUnban": "View Ban/Unban Logs",
        "ui.modLogSelect.button.muteUnmute": "View Mute/Unmute Logs",
        "ui.modLogSelect.button.filterByName": "Filter by Player Name",
        "ui.modLogSelect.button.clearFilter": "Clear Filter ({filterName})",
        "ui.modLogSelect.button.backToServerMgmt": "Back to Server Management",
        "ui.modLogSelect.filterModal.title": "Filter Logs by Player Name",
        "ui.modLogSelect.filterModal.textField.label": "Enter Player Name (leave blank for no filter):",
        "ui.modLogSelect.filterModal.textField.placeholder": "PlayerName",
        "ui.modLogSelect.filterModal.filterCleared": "§aPlayer name filter cleared.",
        "ui.modLogSelect.filterModal.filterSet": "§aLog filter set to: {filterName}",
        "ui.modLogSelect.filterModal.filterBlank": "§7Filter input was blank. No filter applied.",
        "ui.modLogSelect.error.generic": "§cError displaying log type selection.",

        "ui.logViewer.title.banUnban": "Ban/Unban Logs",
        "ui.logViewer.title.muteUnmute": "Mute/Unmute Logs",
        "ui.logViewer.title.filtered": "{logTypeName} for \"{filterName}\"",
        "ui.logViewer.noLogs": "No matching logs found with current filters.",
        "ui.logViewer.button.backToLogSelect": "Back to Log Type Selection",

        "ui.configEditor.title": "Configuration Editor",
        "ui.configEditor.body": "Select a configuration key to edit:",
        "ui.configEditor.button.format": "{key} ({type}): {value}",
        "ui.configEditor.button.formatTruncated": "{key} ({type}): {value}...",
        "ui.configEditor.button.objectPlaceholder": "{Object}",
        "ui.configEditor.button.backToAdminPanel": "Back to Admin Panel", // Re-use from onlinePlayers
        "ui.configEditor.error.ownerOnly": "§cPermission denied. This feature is owner-only.",
        "ui.configEditor.error.nonArrayObject": "§cEditing for non-array objects ('{keyName}') is not supported via this UI.",
        "ui.configEditor.error.invalidSelection": "§cInvalid selection from config edit form.",
        "ui.configEditor.error.generic": "§cAn error occurred displaying the configuration editor.",

        "ui.configEditor.valueInput.title": "Edit: {keyName}",
        "ui.configEditor.valueInput.boolean.label": "{keyName}", // Toggle label
        "ui.configEditor.valueInput.string.label": "{keyName}",
        "ui.configEditor.valueInput.string.placeholder": "Enter new string value",
        "ui.configEditor.valueInput.number.label": "{keyName}",
        "ui.configEditor.valueInput.number.placeholder": "Enter new number value",
        "ui.configEditor.valueInput.array.label": "{keyName}",
        "ui.configEditor.valueInput.array.placeholder": "Enter new array (JSON format, e.g., [\"val1\",\"val2\"])",
        "ui.configEditor.valueInput.error.typeUnknown": "§cUnknown configuration type '{type}' for key '{keyName}'.",
        "ui.configEditor.valueInput.error.updateFailed": "§cFailed to update {keyName}. Reason: {failureReason}",
        "ui.configEditor.valueInput.error.updateFailedInternal": "§cFailed to update {keyName}. The new value might be invalid or of the wrong type.",
        "ui.configEditor.valueInput.error.jsonFormat": "Invalid JSON format: {errorMessage}",
        "ui.configEditor.valueInput.error.notAnArray": "Invalid input: Not a valid JSON array.",
        "ui.configEditor.valueInput.error.notANumber": "Invalid input: Not a number.",
        "ui.configEditor.valueInput.success": "§aSuccessfully updated {keyName} to: {newValue}",
        "ui.configEditor.valueInput.noChange": "§7Value for {keyName} remains unchanged.",
        "ui.configEditor.valueInput.error.generic": "§cAn error occurred while editing {keyName}.",

        // Panel Command
        "command.panel.error.uiManagerUnavailable": "§cUI Manager or its main panel function is not available. Please contact an administrator."

        // ... (other en_US strings from previous steps)
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
