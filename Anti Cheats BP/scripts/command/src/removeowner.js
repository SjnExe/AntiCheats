import { world } from "@minecraft/server";
import { logDebug } from '../../assets/logger.js'; // Corrected path
import { newCommand } from '../handle.js';

newCommand({
    name:"removeowner",
    description:"Removes your owner status",
    ownerOnly: true,
    /**
     * Executes the removeowner command.
     * Removes the owner status from the command executor by setting the "safeguard:ownerStatus" dynamic property to false.
     * This command can only be executed by a player who currently has owner status.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command (must be the owner).
     * @returns {void} Sends a confirmation message to the player or an error message if an issue occurs.
     */
    run: (data) => {
        try {
            const { player } = data;
            world.setDynamicProperty("ac:ownerPlayerName", ""); // API Call, changed to world and new key
            player.sendMessage(`§6[§eAnti Cheats§6]§f Your owner status was removed.`); // API Call, updated prefix for consistency
        } catch (e) {
            logDebug("[AntiCheats ERROR][removeowner]", e, e.stack); // Updated prefix for consistency
            if (data && data.player) {
                try {
                    data.player.sendMessage("§cAn error occurred while trying to remove owner status. Please check the console.");
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][removeowner] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
})