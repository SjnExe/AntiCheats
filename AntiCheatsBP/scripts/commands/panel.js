// Defines the !panel command, which serves as the entry point to the main AntiCheat Admin UI Panel.
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'panel',
    syntax: '',
    description: 'Opens the main AntiCheat UI panel. Content varies by permission (admin tools for staff, user info for regular players).',
    permissionLevel: 1024, // member
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
    const { uiManager, logManager, getString, playerUtils, rankManager, permissionLevels } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    let initialPanelId = 'mainUserPanel'; // Declare here with a default

    if (!player?.isValid()) {
        console.warn('[PanelCommand] Invalid player object.');
        return;
    }

    try {
        const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
        // initialPanelId is already declared, just assign based on logic
        if (userPermLevel <= permissionLevels.admin) { // Admins and above see admin panel
            initialPanelId = 'mainAdminPanel';
        }

        if (uiManager.clearPlayerNavStack) {
            uiManager.clearPlayerNavStack(player.id);
        }

        await uiManager.showPanel(player, initialPanelId, dependencies, { playerName: player.nameTag }); // Pass initial context

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
            details: { panelIdAttempted: initialPanelId || 'mainAdmin/User', errorMessage: error.message }, // initialPanelId might not be set if error is early
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
