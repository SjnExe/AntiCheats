import { newCommand } from '../handle.js';
import { world } from '@minecraft/server';
import { logDebug } from "../../assets/logger.js";

newCommand({
    name: "offlineunban",
    description: "<playerName> - Removes a player from the global ban list.",
    adminOnly: true,
    /**
     * Executes the offlineunban command.
     * Removes a player's name from the persistently stored global ban list ("safeguard:gbanList").
     * This command is admin-only.
     * It handles cases where the list might store simple names or objects with a `name` property.
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
            player.sendMessage("§cUsage: !offlineunban <playerName>");
            return;
        }

        const targetName = args[1];

        const gbanListString = world.getDynamicProperty("ac:gbanList");
        let gbanList = [];
        if (typeof gbanListString === 'string') {
            try {
                gbanList = JSON.parse(gbanListString);
                if (!Array.isArray(gbanList)) { // Ensure it's an array after parsing
                    gbanList = [];
                    logDebug("Dynamic global ban list was not an array for offlineunban, reset to empty.");
                }
            } catch (e) {
                logDebug("Failed to parse dynamic global ban list for offlineunban:", e);
                gbanList = []; // Reset to empty array on parse error
            }
        }

        const playerIndex = gbanList.findIndex(entry => 
            (typeof entry === 'string' && entry === targetName) || 
            (typeof entry === 'object' && entry.name === targetName)
        );

        if (playerIndex === -1) {
            player.sendMessage(`§cPlayer ${targetName} is not on the offline ban list.`);
            return;
        }

        gbanList.splice(playerIndex, 1);
        world.setDynamicProperty("ac:gbanList", JSON.stringify(gbanList));

        // Update live global ban lists
        if (world.dynamicGbanListArray && Array.isArray(world.dynamicGbanListArray)) {
            const indexInArray = world.dynamicGbanListArray.indexOf(targetName);
            if (indexInArray > -1) {
                world.dynamicGbanListArray.splice(indexInArray, 1);
            }
        } else {
            logDebug("[OfflineUnban] world.dynamicGbanListArray not found or not an array. Live list might be out of sync until next load.");
        }
        if (world.dynamicGbanNameSet && typeof world.dynamicGbanNameSet.delete === 'function') {
            world.dynamicGbanNameSet.delete(targetName);
        } else {
            logDebug("[OfflineUnban] world.dynamicGbanNameSet not found or not a Set. Live set might be out of sync until next load.");
        }

        player.sendMessage(`§aPlayer ${targetName} has been removed from the offline ban list.`);
        logDebug(`[OfflineUnban] ${player.name} removed ${targetName} from the offline ban list.`);
    }
});
