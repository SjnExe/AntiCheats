import { getPlayerByName, sendMessageToAllAdmins } from "../../assets/util.js";
import { logDebug } from "../../assets/logger.js"; // Added logDebug
import { newCommand } from "../handle";
import { i18n } from '../../assets/i18n.js'; // Added i18n

newCommand({
    name:"freeze",
    description:"Toggle freeze of selected player",
    /**
     * Executes the freeze command.
     * Toggles the freeze state of a target player. When frozen, a player cannot move or look around.
     * This command cannot be used on admin players.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to be the target player's name.
     * @returns {void} Sends messages to the command executor, the target player, and all admins.
     *                 Modifies the target player's freeze status (dynamic property and input permissions).
     */
    run: (data) => {
        try {
            const {args, player } = data;
            const targetName = args.slice(1).join(" ").replace(/["@]/g, "");
            const targetPlayer = getPlayerByName(targetName); // Already wrapped
            
            if (!targetPlayer) {
                player.sendMessage(i18n.getText("command.freeze.notFound", { targetName: targetName }, player));
                return;
            }
            if (targetPlayer.hasAdmin()) { // Already wrapped
                player.sendMessage(i18n.getText("command.freeze.targetIsAdmin", { targetName: targetPlayer.name }, player));
                return;
            }
            
            const playerFreezeStatus = targetPlayer.getDynamicProperty("ac:freezeStatus") ?? false; 
            const freezeMsg = playerFreezeStatus ? "unfrozen" : "frozen"; // Corrected logic: if status is true, action is to unfreeze, so message is "unfrozen"

            targetPlayer.setFreezeTo(!playerFreezeStatus); // Already wrapped

            const successMsgKey = playerFreezeStatus ? "command.freeze.success.unfrozen" : "command.freeze.success.frozen";
            player.sendMessage(i18n.getText(successMsgKey, { targetName: targetPlayer.name }, player));
            
            const targetMsgKey = playerFreezeStatus ? "command.freeze.targetNotification.unfrozen" : "command.freeze.targetNotification.frozen";
            targetPlayer.sendMessage(i18n.getText(targetMsgKey, { adminName: player.name }, targetPlayer));
            
            sendMessageToAllAdmins("notify.freeze", { adminName: player.name, freezeState: freezeMsg, targetName: targetPlayer.name }, true);

        } catch (e) {
            logDebug("[Anti Cheats ERROR] Error in freeze command:", e, e.stack);
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.freeze.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR] Failed to send error message to command executor in freeze:", sendError, sendError.stack);
                }
            }
        }
    } 
})
