import { newCommand } from '../handle.js';
import { world } from '@minecraft/server';
import { logDebug } from "../../assets/util.js";

newCommand({
    name: "offlineban",
    description: "<playerName> - Adds a player to the global ban list. They will be banned on next join.",
    adminOnly: true,
    /**
     * Executes the offlineban command.
     * Adds a player's name to a persistently stored global ban list ("safeguard:gbanList").
     * Players on this list are typically banned upon their next attempt to join the server.
     * This command is admin-only.
     *
     * @param {object} data - The data object provided by the command handler.
     * @param {Minecraft.Player} data.player - The admin player who executed the command.
     * @param {string[]} data.args - The command arguments. Expects `args[1]` to be the target player's name.
     * @returns {void} Sends a confirmation or error message to the command executor.
     *                 Modifies the "safeguard:gbanList" world dynamic property.
     */
    run: (data) => {
        const { player, args } = data;

        if (args.length < 2) { // Check if args[1] (playerName) is provided
            player.sendMessage("§cUsage: !offlineban <playerName>");
            return;
        }

        const targetName = args[1];

        const gbanListString = world.getDynamicProperty("safeguard:gbanList");
        let gbanList = [];
        if (typeof gbanListString === 'string') {
            try {
                gbanList = JSON.parse(gbanListString);
                if (!Array.isArray(gbanList)) { // Ensure it's an array after parsing
                    gbanList = [];
                    logDebug("Dynamic global ban list was not an array for offlineban, reset to empty.");
                }
            } catch (e) {
                logDebug("Failed to parse dynamic global ban list for offlineban:", e);
                gbanList = []; // Reset to empty array on parse error
            }
        }

        if (gbanList.includes(targetName)) {
            player.sendMessage(`§cPlayer ${targetName} is already on the offline ban list.`);
            return;
        }

        gbanList.push(targetName);
        world.setDynamicProperty("safeguard:gbanList", JSON.stringify(gbanList));

        player.sendMessage(`§aPlayer ${targetName} has been added to the offline ban list.`);
        logDebug(`[OfflineBan] ${player.name} added ${targetName} to the offline ban list.`);
    }
});
