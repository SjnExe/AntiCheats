import { newCommand } from '../handle.js';
import { getPlayerByName,copyInv, sendMessageToAllAdmins } from '../../assets/util.js';
import { i18n } from '../../assets/i18n.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name:"copyinv",
    description: "Copies all items from a target player's inventory into your own. Usage: .copyinv <player>",
    /**
     * Executes the copyinv command.
     * Copies the entire inventory (including armor and offhand) from a target player to the command executor's inventory.
     * The command executor's inventory is cleared before the items are copied.
     * This command cannot be used on admin players.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command and will receive the copied inventory.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to be the target player's name.
     * @returns {void} Sends messages to the command executor and all admins.
     *                 Modifies the command executor's inventory.
     */
    run: (data) => {
        try {
            const {player,args} = data;

            const setName = args.slice(1).join(" ").replace(/["@]/g, "");
            const targetPlayer = getPlayerByName(setName); // Already wrapped
            if(!targetPlayer) {
                player.sendMessage(i18n.getText("command.copyinv.notFound", { targetName: setName }, player));
                return;
            }
            if (targetPlayer.hasAdmin()) { // Already wrapped
                player.sendMessage(i18n.getText("command.copyinv.targetIsAdmin", { targetName: targetPlayer.name }, player));
                return;
            }
            sendMessageToAllAdmins("notify.copyinv", { adminName: player.name, targetName: targetPlayer.name }, true);
            copyInv(player,targetPlayer); // Already wrapped
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in copyinv command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.copyinv.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in copyinv:", sendError, sendError.stack);
                }
            }
        }
    }
})