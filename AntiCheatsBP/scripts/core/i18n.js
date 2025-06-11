/**
 * @file AntiCheatsBP/scripts/core/i18n.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.11
 */

import { editableConfigValues as runTimeConfig } from '../config.js';

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

export const translations = {
    "en_US": {
        // === General Messages (from config.js) ===
        "message.welcome": "Welcome, {playerName}, to our amazing server! We're glad to have you.",
        // ... (other general messages) ...

        // === Common ===
        "common.button.close": "Close",
        "common.button.back": "Back",
        "common.button.confirm": "Confirm",
        "common.button.cancel": "Cancel",
        "common.error.noPermissionCommand": "You do not have permission to use this command.",
        "common.error.invalidPlayer": "Player \"{targetName}\" not found.",
        "common.error.playerNotFoundOnline": "§cPlayer '{playerName}' not found or is not online.",
        "common.error.generic": "§cAn unexpected error occurred.",
        "common.status.enabled": "ENABLED",
        "common.status.disabled": "DISABLED",
        "common.status.locked": "§cLOCKED",
        "common.status.unlocked": "§aUNLOCKED",
        "common.boolean.yes": "Yes",
        "common.boolean.no": "No",
        "common.value.none": "None", // Replaces command.myflags.value.none
        "common.value.notApplicable": "N/A", // Replaces command.myflags.value.notApplicable
        "common.value.permanent": "Permanent",
        // ... (other common strings) ...

        // === Command Specific Errors / Usage ===
        "command.error.specifyPlayer": "§cPlease specify a player name.", // Generic enough for TPA too
        "command.error.gamemodeSettingFailed": "§cError setting game mode for {playerName}.",
        "command.error.invalidArgOnOffStatus": "§cInvalid argument. Use 'on', 'off', or 'status'.",
        "command.error.invalidArgOnOffStatusToggle": "§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.",

        // === TPA System ===
        "command.tpa.systemDisabled": "§cThe TPA system is currently disabled.",
        "command.tpa.description": "Request to teleport to another player.",
        "command.tpa.usage": "§cUsage: {prefix}tpa <playerName>",
        "command.tpa.error.selfRequest": "§cYou cannot send a TPA request to yourself.",
        "command.tpa.error.targetDisabled": "§cPlayer \"{targetName}\" is not currently accepting TPA requests.",
        "command.tpa.error.existingRequest": "§cYou already have an active TPA request with \"{targetName}\".",
        "command.tpa.error.cooldown": "§cYou must wait {remaining} more seconds before sending another TPA request.",
        "command.tpa.requestSent": "§aTPA request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
        "command.tpa.requestReceived": "§e{requesterName} has requested to teleport to you. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
        "command.tpa.failToSend": "§cCould not send TPA request. There might be an existing request or other issue.",

        "command.tpahere.description": "Request another player to teleport to your location.",
        "command.tpahere.usage": "§cUsage: {prefix}tpahere <playerName>",
        "command.tpahere.error.selfRequest": "§cYou cannot send a TPA Here request to yourself.", // Can reuse tpa.error.selfRequest if wording is same
        "command.tpahere.requestSent": "§aTPA Here request sent to \"{targetName}\". They have {timeout} seconds to accept. Type {prefix}tpacancel to cancel.",
        "command.tpahere.requestReceived": "§e{requesterName} has requested you to teleport to them. Use {prefix}tpaccept {requesterName} or {prefix}tpacancel {requesterName}.",
        "command.tpahere.failToSend": "§cCould not send TPA Here request. There might be an existing request or other issue.",

        "command.tpaccept.description": "Accepts an incoming TPA request.",
        "command.tpaccept.usage": "§cUsage: {prefix}tpaccept [playerName]",
        "command.tpaccept.error.noPending": "§cYou have no pending TPA requests.",
        "command.tpaccept.error.noRequestFrom": "§cNo pending TPA request found from \"{playerName}\".",
        "command.tpaccept.error.pendingFromList": "§7Pending requests are from: {playerList}",
        "command.tpaccept.error.couldNotFind": "§cCould not find a suitable TPA request to accept. Type {prefix}tpastatus to see your requests.",
        "command.tpaccept.success": "§aAccepted TPA request from \"{playerName}\". Teleport will occur in {warmupSeconds} seconds if the teleporting player avoids damage and stays online.",
        "command.tpaccept.fail": "§cCould not accept TPA request from \"{playerName}\". It might have expired or been cancelled.",
        "command.tpaccept.teleportWarmupCancelled": "§cTeleport cancelled for TPA request from {requesterName} to {targetName} because {reason}.", // reason: "player moved", "player took damage", "player disconnected"
        "command.tpaccept.teleportSuccess": "§aTeleport successful for TPA request from {requesterName} to {targetName}.",
        "command.tpaccept.teleportFail": "§cTeleport failed for TPA request from {requesterName} to {targetName}. Reason: {reason}.", // reason: "player offline", "internal error"
        "command.tpaccept.notifyRequester.accepted": "§a{targetName} accepted your TPA request. Teleporting in {warmupSeconds}s. Don't move or take damage!",
        "command.tpaccept.notifyRequester.teleporting": "§eTeleporting now...",
        "command.tpaccept.notifyRequester.cancelled": "§cYour TPA request to {targetName} was cancelled because {reason}.",
        "command.tpaccept.notifyRequester.failed": "§cYour TPA request to {targetName} failed. Reason: {reason}.",
        "command.tpaccept.warmup.dontMove": "§eTeleporting in {seconds}s... Don't move or take damage!",


        "command.tpacancel.description": "Cancels or declines a TPA request.",
        "command.tpacancel.usage": "§cUsage: {prefix}tpacancel [playerName]",
        "command.tpacancel.success.specific": "§aSuccessfully cancelled/declined TPA request involving \"{playerName}\".",
        "command.tpacancel.success.all": "§aCancelled/declined {count} TPA request(s).",
        "command.tpacancel.error.noRequests": "§cYou have no active TPA requests to cancel or decline.",
        "command.tpacancel.error.noSpecificRequest": "§cNo active or pending TPA request found with \"{playerName}\" that can be cancelled.",
        "command.tpacancel.error.noneCancellable": "§cNo active requests were found in a state that could be cancelled/declined.",
        "command.tpacancel.notifyOther.cancelled": "§eTPA request involving \"{otherPlayerName}\" was cancelled by {cancellingPlayerName}.",


        "command.tpastatus.description": "Manage or view your TPA request availability.",
        "command.tpastatus.usage": "§cUsage: {prefix}tpastatus [on|off|status]",
        "command.tpastatus.nowEnabled": "§aYou are now accepting TPA requests.",
        "command.tpastatus.nowDisabled": "§cYou are no longer accepting TPA requests.",
        "command.tpastatus.nowDisabledDeclined": "§e{count} pending incoming TPA request(s) were automatically declined.",
        "command.tpastatus.current.enabled": "§aYou are currently accepting TPA requests.",
        "command.tpastatus.current.disabled": "§cYou are currently not accepting TPA requests.",
        "command.tpastatus.error.invalidOption": "§cInvalid option. Usage: {prefix}tpastatus [on|off|status]",
        "command.tpastatus.notifyRequester.declined": "§e{targetPlayerName} is no longer accepting TPA requests; your request was automatically declined.",

        // === Help Command ===
        "help.specific.header": "§l§b--- Help: {prefix}{commandName} ---",
        "help.specific.syntax": "§eSyntax:§r {prefix}{commandName} {syntaxArgs}",
        "help.specific.description": "§bDescription:§r {description}", // Template for description
        "help.specific.permission": "§7Permission: {permLevelName} (Level {permissionLevel})",
        "help.specific.notFoundOrNoPermission": "§cCommand \"{commandName}\" not found or you do not have permission to view its details. Type {prefix}help for a list of available commands.",
        "help.error.unknownCommand": "§cUnknown command: \"{commandName}\". Type {prefix}help for a list of available commands.",
        "help.list.header": "§l§bAvailable Commands (prefix: {prefix}):§r",
        "help.list.noCommandsAvailable": "§7No commands available to you at this time.",
        "help.list.category.general": "--- General Player Commands ---",
        "help.list.category.tpa": "--- TPA Commands ---",
        "help.list.category.moderation": "--- Moderation Commands ---",
        "help.list.category.administrative": "--- Administrative Commands ---",
        "help.list.category.owner": "--- Owner Commands ---",
        "help.descriptionOverride.panel": "Opens the Admin/User Interface Panel.",
        "help.descriptionOverride.ui": "Alias for !panel. Opens the Admin/User Interface Panel.",

        // === Rules Command ===
        "command.rules.description": "Displays the server rules.",
        "command.rules.ui.title": "Server Rules",
        "command.rules.noRulesConfigured": "No server rules are currently configured. Please check back later!",
        // Note: Button text for rules can use common.button.close

        // === Version Command ===
        "command.version.description": "Displays addon version.",
        "command.version.message": "§7AntiCheat Addon Version: §e{version}",

        // === CopyInv Command ===
        "command.copyinv.description": "Copies another player's inventory to your own.",
        "command.copyinv.error.playerLookupUnavailable": "§cCommand error: Player lookup utility not available.",
        "command.copyinv.usage": "§cUsage: {prefix}copyinv <playername>",
        // "command.copyinv.error.targetNotFound": "§cPlayer \"{targetPlayerName}\" not found." // Covered by common.error.invalidPlayer
        "command.copyinv.error.selfCopy": "§cYou cannot copy your own inventory.",
        "command.copyinv.error.inventoryAccess": "§cCould not access inventories.",
        "command.copyinv.confirm.title": "Confirm Inventory Copy",
        "command.copyinv.confirm.body": "Overwrite YOUR inventory with a copy of {targetPlayerName}'s inventory? THIS CANNOT BE UNDONE.",
        "command.copyinv.confirm.toggle": "Yes, I confirm.",
        "command.copyinv.cancelled": "§7Inventory copy cancelled.",
        "command.copyinv.success": "§aCopied {targetPlayerName}'s inventory ({itemCount} items/stacks). Your inventory overwritten.",
        "command.copyinv.log": "Copied {itemCount} items.",
        "command.copyinv.notifyAdmins": "{adminName} copied {targetPlayerName}'s inventory.",
        // "command.copyinv.error.generic": "§cError copying inventory: {error}" // Covered by common.error.generic if not passing specific error string

        // === MyFlags Command ===
        "command.myflags.description": "Shows your own current flag status.",
        "command.myflags.header": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r",
        "command.myflags.flagEntry": " §7- {flagName}: §e{count} §7(Last: {lastDetectionTime})\n",
        "command.myflags.noFlags": "§7You have no active flags.",
        "command.myflags.noSpecificFlags": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0).",
        "command.myflags.noData": "§7No flag data found for you, or you have no flags.",
        // "command.myflags.value.none": "None", // Moved to common.value.none
        // "command.myflags.value.notApplicable": "N/A", // Moved to common.value.notApplicable

        // === Inspect Command ===
        "command.inspect.description": "Inspects a player's AntiCheat data summary.",
        "command.inspect.usage": "§cUsage: {prefix}inspect <playername>",
        "command.inspect.error.notFoundOrNoData": "§cPlayer \"{playerName}\" not found or no AntiCheat data available.",
        "command.inspect.header": "§e--- AntiCheat Data for {playerName} ---",
        "command.inspect.playerId": "§fPlayer ID: §7{id}",
        "command.inspect.watchedStatus": "§fIs Watched: §7{status}",
        "command.inspect.totalFlags": "§fTotal Flags: §c{count}",
        "command.inspect.lastFlagType": "§fLast Flag Type: §7{type}",
        "command.inspect.flagsByTypeHeader": "§fFlags by type:",
        "command.inspect.flagEntry": "  §f- {flagKey}: §c{count} §7(Last: {timestamp})",
        "command.inspect.noSpecificFlags": "    §7No specific flag types recorded.",
        "command.inspect.mutedYes": "§fMuted: §cYes (Expires: {expiryDate}, Reason: {reason})",
        "command.inspect.mutedNo": "§fMuted: §aNo",
        "command.inspect.bannedYes": "§fBanned: §cYes (Expires: {expiryDate}, Reason: {reason})",
        "command.inspect.bannedNo": "§fBanned: §aNo",
        "command.inspect.noData": "§7No AntiCheat data found for this player (they might not have triggered any checks or joined recently).",

        // === TestNotify Command ===
        "command.testnotify.description": "Sends a test notification to all online admins.",
        "command.testnotify.success": "§aTest notification sent to online admins/owners.",
        "command.testnotify.adminNotification.message": "§6This is a test notification from {playerName} via the AntiCheat system.",
        "command.testnotify.error.unavailable": "§cError: Notification utility not available."

        // ... (Other command strings) ...
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
