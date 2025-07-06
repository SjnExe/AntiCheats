/**
 * @file Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
 * Also aliased as !ui.
 */

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'panel',
    syntax: '',
    description: 'Opens the main AntiCheat Admin UI panel (or user panel if not admin).',
    permissionLevel: 1024, // member
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
        await uiManager?.showAdminPanelMain(player, playerDataManager, config, dependencies);

        logManager?.addLog({
            adminName: playerName,
            actionType: 'uiPanelOpened',
            targetName: playerName,
            targetId: player.id,
            details: 'Player opened a UI panel via command.',
        }, dependencies);

    } catch (error) {
        console.error(`[PanelCommand CRITICAL] Error executing panel command for ${playerName}: ${error.stack || error}`);
        player.sendMessage(getString('command.panel.error.generic'));
        playerUtils?.playSoundForEvent(player, "commandError", dependencies);
        logManager?.addLog({
            actionType: 'errorUiPanelCommand',
            context: 'PanelCommand.execute',
            adminName: playerName,
            targetId: player.id,
            details: `Error opening panel: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
