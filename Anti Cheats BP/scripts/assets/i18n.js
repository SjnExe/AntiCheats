// import { world } from '@minecraft/server'; // No longer needed as dynamic properties for lang are removed
// import { logDebug } from './logger.js'; // No longer needed as language loading is removed

// fallbackTranslations contains all the English strings used by the Anti Cheats system.
const fallbackTranslations = {
    "system.error.criticalLoadFailed": "Anti Cheats Critical Error: Core language file (en_US) not found in dynamic properties. Some features may be disabled or messages may be missing. Please ensure the addon is set up correctly.",
    "system.setup.prompt": "Anti Cheats: Setup might be required. If you are an admin, please check the configuration and run initial setup commands if necessary.",
    "general.term.permanent": "Permanent",
    "command.ban.usage": "Usage: !ban <player> [reason] | [time_amount time_unit]",
    "command.ban.notFound": "Player \"%%playerName%%\" not found.",
    "command.ban.self": "You cannot ban yourself.",
    "command.ban.success": "Successfully banned %%playerName%%.",
    "command.ban.error": "An error occurred while trying to ban %%playerName%%.",
    "command.clearchat.error": "An error occurred while clearing the chat.",
    "command.copyinv.notFound": "Player \"%%playerName%%\" not found to copy inventory from.",
    "command.copyinv.targetIsAdmin": "Cannot copy inventory from an admin: %%playerName%%.",
    "command.copyinv.error": "An error occurred while copying inventory for %%playerName%%.",
    "command.fakejoin.joinMessage": "%%playerName%% joined the game.",
    "command.fakejoin.error": "An error occurred trying to simulate a player join.",
    "command.fakeleave.leaveMessage": "%%playerName%% left the game.",
    "command.fakeleave.error": "An error occurred trying to simulate a player leave.",
    "command.freeze.notFound": "Player \"%%playerName%%\" not found.",
    "command.freeze.targetIsAdmin": "Cannot freeze an admin: %%playerName%%.",
    "command.freeze.success.unfrozen": "Successfully unfroze %%playerName%%.",
    "command.freeze.success.frozen": "Successfully froze %%playerName%%.",
    "command.freeze.targetNotification.unfrozen": "You have been unfrozen by an admin.",
    "command.freeze.targetNotification.frozen": "You have been frozen by an admin.",
    "command.freeze.error": "An error occurred while trying to update freeze status for %%playerName%%.",
    "command.help.serverPrefixHeader": "Server command prefix: %%prefix%%",
    "command.help.availableCommandsHeader": "Available commands:",
    "command.help.error": "An error occurred while fetching help information.",
    "command.invsee.notFound": "Player \"%%playerName%%\" not found for inventory inspection.",
    "command.invsee.targetIsAdmin": "Cannot inspect the inventory of an admin: %%playerName%%.",
    "command.invsee.error": "An error occurred while trying to inspect inventory for %%playerName%%.",
    "command.lagclear.countdownInitial": "Clearing ground items in %%seconds%% seconds...",
    "command.lagclear.countdownSeconds": "Clearing items in %%seconds%%...",
    "command.lagclear.success": "Successfully cleared %%count%% ground items.",
    "command.lagclear.error": "An error occurred while clearing ground items.",
    "command.mute.usage": "Usage: !mute <player> <duration (e.g., 5min, 1hr, 2days)> [reason]",
    "command.mute.error.missingQuote": "Error: Reason must be enclosed in quotes if it contains spaces.",
    "command.mute.notFound": "Player \"%%playerName%%\" not found.",
    "command.mute.error.invalidTimeFormat": "Error: Invalid time format. Use numbers followed by min, hr, or day (e.g., 10min, 2hr).",
    "command.mute.error.invalidTimeUnit": "Error: Invalid time unit. Use min, hr, or day.",
    "command.mute.error": "An error occurred while trying to mute %%playerName%%.",
    "command.notify.error": "An error occurred with the notification system.",
    "command.summon_npc.error": "An error occurred while summoning the NPC.",
    "command.toggledeviceban.supportedDevices": "Supported device types: %%deviceTypes%%",
    "command.toggledeviceban.currentlyBanned": "Currently banned device IDs: %%deviceIds%%",
    "command.toggledeviceban.removedSuccess": "Successfully unbanned device ID: %%deviceId%%.",
    "command.toggledeviceban.addedSuccess": "Successfully banned device ID: %%deviceId%%.",
    "command.toggledeviceban.warningNoWhitelist": "Warning: Device whitelist is not enabled. Banning devices might not be effective.",
    "command.toggledeviceban.error": "An error occurred while toggling device ban for %%deviceId%%.",
    "command.unban.usage": "Usage: !unban <player>",
    "command.unban.error": "An error occurred while unbanning %%playerName%%.",
    "command.unmute.usage": "Usage: !unmute <player>",
    "command.unmute.notFound": "Player \"%%playerName%%\" not found.",
    "command.unmute.self": "You cannot unmute yourself.",
    "command.unmute.notMuted": "Player \"%%playerName%%\" is not currently muted.",
    "command.unmute.targetNotification": "You have been unmuted by an admin.",
    "command.unmute.success": "Successfully unmuted %%playerName%%.",
    "command.unmute.error": "An error occurred while unmuting %%playerName%%.",
    "command.vanish.error": "An error occurred while toggling vanish mode for %%playerName%%.",
    "command.version.message": "Anti Cheats version: %%version%%",
    "command.version.error": "Could not retrieve version information.",
    "command.worldborder.notSet": "World border is not currently set.",
    "command.worldborder.currentStatus": "Current world border is set to %%distance%% blocks.",
    "command.worldborder.isNotSet": "World border is not set.",
    "command.worldborder.removed": "World border has been removed.",
    "command.worldborder.error.invalidNumber": "Error: World border distance must be a valid number.",
    "command.worldborder.setSuccess": "World border successfully set to %%distance%% blocks.",
    "command.worldborder.error.general": "An error occurred with the world border command.",
    "player.error.invalidModuleForWarning": "Invalid module type for warning: %%module%%",
    "player.error.invalidModuleReference": "Invalid module reference: %%moduleName%%.",
    "player.warn.manual.approachingBan": "Warning! Your next manual warning from an admin will result in a permanent ban.",
    "player.kick.manualWarnings.3": "You are permanently banned. Reason: Reaching 3 manual warnings. Banned by: Anti Cheats System",
    "player.error.failedToSetWarning": "Failed to set warning for %%playerName%% with module %%module%%.",
    "player.error.mute.paramTypeReason": "Error: Parameter 'reason' must be a string. Received type: %%type%%.",
    "player.error.ban.paramTypePermanent": "Error: Parameter 'permanent' must be a boolean. Received type: %%type%%.",
    "player.error.ban.paramTypeTime": "Error: Parameter 'time' must be a number. Received type: %%type%%.",
    "player.error.mute.adminInstance": "Error: Admin parameter must be a valid player object or admin name string.",
    "player.error.ban.adminPermission": "Admin \"%%adminName%%\" does not have permission to ban.",
    "player.error.ban.targetIsAdmin": "Cannot ban admin player \"%%playerName%%\".",
    "player.error.ban.reasonTooLong": "Ban reason cannot exceed 200 characters (current length: %%length%%).",
    "player.error.ban.alreadyBanned": "Player \"%%playerName%%\" is already banned.",
    "player.error.ban.logFailed": "Failed to create ban log for %%playerName%%.",
    "player.error.ban.setDynamicPropertyFailed": "Failed to set ban information for %%playerName%%.",
    "player.notify.admin.banFailed": "[Anti Cheats] Failed to ban %%playerName%%. Please check console for more details.",
    "player.error.unban.parsingFailed": "Error parsing ban information for %%playerName%% during unban. Forcing clean state.",
    "player.error.freeze.type": "Error: Freeze parameter must be a boolean. Received type: %%type%%.",
    "player.error.freeze.failed": "Failed to set freeze status for %%playerName%% to %%status%%.",
    "player.error.mute.paramTypeDuration": "Error: Parameter 'durationMs' must be a number. Received type: %%type%%.",
    "player.mute.successAdmin": "You have muted %%playerName%% for %%duration%%.",
    "player.error.mute.failed": "Failed to mute player %%playerName%%.",
    "player.notify.admin.muteFailed": "[Anti Cheats] Failed to mute %%playerName%%. Please check console for more details.",
    "player.error.unmute.failed": "Failed to unmute player %%playerName%%.",
    "system.global_ban_kick_message": "You are globally banned from this server.",
    "system.invalid_gamertag_kick": "Your gamertag is invalid or contains disallowed characters. Please change it and rejoin.",
    "system.welcome_message": "Welcome to the server, %%playerName%%! This server is protected by Anti Cheats.",
    "system.muted": "You are currently muted. Reason: %%reason%%. Time remaining: %%timeRemaining%%.",
    "system.anti_spam_triggered_player_notification": "You are sending messages too quickly and have been muted for %%duration%% seconds.",
    "util.formatMilliseconds.noTimeSet": "No duration set.",
    "util.formatMilliseconds.days": "d",
    "util.formatMilliseconds.hours": "h",
    "util.formatMilliseconds.mins": "m",
    "util.invsee.error.noInventoryComponent": "Could not retrieve target player's inventory.",
    "util.invsee.title": "%%playerName%%'s Inventory:",
    "util.invsee.slotItemWithNameTag": "Slot %%slot%%: %%itemName%% x%%amount%% (Name: %%nameTag%%)",
    "util.invsee.slotItem": "Slot %%slot%%: %%itemName%% x%%amount%%",
    "util.invsee.error.noArmorComponent": "Could not retrieve target player's armor.",
    "util.invsee.error.general": "An error occurred while displaying inventory.",
    "util.unbanQueue.alreadyPending": "Player %%playerName%% is already pending unban.",
    "util.unbanQueue.error.saveFailed": "Error saving unban queue. Player %%playerName%% may not be unbanned on rejoin.",
    "util.unbanQueue.success": "Player %%playerName%% added to unban queue. They will be unbanned on next join.",
    "util.unbanQueue.error.general": "An error occurred with the unban queue for %%playerName%%.",
    "util.copyInv.error.noInventoryComponent": "Error accessing inventory for copy.",
    "util.copyInv.error.noArmorComponent": "Error accessing armor for copy.",
    "util.copyInv.success": "Successfully copied inventory from %%playerName%%.",
    "util.copyInv.error.general": "An error occurred while copying inventory.",
    "util.copyInv.error.scheduleFailed": "Failed to schedule inventory copy.",
    "util.alert.autoModKick.playerReason": "You were kicked by AutoMod. Detection: %%module%% (%%detectionValue%%).",
    "util.alert.general": "[Anti Cheats Alert] %%playerName%% detected for %%detectionType%% (Value: %%detectionValue%%).",
    "system.antigrief_item_restriction": "You cannot use %%itemName%% due to anti-grief measures.",
    "command.panel.noPermission": "You do not have permission to use the admin panel.",
    "ui.main.title": "Admin Panel",
    "ui.main.button.playerList": "Player List",
    "ui.playerlist.title": "Online Players",
    "ui.playerlist.category.owners": "== Owners ==",
    "ui.playerlist.label.owner": "[Owner]",
    "ui.playerlist.noneOnline": "No players online in this category.",
    "ui.playerlist.category.admins": "== Admins ==",
    "ui.playerlist.label.admin": "[Admin]",
    "ui.playerlist.category.members": "== Members ==",
    "ui.button.back": "Back",
    "ui.error.generic": "A UI error occurred. Please try again or contact an admin.",
    "system.vanish_reminder": "You are currently in vanish mode.",
    "system.beta_features_enabled": "Note: Beta features are enabled. Some functionalities might be unstable."
};

