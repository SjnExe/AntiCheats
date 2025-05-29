// Imports (assuming similar structure to other command files)
import { world } from "@minecraft/server";
import CONFIG from "../../../config.js"; // Path is correct
import { newCommand as registerCommand } from "../../handle.js"; // Adjusted path and import
import { sendMessageToAllAdmins } from "../../../assets/util.js"; // Path is correct
import { logDebug } from "../../../assets/logger.js";

registerCommand({
    name: "owner",
    description: "Claims ownership of the addon if no owner is currently set.",
    aliases: ["setowner", "claimowner"], // Optional aliases
    permissionLevel: 0, // Anyone can attempt to use it
    adminOnly: false,
    ownerOnly: false,
    usage: ["!owner <password>"],
    example: ["!owner mysecretpassword"],
    run: (data) => {
        const { player, args } = data;
        if (args.length < 2) {
            player.sendMessage("§cUsage: !owner <password>");
            return;
        }

        const providedPassword = args[1];
        let currentOwnerName;
        try {
            currentOwnerName = world.getDynamicProperty("ac:ownerPlayerName");
        } catch (e) {
            logDebug("[Anti Cheats ERROR] Could not read ac:ownerPlayerName in !owner command:", e, e.stack);
            player.sendMessage("§cAn error occurred trying to check current owner status. Please contact an administrator.");
            return;
        }


        if (typeof currentOwnerName === 'string' && currentOwnerName.trim() !== '') {
            player.sendMessage(`§cAn owner is already designated: ${currentOwnerName}. The !owner command cannot be used.`);
            return;
        }

        if (providedPassword === CONFIG.OWNER_PASSWORD) {
            try {
                world.setDynamicProperty("ac:ownerPlayerName", player.name);
                player.sendMessage("§aYou have successfully claimed ownership of the Anti Cheats addon!");
                player.addTag("admin"); // Also give admin tag to the new owner
                sendMessageToAllAdmins("notify.ownerClaimed", { playerName: player.name }, false);
                logDebug(`[Anti Cheats] Player ${player.name} claimed ownership using !owner command.`);
            } catch (e) {
                logDebug("[Anti Cheats ERROR] Failed to set ac:ownerPlayerName in !owner command:", e, e.stack);
                player.sendMessage("§cAn error occurred while trying to set you as owner. Please contact an administrator.");
            }
        } else {
            player.sendMessage("§cIncorrect password for !owner command.");
            logDebug(`[Anti Cheats] Player ${player.name} failed !owner command attempt (incorrect password).`);
        }
    }
});
