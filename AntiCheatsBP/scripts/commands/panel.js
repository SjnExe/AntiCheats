// AntiCheatsBP/scripts/commands/panel.js
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: "panel",
    syntax: "!panel",
    description: "Opens the AntiCheat Admin Panel UI.",
    // Aliased by !ui in config.js
    permissionLevel: permissionLevels.ADMIN
};

export async function execute(player, args, dependencies) {
    const { uiManager, playerDataManager, config, addLog } = dependencies;
    if (uiManager && uiManager.showAdminPanelMain) {
        uiManager.showAdminPanelMain(player, playerDataManager, config);
         if (addLog) addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel', targetName: player.nameTag, details: 'Admin opened panel' });
    } else {
        player.sendMessage("§cUI Manager or Admin Panel function is not available.");
        console.error("[panelCmd] uiManager.showAdminPanelMain is not available in dependencies.");
    }
}
