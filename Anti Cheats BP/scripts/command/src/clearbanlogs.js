import { world } from '@minecraft/server';
import { newCommand } from '../handle.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name:"clearbanlogs",
    description:"Clears all stored ban logs. This command is owner-only.",
    ownerOnly:true,
    /**
     * Executes the clearbanlogs command.
     * Clears all stored ban logs by setting the "ac:banLogs" world dynamic property to undefined.
     * This command is owner-only.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command (must be an owner).
     * @returns {void} Sends a confirmation message to the owner or an error message if an issue occurs.
     */
    run: (data) => {
        try {
            world.setDynamicProperty("ac:banLogs",undefined);
            data.player.sendMessage("§6[§eAnti Cheats§6]§f The ban logs were successfully cleared");
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in clearbanlogs command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage("§cAn error occurred while clearing ban logs. Please check the console.");
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in clearbanlogs:", sendError, sendError.stack);
                }
            }
        }
    }
})