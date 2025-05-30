import { showAdminPanelMain } from '../../../assets/ui.js'; 
import { i18n } from '../../../assets/i18n.js';             
// It's assumed player object has 'hasAdmin()' and 'sendMessage()' methods,
// which are standard in this project based on previous player.js.

export default {
    name: "panel",
    description: "Opens the Admin Panel UI.", // Changed description slightly as per example
    aliases: ["adminpanel", "ap"], 
    // No explicit 'permission' property here as per instruction, relying on hasAdmin() check.
    // The command handler might interpret a 'permission' field, but the subtask specified to rely on the execute check.
    showInHelp: true, 

    execute(player, _args, _data) { // args -> _args, data -> _data
        // player object is expected to be an instance of Minecraft.Player,
        // which should have the hasAdmin() method as defined in player.js
        if (player.hasAdmin()) {
            showAdminPanelMain(player);
        } else {
            player.sendMessage(i18n.getText("command.panel.noPermission"));
        }
    }
};
