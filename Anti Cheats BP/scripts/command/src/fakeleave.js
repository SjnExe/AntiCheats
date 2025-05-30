import { newCommand } from '../handle.js';
import { sendMessageToAllAdmins } from "../../assets/util.js";
import { logDebug } from "../../assets/logger.js"; // Added logDebug
import { world } from '@minecraft/server';
import { i18n } from '../../assets/i18n.js'; // Added i18n


newCommand({
    name: "fakeleave",
    description: "Simulate leaving the game",
    /**
     * Executes the fakeleave command.
     * Broadcasts a "left the game" message for the command executor, making it appear as if they have disconnected.
     * Also sends a notification to all admins about the fake leave.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends a public chat message and an admin notification.
     */
    run: (data) => {
        try {
            const { player } = data;

            world.sendMessage(i18n.getText("command.fakeleave.leaveMessage", { playerName: player.name }));
            sendMessageToAllAdmins("notify.fakeleave", { playerName: player.name }, true);
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in fakeleave command:", e, e.stack);
            // No player object to send message to if world.sendMessage fails early,
            // but if sendMessageToAllAdmins fails, player might still be accessible.
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.fakeleave.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in fakeleave:", sendError, sendError.stack);
                }
            }
        }
    }
})
