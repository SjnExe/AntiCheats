/**
 * @file AntiCheatsBP/scripts/commands/panel.js
 * Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 * @version 1.0.2
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js'; // Import getString

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "panel",
    syntax: "!panel",
    description: getString("help.descriptionOverride.panel"), // Get description from localization
    permissionLevel: permissionLevels.normal,
    enabled: true,
};

/**
 * Executes the panel command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) { // args renamed to _args
    const { uiManager, playerDataManager, config, addLog, playerUtils } = dependencies;

    // Add getString to dependencies for uiManager if it expects it,
    // though uiManager should ideally import it directly.
    // For this refactor, we assume uiManager will import getString itself.
    // dependencies.getString = getString; // Not strictly needed if uiManager imports directly

    if (uiManager && typeof uiManager.showAdminPanelMain === 'function' && playerDataManager && config) {
        // Pass the entire dependencies object
        uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);
        if (addLog) {
            addLog({ timestamp: Date.now(), adminName: player.nameTag, actionType: 'command_panel_ui', targetName: player.nameTag, details: 'Admin opened main panel via command' });
        }
    } else {
        const errorMessage = getString("command.panel.error.uiManagerUnavailable");
        if (playerUtils && typeof playerUtils.warnPlayer === 'function') {
            playerUtils.warnPlayer(player, errorMessage);
        } else {
            player.sendMessage(errorMessage);
        }
        console.error("[panelCmd] uiManager.showAdminPanelMain is not available or core dependencies (playerDataManager, config) missing for panel command.");
    }
}
