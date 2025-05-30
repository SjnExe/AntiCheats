import { getPlayerByName, sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js'; // Moved logDebug to logger.js
import { newCommand } from '../handle.js';
import { i18n } from '../../assets/i18n.js';

newCommand({
    name:"unmute",
	description: "<player> Unmutes a muted player",
    /**
     * Executes the unmute command.
     * Unmutes a specified player if they are currently muted.
     * Provides feedback messages to the command executor, the target player, and all admins.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to form the name of the player to be unmuted.
     * @returns {void} Sends various messages indicating the outcome or errors.
     */
    run: (data) => {
        try {
            const {player, args} = data;

            const setNameUnmute = args.slice(1).join(" ").replace(/["@]/g, "");
            if (!setNameUnmute) { // Basic validation for player name
                player.sendMessage(i18n.getText("command.unmute.usage", {}, player));
                return;
            }
            const targetPlayer = getPlayerByName(setNameUnmute); // Already wrapped
            if (!targetPlayer) {
              player.sendMessage(i18n.getText("command.unmute.notFound", { targetName: setNameUnmute }, player));
              return;
            }
            if (targetPlayer.name === player.name) {
                player.sendMessage(i18n.getText("command.unmute.self", {}, player));
                return;
            }
            if (!targetPlayer.isMuted) { // isMuted is a property, should be safe, but good to be in try-catch
              player.sendMessage(i18n.getText("command.unmute.notMuted", { targetName: targetPlayer.name }, player));
              return;
            }
            
            targetPlayer.unmute(); // Already wrapped in player.js

            targetPlayer.sendMessage(i18n.getText("command.unmute.targetNotification", { adminName: player.name }, targetPlayer));
            player.sendMessage(i18n.getText("command.unmute.success", { targetName: targetPlayer.name }, player));
            sendMessageToAllAdmins("notify.unmute", { adminName: player.name, targetName: targetPlayer.name }, true);
        } catch (e) {
            logDebug("[Anti Cheats ERROR][unmute]", e, e.stack); // SafeGuard -> Anti Cheats
            if (data && data.player) {
                try {
                    data.player.sendMessage(i18n.getText("command.unmute.error", {}, data.player));
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][unmute] Failed to send error message to command executor:", sendError, sendError.stack); // SafeGuard -> Anti Cheats
                }
            }
        }
    }
})
