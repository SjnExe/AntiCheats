import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

newCommand({
    name:"vanish",
    description:"Toggles vanish mode",
    /**
     * Executes the vanish command.
     * Toggles vanish mode for the command executor by running a Minecraft function (`admin_cmds/vanish`).
     * The underlying Minecraft function likely manages player visibility and game effects.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends an error message to the command executor if an issue occurs.
     */
    run: (data) => {
        try {
            data.player.runCommand("function admin_cmds/vanish");
        } catch (e) {
            logDebug("[Anti Cheats ERROR][vanish]", e, e.stack); // SafeGuard -> Anti Cheats
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.vanish.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][vanish] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
})