/**
 * @file AntiCheatsBP/scripts/commands/panel.js
 * Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 * @version 1.0.2
 */
// permissionLevels and getString imports removed. uiManager is accessed via dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "panel",
    syntax: "!panel",
    description: "help.descriptionOverride.panel", // Key, will be resolved by getString from dependencies
    permissionLevel: null, // To be set from dependencies.permissionLevels.normal in execute
    enabled: true,
};

/**
 * Executes the panel command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, playerUtils, permissionLevels, getString } = dependencies;

    // Set definition properties from dependencies
    definition.permissionLevel = permissionLevels.normal;
    // Ensure description is resolved only once if it's a key
    if (typeof definition.description === 'string' && !definition.description.startsWith("§")) {
       definition.description = getString(definition.description);
    }

    try {
        if (uiManager && typeof uiManager.showAdminPanelMain === 'function') {
            // Call showAdminPanelMain correctly with (player, dependencies)
            // showAdminPanelMain itself will decide whether to show admin or normal panel based on permissions
            await uiManager.showAdminPanelMain(player, dependencies);

            if (logManager?.addLog) {
                logManager.addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Player opened main panel via command' });
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
                logManager.addLog({actionType: 'error', details: `[PanelCommand] uiManager or showAdminPanelMain not available for ${player.nameTag}`});
            }
        }
    } catch (error) {
        console.error(`[PanelCommand] Error executing panel command for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString("common.error.genericCommand"));
        if(logManager?.addLog){
            logManager.addLog({actionType: 'error', details: `[PanelCommand] Panel command error for ${player.nameTag}: ${error.stack || error}`});
        }
    }
}
