import { newCommand } from '../handle.js';
import { getPlayerByName } from "../../assets/util.js";
import { logDebug } from "../../assets/logger.js"; // Moved logDebug to logger.js
import config from '../../config.js'; // Corrected import for config

newCommand({
    name: "setrank",
    description: "<playerName> <rankId> - Sets a player's rank. Rank IDs are keys from config.ranks (e.g., owner, admin, member).",
    adminOnly: true,
    /**
     * Executes the setrank command.
     * Sets the rank of a target player by assigning a rank ID, which corresponds to a key in `config.ranks`.
     * The rank ID is stored in the target player's "ac:rankId" dynamic property.
     * This command is admin-only.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The admin player who executed the command.
     * @param {string[]} data.args - The command arguments.
     *                               - `args[1]` is the target player's name.
     *                               - `args[2]` is the rank ID to assign (e.g., "owner", "admin", "member").
     * @returns {void} Sends confirmation or error messages to the command executor and optionally notifies the target player.
     *                 Modifies the target player's "ac:rankId" dynamic property.
     */
    run: (data) => {
        try {
            const { player, args } = data;

            if (args.length < 3) {
                player.sendMessage("§cUsage: .setrank <playerName> <rankId>");
                return;
            }

            const targetPlayerName = args[1];
            const rankIdInput = args[2].toLowerCase();

            const targetPlayer = getPlayerByName(targetPlayerName); // Already wrapped
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer "${targetPlayerName}" not found.`);
                return;
            }

            const validRankIds = Object.keys(config.ranks);
            if (!validRankIds.includes(rankIdInput)) {
                player.sendMessage(`§cInvalid rankId "${rankIdInput}". Valid ranks are: ${validRankIds.join(", ")}.`);
                return;
            }

            targetPlayer.setDynamicProperty("ac:rankId", rankIdInput); // API Call

            const rankName = config.ranks[rankIdInput]?.name || rankIdInput;

            player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s rank to ${rankName}.`); // API Call
            
            // Optional: Notify target player
            targetPlayer.sendMessage(`§aYour rank has been set to ${rankName}.`); // API Call
        } catch (e) {
            logDebug("[Anti Cheats ERROR][setrank]", e, e.stack); // Changed prefix
            if (data && data.player) {
                try {
                    data.player.sendMessage("§cAn error occurred while trying to set the rank. Please check the console.");
                } catch (sendError) {
                    logDebug("[Anti Cheats ERROR][setrank] Failed to send error message to command executor:", sendError, sendError.stack); // Changed prefix
                }
            }
        }
    }
});
