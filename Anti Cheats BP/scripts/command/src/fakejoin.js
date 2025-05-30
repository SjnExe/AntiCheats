import { newCommand } from '../handle.js';
import { sendMessageToAllAdmins } from "../../assets/util.js";
import { logDebug } from "../../assets/logger.js"; // Added logDebug
import { world } from '@minecraft/server';
import { i18n } from '../../assets/i18n.js'; // Added i18n

newCommand({
    name: "fakejoin",
    description: "Simulate joining the game",
    /**
     * Executes the fakejoin command.
     * Broadcasts a "joined the game" message for the command executor, making it appear as if they have just connected.
     * Also sends a notification to all admins about the fake join.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends a public chat message and an admin notification.
     */
    run: (data) => {
        try {
            const { player } = data;

            world.sendMessage(i18n.getText("command.fakejoin.joinMessage", { playerName: player.name }));
            sendMessageToAllAdmins("notify.fakejoin", { playerName: player.name }, true);
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in fakejoin command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.fakejoin.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in fakejoin:", sendError, sendError.stack);
                }
            }
        }
    }
})
