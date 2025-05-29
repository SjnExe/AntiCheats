import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name:"notify",
    description:"Toggle anticheat notifications",
    /**
     * Executes the notify command.
     * Toggles anti-cheat notifications for the command executor by running a Minecraft function (`admin_cmds/notify`).
     * The underlying Minecraft function likely manages a scoreboard or tag to enable/disable notifications.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends an error message to the command executor if an issue occurs.
     */
    run: (data) => {
        try {
            data.player.runCommand("function admin_cmds/notify");
        } catch (e) {
            logDebug("[SafeGuard ERROR][notify]", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.notify.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[SafeGuard ERROR][notify] Failed to send error message to command executor:", sendError, sendError.stack);
                }
            }
        }
    }
})