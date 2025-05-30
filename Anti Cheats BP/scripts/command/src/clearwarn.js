import { newCommand } from '../handle.js';
import { getPlayerByName,sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name: "clearwarn",
    description: "Clears all warnings for a specified player. Usage: .clearwarn <player>",
    /**
     * Executes the clearwarn command.
     * Clears all warnings for a specified player.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to be the target player's name.
     * @returns {void} Sends messages to the command executor and all admins, and clears warnings for the target player.
     */
    run: (data) => {
        try {
            const { player, args } = data;

            const setName = args.slice(1).join(" ").replace(/["@]/g, "").trim();

            const targetPlayer = getPlayerByName(setName); // Already wrapped

            if (!targetPlayer) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${setName}§f was not found`);
                return;
            }

            if (targetPlayer.hasAdmin()) { // Already wrapped
                player.sendMessage(`§6[§eAnti Cheats§6]§f Can't clear the warns of §e${targetPlayer.name}§f, they're an admin.`);
                return;
            }
            sendMessageToAllAdmins("notify.clearwarn", { adminName: player.name, targetName: targetPlayer.name }, true);
            player.sendMessage(`§6[§eAnti Cheats§6]§f Successfully cleared warnings.`);
            targetPlayer.clearWarnings(); // Already wrapped
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in clearwarn command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage("§cAn error occurred while trying to clear warnings. Please check the console.");
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in clearwarn:", sendError, sendError.stack);
                }
            }
        }
    }
})