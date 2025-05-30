import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

newCommand({
    name:"clearchat",
    description: "Clear the chat",
    /**
     * Executes the clearchat command.
     * Runs a Minecraft function (`admin_cmds/clearchat`) to clear the chat for all players.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends an error message to the command executor if an issue occurs.
     */
    run: (data) => {
        try {
            data.player.runCommand("function admin_cmds/clearchat");
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in clearchat command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.clearchat.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in clearchat:", sendError, sendError.stack);
                }
            }
        }
    }
})