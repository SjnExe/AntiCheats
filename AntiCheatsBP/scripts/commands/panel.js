/**
 * @file AntiCheatsBP/scripts/commands/panel.js
 * Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels
// getString imports removed. uiManager is accessed via dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "panel",
    syntax: "!panel",
    description: "help.descriptionOverride.panel", // Key, localization handled by help system
    permissionLevel: permissionLevels.normal, // Statically set permission level
    enabled: true,
};

/**
 * Executes the panel command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, playerUtils, getString } = dependencies;
    // permissionLevels is now imported and set statically in definition.
    // description is also static.

    try {
        if (uiManager && typeof uiManager.showAdminPanelMain === 'function') {
            // Call showAdminPanelMain with all required arguments from dependencies
            await uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);

            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Player opened main panel via command' }, dependencies);
            }
        } else {
            const errorMessage = getString("command.panel.error.uiManagerUnavailable");
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
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager?.addLog){
            logManager.addLog({actionType: 'error', details: `[PanelCommand] Panel command error for ${player.nameTag}: ${error.stack || error}`}, dependencies);
        }
    }
}
