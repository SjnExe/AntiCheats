/**
 * @file Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 */

// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'panel',
    syntax: '', // No arguments, prefix handled by commandManager
    description: 'Opens the main AntiCheat Admin UI panel (or user panel if not admin).',
    permissionLevel: permissionLevels.member, // Accessible by members, UI manager will show appropriate panel
    // aliases: ['ui'], // Defined in config.js commandAliases
    enabled: true,
};

/**
 * Executes the panel command.
 * @async
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, getString, playerUtils } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[PanelCommand] Invalid player object.');
        return;
    }

    try {
        // uiManager.showAdminPanelMain will internally check permissions and show
        // the appropriate panel (admin or normal user).
        // It requires playerDataManager and config for this logic.
        await uiManager?.showAdminPanelMain(player, playerDataManager, config, dependencies);

        // Log panel access. Could be more specific if uiManager returned which panel was shown.
        logManager?.addLog({
            adminName: playerName, // Using adminName field for the user who opened it
            actionType: 'uiPanelOpened', // Standardized camelCase
            targetName: playerName, // Target is self in this context
            targetId: player.id,
            details: 'Player opened a UI panel via command.',
        }, dependencies);
        // No specific success sound here, as the UI opening itself is the feedback.
        // playerUtils?.playSoundForEvent(player, "uiFormOpen", dependencies); // This is handled by uiManager now

    } catch (error) {
        console.error(`[PanelCommand CRITICAL] Error executing panel command for ${playerName}: ${error.stack || error}`);
        player.sendMessage(getString('command.panel.error.generic'));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies); // Sound on error
        logManager?.addLog({
            actionType: 'errorUiPanelCommand', // Standardized error actionType
            context: 'PanelCommand.execute',
            adminName: playerName, // User who experienced the error
            targetId: player.id,
            details: `Error opening panel: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
