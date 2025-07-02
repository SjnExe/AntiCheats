/**
 * @file Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 */

import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'panel',
    syntax: '!panel',
    description: 'Opens the main AntiCheat Admin UI panel.',
    permissionLevel: permissionLevels.member,
    // aliases: ['ui'], // Defined in config.js commandAliases
    enabled: true,
};

/**
 * Executes the panel command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, playerDataManager, config, logManager, getString } = dependencies;

    try {
        await uiManager.showAdminPanelMain(player, playerDataManager, config, dependencies);
        logManager.addLog({
            timestamp: Date.now(),
            adminName: player.nameTag,
            actionType: 'panelCommandUi',
            targetName: player.nameTag,
            details: 'Player opened main panel via command.',
        }, dependencies);
    } catch (error) {
        console.error(`[PanelCommand] Error executing panel command for ${player.nameTag}: ${error.stack || error}`);
        player.sendMessage(getString('command.panel.error.generic'));
        logManager.addLog({
            actionType: 'error',
            context: 'PanelCommandExecute',
            details: `Error for ${player.nameTag}: ${error.stack || error}`,
        }, dependencies);
    }
}
