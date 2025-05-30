import { newCommand } from '../handle.js';
import { getPlayerByName, invsee, sendMessageToAllAdmins } from '../../assets/util.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name:"invsee",
    description: "<player> List all the items that the player has in their inventory",
    /**
     * Executes the invsee command.
     * Displays the inventory contents (including armor and offhand) of a target player to the command executor via chat messages.
     * This command cannot be used on admin players.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command and will see the inventory listing.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to be the target player's name.
     * @returns {void} Sends messages to the command executor and all admins.
     *                 The target player's inventory is displayed to the executor via chat.
     */
    run: (data) => {
        try {
            const {player,args} = data;

            const setNameInvsee = args.slice(1).join(" ").replace(/["@]/g, "");

            const targetPlayer = getPlayerByName(setNameInvsee); // Already wrapped

            if(!targetPlayer) {
                player.sendMessage(i18n.getText("command.invsee.notFound", { targetName: setNameInvsee }, player));
                return;
            }
            
            if (targetPlayer.hasAdmin()) { // Already wrapped
                player.sendMessage(i18n.getText("command.invsee.targetIsAdmin", { targetName: targetPlayer.name }, player));
                return;
            }
            sendMessageToAllAdmins("notify.invsee", { adminName: player.name, targetName: targetPlayer.name }, true);
            
            invsee(data.player, targetPlayer); // Already wrapped in util.js
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in invsee command:", e, e.stack); // Changed SafeGuard to Anti Cheats
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.invsee.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in invsee:", sendError, sendError.stack); // Changed SafeGuard to Anti Cheats
                }
            }
        }
    }
})