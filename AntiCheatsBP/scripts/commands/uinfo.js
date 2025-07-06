/**
 * @file Defines the !uinfo command (User Info Panel), providing players with access to their stats, server rules, and helpful links.
 * This command serves as an entry point to a UI managed by uiManager.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'uinfo',
    syntax: '', // No arguments, prefix handled by commandManager
    description: 'Opens the User Information Panel (stats, rules, links).',
    aliases: ['userinfo', 'playerpanel'], // Aliases are managed in config.js
    permissionLevel: permissionLevels.member, // Accessible by all members
    enabled: true,
};

/**
 * Executes the !uinfo command.
 * Opens the main user information panel UI for the player.
 * @async
 * @param {import('@minecraft/server').Player} player - The player executing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - The dependencies object.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, logManager, getString, playerUtils } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (!player?.isValid()) {
        console.warn('[UInfoCommand] Invalid player object.');
        return;
    }

    try {
        // uiManager.showNormalUserPanelMain is responsible for displaying the UI.
        // It might need access to playerDataManager and config for certain data.
        // The dependencies object is passed, so uiManager can access what it needs.
        if (uiManager?.showNormalUserPanelMain) {
            await uiManager.showNormalUserPanelMain(player, dependencies);

            logManager?.addLog({
                adminName: playerName, // Using adminName for the user who initiated
                actionType: 'userInfoPanelOpened', // Standardized camelCase
                targetName: playerName, // Target is self
                targetId: player.id,
                details: 'Player opened user info panel via command.',
                context: 'UInfoCommand.execute',
            }, dependencies);
            // No specific sound for opening UI, uiManager handles its own sounds.
        } else {
            player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: "UI Panel unavailable"}));
            playerUtils?.debugLog(`[UInfoCommand CRITICAL] uiManager.showNormalUserPanelMain is undefined for ${playerName}.`, playerName, dependencies);
        }

    } catch (error) {
        console.error(`[UInfoCommand CRITICAL] Error executing uinfo command for ${playerName}: ${error.stack || error}`);
        player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: error.message }));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            actionType: 'errorUiPanelCommand', // Use a generic UI error type
            context: 'UInfoCommand.execute',
            adminName: playerName, // User who experienced the error
            targetId: player.id,
            details: `Error opening user info panel: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
