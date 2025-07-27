/**
 * @file Defines the !reload command, which reloads the server's scripts and functions.
 */

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'reload',
    description: 'Reloads all script files and functions in behavior packs.',
    permissionLevel: 0, // owner
    enabled: true,
};

/**
 * Executes the !reload command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 */
export function execute(player, args, { playerUtils }) {
    const { getString } = playerUtils;

    try {
        player.runCommandAsync('reload');
        player.sendMessage(getString('command.reload.success'));
    } catch (error) {
        console.error(`[reload] Error executing reload command: ${error}`);
        player.sendMessage(getString('command.reload.error'));
    }
}
