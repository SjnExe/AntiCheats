import { newCommand } from '../handle.js';
import * as config from '../../config.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js'; // Changed path from util.js to logger.js

// Define a reusable function to get the version message
/**
 * Retrieves a formatted string containing the Anti Cheats version from the configuration.
 *
 * @export
 * @returns {string} The Anti Cheats version message string (e.g., "§r§6[§eAnti Cheats§6]§f Version: §evX.Y.Z").
 */
export function getAntiCheatsVersionMessage() { // Renamed function
    return i18n.getText("command.version.message", { version: config.default.version }); // Assuming i18n key will be updated
}

newCommand({
    name:"version",
    description: "Shows the pack version",
    adminOnly: false,
    /**
     * Executes the version command.
     * Sends the current Anti Cheats version message to the command executor.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @returns {void} Sends the version message to the player or an error message if an issue occurs.
     */
    run: (data) => {
        try {
            data.player.sendMessage(getAntiCheatsVersionMessage()); // API Call, renamed function
        } catch (e) {
            logDebug("[Anti Cheats ERROR][version]", e, e.stack); // SafeGuard -> Anti Cheats
            // Attempt to notify the player if possible, though sendMessage itself might be the issue
            if (data && data.player) {
                try {
                    // Avoid calling sendMessage if it's the source of the error
                    if (e.message && !e.message.includes("sendMessage")) {
                         data.player.sendMessage(i18n.getText("command.version.error", {}, data.player));
                    }
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][version] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
})