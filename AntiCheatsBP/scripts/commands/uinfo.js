/**
 * @file Defines the !uinfo command (User Info Panel), providing players with access to their stats, server rules, and helpful links.
 * This command serves as an entry point to a UI managed by uiManager.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'uinfo',
    syntax: '',
    description: 'Opens the User Information Panel (stats, rules, links).',
    aliases: ['userinfo', 'playerpanel'],
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !uinfo command.
 * Opens the main user information panel UI for the player.
 *
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
        if (uiManager?.showNormalUserPanelMain) {
            await uiManager.showNormalUserPanelMain(player, dependencies);

            logManager?.addLog({
                adminName: playerName,
                actionType: 'userInfoPanelOpened',
                targetName: playerName,
                targetId: player.id,
                details: 'Player opened user info panel via command.',
                context: 'UInfoCommand.execute',
            }, dependencies);
        } else {
            player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: 'UI Panel unavailable' }));
            playerUtils?.debugLog(`[UInfoCommand CRITICAL] uiManager.showNormalUserPanelMain is undefined for ${playerName}.`, playerName, dependencies);
        }

    } catch (error) {
        console.error(`[UInfoCommand CRITICAL] Error executing uinfo command for ${playerName}: ${error.stack || error}`);
        player.sendMessage(getString('common.error.genericCommandError', { commandName: definition.name, errorMessage: error.message }));
        playerUtils?.playSoundForEvent(player, 'commandError', dependencies);
        logManager?.addLog({
            actionType: 'errorUiPanelCommand',
            context: 'UInfoCommand.execute',
            adminName: playerName,
            targetId: player.id,
            details: `Error opening user info panel: ${error.message}`,
            errorStack: error.stack || error.toString(),
        }, dependencies);
    }
}
