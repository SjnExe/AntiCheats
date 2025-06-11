/**
 * @file AntiCheatsBP/scripts/core/i18n.js
 * Manages localized strings for the AntiCheat system.
 * @version 1.0.12
 */

import { editableConfigValues as runTimeConfig } from '../config.js';

const DEFAULT_LANGUAGE = "en_US";
let currentLanguage = runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE;

export const translations = {
    "en_US": {
        // === General Messages (from config.js) ===
        "message.welcome": "Welcome, {playerName}, to our amazing server! We're glad to have you.",
        "message.deathCoords": "§7You died at X: {x}, Y: {y}, Z: {z} in dimension {dimensionId}.",
        "message.combatLogAdminNotify": "§c[CombatLog] §e{playerName}§c disconnected {timeSinceCombat}s after being in combat! Flags: +{incrementAmount}",


        // === Common ===
        "common.button.close": "Close",
        "common.button.back": "Back",
        "common.button.confirm": "Confirm",
        "common.button.cancel": "Cancel",
        "common.error.noPermissionCommand": "You do not have permission to use this command.",
        "common.error.invalidPlayer": "Player \"{targetName}\" not found.",
        "common.error.playerNotFoundOnline": "§cPlayer '{playerName}' not found or is not online.",
        "common.error.generic": "§cAn unexpected error occurred.",
        "common.error.genericForm": "An error occurred while displaying this form.",
        "common.error.commandModuleNotFound": "§cError: Command module '{moduleName}' not found or failed to load.",
        "common.error.nameEmpty": "§cName cannot be empty.",
        "common.status.enabled": "ENABLED",
        "common.status.disabled": "DISABLED",
        "common.status.locked": "§cLOCKED",
        "common.status.unlocked": "§aUNLOCKED",
        "common.boolean.yes": "Yes",
        "common.boolean.no": "No",
        "common.value.none": "None",
        "common.value.notApplicable": "N/A",
        "common.value.permanent": "Permanent",
        "common.value.unknown": "Unknown",
        "common.value.noReasonProvided": "No reason provided.",


        // === Command Specific Errors / Usage ===
        "command.error.specifyPlayer": "§cPlease specify a player name.",
        "command.error.gamemodeSettingFailed": "§cError setting game mode for {playerName}.",
        "command.error.invalidArgOnOffStatus": "§cInvalid argument. Use 'on', 'off', or 'status'.",
        "command.error.invalidArgOnOffStatusToggle": "§cInvalid argument. Use 'on', 'off', 'toggle', or 'status'.",

        // === TPA System (Commands) ===
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
        "command.tpahere.error.selfRequest": "§cYou cannot send a TPA Here request to yourself.",
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
        "command.tpaccept.teleportWarmupCancelled": "§cTeleport cancelled for TPA request from {requesterName} to {targetName} because {reason}.",
        "command.tpaccept.teleportSuccess": "§aTeleport successful for TPA request from {requesterName} to {targetName}.",
        "command.tpaccept.teleportFail": "§cTeleport failed for TPA request from {requesterName} to {targetName}. Reason: {reason}.",
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
        "help.specific.description": "§bDescription:§r {description}",
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

        // === Version Command ===
        "command.version.description": "Displays addon version.",
        "command.version.message": "§7AntiCheat Addon Version: §e{version}",

        // === CopyInv Command ===
        "command.copyinv.description": "Copies another player's inventory to your own.",
        "command.copyinv.error.playerLookupUnavailable": "§cCommand error: Player lookup utility not available.",
        "command.copyinv.usage": "§cUsage: {prefix}copyinv <playername>",
        "command.copyinv.error.selfCopy": "§cYou cannot copy your own inventory.",
        "command.copyinv.error.inventoryAccess": "§cCould not access inventories.",
        "command.copyinv.confirm.title": "Confirm Inventory Copy",
        "command.copyinv.confirm.body": "Overwrite YOUR inventory with a copy of {targetPlayerName}'s inventory? THIS CANNOT BE UNDONE.",
        "command.copyinv.confirm.toggle": "Yes, I confirm.",
        "command.copyinv.cancelled": "§7Inventory copy cancelled.",
        "command.copyinv.success": "§aCopied {targetPlayerName}'s inventory ({itemCount} items/stacks). Your inventory overwritten.",
        "command.copyinv.log": "Copied {itemCount} items.",
        "command.copyinv.notifyAdmins": "{adminName} copied {targetPlayerName}'s inventory.",

        // === MyFlags Command ===
        "command.myflags.description": "Shows your own current flag status.",
        "command.myflags.header": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r",
        "command.myflags.flagEntry": " §7- {flagName}: §e{count} §7(Last: {lastDetectionTime})\n",
        "command.myflags.noFlags": "§7You have no active flags.",
        "command.myflags.noSpecificFlags": "§7Your current flags: §eTotal={totalFlags}§7. Last type: §e{lastFlagType}§r\n§7(No specific flag type details available with counts > 0).",
        "command.myflags.noData": "§7No flag data found for you, or you have no flags.",

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
        "command.testnotify.error.unavailable": "§cError: Notification utility not available.",

        // === Check Violation Details ===
        "check.invalidSprint.condition.blindness": "Blindness",
        "check.invalidSprint.condition.sneaking": "Sneaking",
        "check.invalidSprint.condition.riding": "Riding Entity",
        "check.inventoryMod.details.switchAndUseSameTick": "Item used in the same tick as hotbar slot change",
        "check.inventoryMod.details.movedWhileLocked": "Inventory item moved/changed (slot {slotNum}) while {action}",
        "check.inventoryMod.action.usingConsumable": "using consumable",
        "check.inventoryMod.action.chargingBow": "charging bow",
        "check.flatRotation.reason.staticPitchYaw": "Static Pitch & Yaw",
        "check.flatRotation.reason.staticPitch": "Static Pitch",
        "check.flatRotation.reason.staticYaw": "Static Yaw",
        "check.flatRotation.reason.flatHorizontal": "Flat Horizontal Pitch Range",
        "check.flatRotation.reason.flatDownward": "Flat Downward Pitch Range",
        "check.nameSpoof.reason.lengthExceeded": "NameTag length limit exceeded ({currentLength}/{maxLength})",
        "check.nameSpoof.reason.disallowedChars": "NameTag contains disallowed character(s) (e.g., '{char}')",
        "check.nameSpoof.reason.rapidChange": "NameTag changed too rapidly (within {interval} ticks, min is {minInterval}t)",
        "check.pistonLag.details.activationRate": "Piston at {x},{y},{z} in {dimensionName} activated {rate} times/sec over {duration}s.",
        "check.clientInfo.renderDistance.details": "Reported: {reportedDistance}, Max: {maxAllowed}",
        "check.netherRoof.details.onRoof": "Player on Nether roof at Y: {detectedY} (Threshold: {threshold})",
        "check.noSlow.action.eatingDrinking": "Eating/Drinking",
        "check.noSlow.action.chargingBow": "Charging Bow",
        "check.noSlow.action.usingShield": "Using Shield",
        "check.noSlow.action.sneaking": "Sneaking",

        // === PlayerDataManager ===
        "playerData.ban.kickHeader": "§cYou are banned from this server.",
        "playerData.ban.kickBannedBy": "§fBanned by: §e{adminName}",
        "playerData.ban.kickReason": "§fReason: §e{reason}",
        "playerData.ban.kickExpires": "§fExpires: §e{expiryDate}",
        "playerData.ban.kickDiscord": "§fDiscord: §b{discordLink}",
        "playerData.mute.defaultReason": "Muted by system.",
        "playerData.ban.defaultReason": "Banned by system.",

        // === AutoModManager ===
        "automod.action.warnDefaultReason": "You have received an automated warning.",
        "automod.action.kickDefaultReason": "Kicked by AutoMod due to rule violation.",
        "automod.action.tempbanDefaultReason": "Temporarily banned by AutoMod for rule violations.",
        "automod.action.permbanDefaultReason": "Permanently banned by AutoMod for severe rule violations.",
        "automod.action.muteDefaultReason": "Muted by AutoMod.",
        "automod.action.freezeDefaultReason": "Player frozen by AutoMod due to rule violation.",
        "automod.kickMessage.tempban.header": "You are temporarily banned by AutoMod.",
        "automod.kickMessage.common.reason": "Reason: {reason}",
        "automod.kickMessage.common.duration": "Duration: {duration}",
        "automod.adminNotify.actionReport": "{basePrefix} Action: {actionType} on {playerName} for {checkType}. Reason: {reason}{details}",
        "automod.adminNotify.basePrefix": "§7[§cAutoMod§7]",
        "automod.adminNotify.details.duration": ". Duration: {duration}",
        "automod.adminNotify.details.item": ". Item: {item}",
        "automod.default.itemRemoved": "AutoMod removed {quantity}x {itemTypeId} from your inventory.", // For REMOVE_ILLEGAL_ITEM default

        // === TpaManager (Internal System Messages, some might be shown to player if commands don't override) ===
        "tpa.manager.error.targetOfflineOnAccept": "§c{offlinePlayerName} is no longer online. TPA request cancelled.",
        "tpa.manager.warmupMessage": "§eTeleporting in {warmupSeconds} seconds. Do not move or take damage.",
        "tpa.manager.requester.accepted": "§aYour TPA request to \"{targetPlayerName}\" has been accepted. {warmupMessage}",
        "tpa.manager.target.acceptedByRequester": "§a\"{requesterPlayerName}\" accepted your TPA request. {warmupMessage}", // Used for tpahere context
        "tpa.manager.target.acceptedFromRequester": "§aYou accepted the TPA request from \"{requesterPlayerName}\". They will teleport in {warmupSeconds}s.", // Used for tpa context
        "tpa.manager.requester.acceptedHere": "§a\"{targetPlayerName}\" accepted your TPA Here request. They will teleport in {warmupSeconds}s.", // Used for tpahere context
        "tpa.manager.error.teleportTargetOffline": "§cTeleport cancelled: {offlinePlayerName} logged off.",
        "tpa.manager.teleport.successToTarget": "§aTeleported successfully to {targetPlayerName}.",
        "tpa.manager.teleport.successTargetNotified": "§a{requesterPlayerName} has teleported to you.",
        "tpa.manager.teleport.successToRequester": "§aTeleported successfully to {requesterPlayerName}.", // For tpahere where target teleports to requester
        "tpa.manager.teleport.successRequesterNotified": "§a{targetPlayerName} has teleported to you.", // For tpahere where target teleports to requester
        "tpa.manager.error.teleportGenericErrorToRequester": "§cAn error occurred during teleportation. Please try again.",
        "tpa.manager.error.teleportGenericErrorToTarget": "§cAn error occurred during a TPA teleportation involving {otherPlayerName}.",
        "tpa.manager.decline.requesterNotified": "§c\"{targetPlayerName}\" declined your TPA request.",
        "tpa.manager.decline.targetNotified": "§cYou declined the TPA request from \"{requesterPlayerName}\".",
        "tpa.manager.decline.otherCancelledRequester": "§cTPA request involving \"{targetPlayerName}\" was cancelled.",
        "tpa.manager.decline.otherCancelledTarget": "§cTPA request involving \"{requesterPlayerName}\" was cancelled.",
        "tpa.manager.expired.requesterNotified": "§cYour TPA request to \"{targetName}\" has expired.",
        "tpa.manager.expired.targetNotified": "§cThe TPA request from \"{requesterName}\" has expired."
    }
};

export function setCurrentLanguage(langCode) {
    if (translations[langCode]) {
        currentLanguage = langCode;
        console.log(`[i18n] Runtime language set to: ${langCode}`);
    } else {
        console.warn(`[i18n] Attempted to set runtime language to '${langCode}', which is not loaded. Current language remains '${currentLanguage}'.`);
    }
}

setCurrentLanguage(runTimeConfig.defaultServerLanguage || DEFAULT_LANGUAGE);

export function getString(key, args) {
    let langToUse = currentLanguage;
    if (!translations[langToUse] || typeof translations[langToUse][key] !== 'string') {
        if (langToUse !== DEFAULT_LANGUAGE && translations[DEFAULT_LANGUAGE] && typeof translations[DEFAULT_LANGUAGE][key] === 'string') {
            langToUse = DEFAULT_LANGUAGE;
        } else {
            console.warn(`[i18n] String key "${key}" not found for language "${currentLanguage}" or fallback "${DEFAULT_LANGUAGE}". Returning key.`);
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
