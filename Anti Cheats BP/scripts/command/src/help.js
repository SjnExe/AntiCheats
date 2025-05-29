import { newCommand } from '../handle.js';
import CONFIG from '../../config.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name:"help",
    description: "Shows help message",
    adminOnly: false,
    /**
     * Executes the help command.
     * Displays a list of available commands to the player, filtered by their permission level (owner, admin, or regular player).
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {Array<object>} data.commandsData - An array of objects, where each object contains information
     *                                            about a registered command (name, description, adminOnly, ownerOnly).
     *                                            This is specially provided by the commandHandler for the 'help' command.
     * @returns {void} Sends a formatted help message to the command executor.
     */
    run: (data) => {
        try {
            const {commandsData, player} = data;

            const playerIsAdmin = player.hasAdmin(); // Wrapped
            const playerIsOwner = player.isOwner(); // Wrapped

            let helpMessage = `${i18n.getText("command.help.serverPrefixHeader", {}, player)}§6${CONFIG.chat.prefix}§e
${i18n.getText("command.help.availableCommandsHeader", {}, player)}

`;
            for (const command of commandsData) {
                if (playerIsOwner) helpMessage += `§6${command.name}§r - §e§o${command.description}§r\n`;
                else if(playerIsAdmin && !command.ownerOnly) helpMessage += `§6${command.name}§r - §e§o${command.description}§r\n`;
                else if(!playerIsAdmin && !command.adminOnly && !command.ownerOnly) helpMessage += `§6${command.name}§r - §e§o${command.description}§r\n`;
            }
            
            player.sendMessage(helpMessage); // API Call
        } catch (e) {
            logDebug("[SafeGuard ERROR] Error in help command:", e, e.stack);
            // Attempt to notify the player if possible
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.help.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[SafeGuard ERROR] Failed to send error message to command executor in help:", sendError, sendError.stack);
                }
            }
        }
    }
})