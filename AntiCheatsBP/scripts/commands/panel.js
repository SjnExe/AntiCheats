/**
 * Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 */
import { permissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "panel",
    syntax: "!panel",
    description: "help.descriptionOverride.panel",
    permissionLevel: permissionLevels.normal,
    enabled: true,
};
/**
 * Executes the panel command.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, playerUtils } = dependencies;

    try {
        await uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);
        logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Player opened main panel via command' }, dependencies);
    } catch (error) {
        console.error(`[PanelCommand] Error executing panel command for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred while executing this command.");
        logManager.addLog({actionType: 'error', details: `[PanelCommand] Panel command error for ${player.nameTag}: ${error.stack || error}`}, dependencies);
    }
}
