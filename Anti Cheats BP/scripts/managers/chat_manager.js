import { world } from "@minecraft/server";
import CONFIG from "../config.js";
import { ModuleStatusManager } from "../classes/module.js";
import { i18n } from "../assets/i18n.js"; // Assuming i18n is from assets
import { sendMessageToAdmins, getPlayerRank } from "../assets/util.js";
import { commandHandler } from "../command/handle.js";
import { inMemoryCommandLogs, MAX_LOG_ENTRIES } from "../systems/periodic_checks.js"; // This will be created later

// Function to handle muting players
function handleMute(player, message) {
    if (player.hasTag("is_muted")) {
        player.sendMessage(i18n.getText("system.muted", {}, player));
        return true;
    }
    return false;
}

// Function to handle anti-spam
function handleAntiSpam(player, message) {
    const now = Date.now();
    const playerSpamData = player.getDynamicProperty("spam_data") || { messages: [], lastMessageTime: 0 };
    const messageLimit = CONFIG.chat.spammer.maxMessageCharLimit;
    const timeLimit = CONFIG.chat.spammer.minTime; // This is already in milliseconds

    playerSpamData.messages = playerSpamData.messages.filter(time => now - time < timeLimit);
    playerSpamData.messages.push(now);

    if (playerSpamData.messages.length > messageLimit) {
        // Assuming i18n expects time_limit in seconds for the message
        const timeLimitInSeconds = timeLimit / 1000; 
        sendMessageToAdmins(
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
    const rank = getPlayerRank(player);
    const rankPrefix = rank === "일반" ? "" : `§l§7[§r${rank}§l§7]§r `;
    const chatMessage = `${rankPrefix}${player.name}: ${message}`;
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
        commandHandler(player, message);
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
