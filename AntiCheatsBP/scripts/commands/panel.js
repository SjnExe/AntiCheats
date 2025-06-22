/**
 * @file AntiCheatsBP/scripts/commands/panel.js
 * Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 * @version 1.0.2
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
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, playerUtils } = dependencies;

    try {
        if (uiManager && typeof uiManager.showAdminPanelMain === 'function') {
            await uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);

            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Player opened main panel via command' }, dependencies);
            }
        } else {
            const errorMessage = "§cError: The UI Panel manager is currently unavailable.";
            if (playerUtils && typeof playerUtils.warnPlayer === 'function') {
                playerUtils.warnPlayer(player, errorMessage);
            } else {
                player.sendMessage(errorMessage);
            }
            console.error("[PanelCommand] uiManager.showAdminPanelMain is not available for panel command.");
            if(logManager?.addLog){
                logManager.addLog({actionType: 'error', details: `[PanelCommand] uiManager or showAdminPanelMain not available for ${player.nameTag}`}, dependencies);
            }
        }
    } catch (error) {
        console.error(`[PanelCommand] Error executing panel command for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage("§cAn unexpected error occurred while executing this command.");
        if(logManager?.addLog){
            logManager.addLog({actionType: 'error', details: `[PanelCommand] Panel command error for ${player.nameTag}: ${error.stack || error}`}, dependencies);
        }
    }
}
