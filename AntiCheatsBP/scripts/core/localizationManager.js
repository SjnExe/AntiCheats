/**
 * @file AntiCheatsBP/scripts/core/localizationManager.js
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
        "command.tpastatus.notifyRequester.declined": "§e{targetPlayerName} is no longer accepting TPA requests; your request was automatically declined."


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
