import { newCommand } from '../handle.js';
import { getPlayerByName,sendMessageToAllAdmins } from '../../assets/util.js';
import { logDebug } from '../../assets/logger.js';

newCommand({
    name: "warn",
    description: "<player> Warns a player",
    /**
     * Executes the warn command.
     * Issues a manual warning to a specified target player.
     * Admins cannot be warned. Notifications are sent to the command executor,
     * the target player, and all other online admins.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1...]` to form the name of the player to be warned.
     * @returns {void} Sends various messages indicating the outcome or errors.
     */
    run: (data) => {
        const { player, args } = data;
        try {
            const setName = args.slice(1).join(" ").replace(/["@]/g, "").trim();

            const targetPlayer = getPlayerByName(setName);

            if (!targetPlayer) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Player §e${setName}§f was not found`);
                return;
            }

            if (targetPlayer.hasAdmin()) {
                player.sendMessage(`§6[§eAnti Cheats§6]§f Can't warn §e${targetPlayer.name}§f, they're an admin.`);
                return;
            }
            sendMessageToAllAdmins("notify.warn", { adminName: player.name, targetName: targetPlayer.name }, true);
            targetPlayer.sendMessage(`§6[§eAnti Cheats§6]§f You were warned by the admin §e${player.name}§f!`);
            targetPlayer.setWarning("manual");
        } catch (error) {
            logDebug("[Anti Cheats Command Error][warn]", error, error.stack);
            if (player) {
                player.sendMessage("§cAn unexpected error occurred while trying to warn the player.");
            }
        }
    }
})