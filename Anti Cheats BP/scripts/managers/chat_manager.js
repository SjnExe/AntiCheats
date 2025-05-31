import { world } from "@minecraft/server";
import CONFIG from "../config.js";
import { ModuleStatusManager } from "../classes/module.js";
import { i18n } from "../assets/i18n.js"; // Assuming i18n is from assets
import { sendMessageToAllAdmins } from "../assets/util.js"; // Removed getPlayerRank
import { commandHandler } from "../command/handle.js";
import { inMemoryCommandLogs, MAX_LOG_ENTRIES } from "../systems/periodic_checks.js"; // This will be created later

// Function to handle muting players
function handleMute(player, _message) { // message -> _message
    if (player.hasTag("is_muted")) {
        player.sendMessage(i18n.getText("system.muted", {}, player));
        return true;
    }
    return false;
}

// Function to handle anti-spam
function handleAntiSpam(player, _message) { // message -> _message
    const now = Date.now();
    const playerSpamData = player.getDynamicProperty("spam_data") || { messages: [], lastMessageTime: 0 };
    const messageLimit = CONFIG.chat.spammer.maxMessageCharLimit;
    const timeLimit = CONFIG.chat.spammer.minTime; // This is already in milliseconds

    playerSpamData.messages = playerSpamData.messages.filter(time => now - time < timeLimit);
    playerSpamData.messages.push(now);

    if (playerSpamData.messages.length > messageLimit) {
        // Assuming i18n expects time_limit in seconds for the message
        const timeLimitInSeconds = timeLimit / 1000; 
        sendMessageToAllAdmins(
            "system.anti_spam_triggered_admin_notification", { player: player.name, message_limit: messageLimit, time_limit: timeLimitInSeconds }
        );
        player.sendMessage(i18n.getText("system.anti_spam_triggered_player_notification", { message_limit: messageLimit, time_limit: timeLimitInSeconds }, player));
        player.addTag("is_muted"); // Mute the player
        // Optionally, add a timed unmute here if desired
        return true;
    }

    player.setDynamicProperty("spam_data", playerSpamData);
    return false;
}

// Function to format chat messages with rank
function formatChatMessageWithRank(player, message) {
    const rankId = player.getRank(); // Changed from getPlayerRank(player)
    const rankInfo = CONFIG.ranks[rankId] || CONFIG.ranks[CONFIG.defaultRank];
    const rankPrefix = rankInfo && rankInfo.displayText ? `${rankInfo.displayText.replace("%rankName%", rankInfo.name || rankId)} ` : "";
    const nameColor = rankInfo && rankInfo.nameColor ? rankInfo.nameColor : "§f";
    const chatColor = rankInfo && rankInfo.chatColor ? rankInfo.chatColor : "§f";

    const chatMessage = `${rankPrefix}${nameColor}${player.name}§r: ${chatColor}${message}`;
    world.sendMessage(chatMessage);
}

// Subscribe to chatSend event
world.beforeEvents.chatSend.subscribe((eventData) => {
    const player = eventData.sender;
    const message = eventData.message;

    // Log command
    if (message.startsWith(CONFIG.chat.prefix)) {
        if (inMemoryCommandLogs.length >= MAX_LOG_ENTRIES) {
            inMemoryCommandLogs.shift(); // Remove the oldest entry
        }
        inMemoryCommandLogs.push({
            timestamp: new Date().toISOString(),
            player: player.name,
            command: message
        });
    }

    // Handle mute
    if (handleMute(player, message)) {
        eventData.cancel = true;
        return;
    }

    // Handle anti-spam
    if (ModuleStatusManager.getModuleStatus(ModuleStatusManager.Modules.spammerProtection) && handleAntiSpam(player, message)) {
        eventData.cancel = true;
        return;
    }

    // Handle commands
    if (message.startsWith(CONFIG.chat.prefix)) {
        eventData.cancel = true;
        commandHandler(player, message); // Note: commandHandler might need player object, not just sender if it relies on Player.prototype methods
        return;
    }

    // Format and send chat message if not cancelled
    if (!eventData.cancel) {
        eventData.cancel = true; // Cancel original message to send formatted one
        formatChatMessageWithRank(player, message);
    }
});

// Export functions if they need to be called from elsewhere, though for chatSend subscription, side effects are enough.
// For this refactor, we are primarily using this for the side effect of the subscription.
// No explicit exports needed unless other modules will directly call these functions.
// However, to be safe and allow for future flexibility:
export { handleMute, handleAntiSpam, formatChatMessageWithRank };
