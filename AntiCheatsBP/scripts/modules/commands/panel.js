/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'panel',
    syntax: '',
    description: 'Opens the main AntiCheat UI panel. Content varies by permission (admin tools for staff, user info for regular players).',
    permissionLevel: 1024, // member
};

/**
 * Executes the panel command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} _args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, _args, dependencies) {
    const { uiManager, logManager, getString, playerUtils, rankManager, permissionLevels } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    let initialPanelId = 'mainUserPanel';

    if (!player?.isValid()) {
        console.warn('[PanelCommand] Invalid player object.');
        return;
    }

    try {
        const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        if (userPermLevel <= permissionLevels.admin) {
            initialPanelId = 'mainAdminPanel';
        }

        if (uiManager.clearPlayerNavStack) {
            uiManager.clearPlayerNavStack(player.id);
        }

        await uiManager.showPanel(player, initialPanelId, dependencies, { playerName: player.nameTag });

        logManager?.addLog({
            adminName: playerName, // field is adminName but used for player initiating UI
            actionType: 'uiPanelOpened',
            targetName: playerName,
            targetId: player.id,
            details: `Player opened panel: ${initialPanelId}`,
            context: 'PanelCommand.execute',
        }, dependencies);

    } catch (error) {
        console.error(`[PanelCommand CRITICAL] Error executing panel command for ${playerName}: ${error.stack || error}`);
        player.sendMessage(getString('command.panel.error.generic'));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            actionType: 'errorUiPanelCommand',
            context: 'PanelCommand.execute',
            adminName: playerName,
            targetId: player.id,
            details: { panelIdAttempted: initialPanelId || 'mainAdmin/User', errorMessage: error.message },
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
