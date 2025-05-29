import { getPlayerByName, sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js';
import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';

newCommand({
    name:"ban",
    description:"Permanently bans a player by their name. Usage: .ban <player name> [reason]",
    /**
     * Executes the ban command.
     * Permanently bans the specified player with an optional reason.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1]` to be the target player's name
     *                               and `args[2...]` to be the optional reason.
     * @returns {void} Sends messages to the command executor and all admins, and attempts to ban and kick the target player.
     */
    run: (data) => {
        try {
            const {player,args} = data;
            
            if (args.length < 2) {
                player.sendMessage(i18n.getText("command.ban.usage", {}, player));
                return;
            }

            const targetName = args[1].replace(/["@]/g, "");
            const reasonInput = args.slice(2).join(" ");
            
            let reason = reasonInput.trim();
            if (reason === "") {
                reason = "No reason provided.";
            }

            const targetPlayer = getPlayerByName(targetName); // getPlayerByName is already wrapped
            if (!targetPlayer) {
                player.sendMessage(i18n.getText("command.ban.notFound", { targetName: targetName }, player));
                return;
            }
            if (targetPlayer.name == player.name) {
                player.sendMessage(i18n.getText("command.ban.self", {}, player));
                return;
            }

            player.sendMessage(i18n.getText("command.ban.success", { targetName: targetPlayer.name, reason: reason }, player));
            sendMessageToAllAdmins("notify.ban", { adminName: player.name, targetName: targetPlayer.name, reason: reason }, true);

            // runCommand and ban are critical API calls. ban is already wrapped in Player.prototype.ban
            targetPlayer.ban(reason, Date.now(), true, player); // player.ban is wrapped
            // Kick should ideally be after confirming ban was successful, but ban is already robust.
            // If ban fails, kick might not happen if player is already gone due to ban failure.
            // For simplicity, keeping kick after ban.
            const kickReason = i18n.getText("player.kick.existingBan.permanent", { reason: reason, bannedBy: player.name }, targetPlayer);
            player.runCommand(`kick "${targetPlayer.name}" ${kickReason}`);

        } catch (e) {
            logDebug("[SafeGuard ERROR] Error in ban command:", e, e.stack);
            if (data && data.player) { // Check if player is defined from data
                try {
                    data.player.sendMessage(i18n.getText("command.ban.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[SafeGuard ERROR] Failed to send error message to command executor in ban command:", sendError, sendError.stack);
                }
            }
        }
    }
})
