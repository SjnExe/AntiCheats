// AntiCheatsBP/scripts/commands/panel.js
import { permissionLevels } from '../core/rankManager.js'; // Ensure this path is correct

export const definition = {
    name: "panel",
    syntax: "!panel",
    description: "Opens the AntiCheat Admin Panel UI.",
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { uiManager, playerDataManager, config, addLog } = dependencies;
    // Ensure all necessary components of dependencies are available before calling
    if (uiManager && typeof uiManager.showAdminPanelMain === 'function' && playerDataManager && config) {
        // Pass the entire dependencies object
        uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Admin opened main panel via command' });
        }
    } else {
        player.sendMessage("§cUI Manager or its main panel function is not available. Please contact an administrator.");
        console.error("[panelCmd] uiManager.showAdminPanelMain is not available or core dependencies (playerDataManager, config) missing for panel command.");
    }
}