export const i18n = {
    /**
     * Retrieves a translated string by its key and replaces placeholders.
     * Uses a predefined fallback object for English strings.
     * @param {string} key - The translation key (e.g., "command.ban.success").
     * @param {object} [placeholders={}] - An object mapping placeholder names to their values.
     *                                     Example: { playerName: "Steve", count: 5 }
     *                                     Placeholders in the string should be like %%placeholderName%%.
     * @returns {string} The translated and formatted string, or the key with placeholder data if not found.
     */
    getText: function(key, placeholders = {}) {
        let text = fallbackTranslations[key];

        if (typeof text !== 'string') {
            // If key is not in fallbackTranslations, construct a string that includes the key itself
            // and any provided placeholders, so it's clear what text is missing but also what data it had.
            let missingMsg = `Missing translation for key: ${key}`; // Start with the key itself
            if (Object.keys(placeholders).length > 0) {
                missingMsg += " (Data: ";
                missingMsg += Object.entries(placeholders)
                    .map(([pk, pv]) => `${pk}: ${String(pv)}`)
                    .join(", ");
                missingMsg += ")";
            }
            // Log this to the console for server admins to see, as this indicates a missing translation.
            // console.warn(`[i18n] ${missingMsg}`); // Consider adding a log function if available and appropriate
            return missingMsg; // Return the key and its placeholder values
        }

        // If text IS found in fallbackTranslations, process placeholders in THAT string.
        for (const placeholder in placeholders) {
            if (Object.hasOwnProperty.call(placeholders, placeholder)) {
                const regex = new RegExp(`%%${placeholder}%%`, 'g');
                text = text.replace(regex, String(placeholders[placeholder]));
            }
        }
        return text;
    },
};
