import { Player } from "@minecraft/server";
import { newCommand } from "../handle.js";
import { showPublicInfoPanel } from "../../assets/ui.js"; 
import { logDebug } from "../../assets/logger.js"; // Changed path from util.js to logger.js
// i18n import will be added later when we confirm file stability
// import { i18n } from "../../assets/i18n.js"; 

newCommand({
    name: "ui",
    description: "Opens the public information panel.", // Placeholder, i18n in Phase 2
    adminOnly: false,
    run: (data) => {
        const { player } = data; // args are not used by this command
        try {
            if (!(player instanceof Player)) {
                logDebug("[!ui Command] Error: Sender is not a valid player object.");
                return;
            }
            showPublicInfoPanel(player); 
        } catch (e) {
            logDebug(`[!ui Command] Error: ${e} ${e.stack}`);
            if (player instanceof Player) {
                // Temporarily use a hardcoded error message
                player.sendMessage("§6[§eAnti Cheats§6]§r §cAn error occurred while trying to open the UI.");
            }
        }
    }
});
