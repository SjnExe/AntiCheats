/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'restart',
    description: 'Reloads the entire world, including resource and behavior packs.',
    permissionLevel: 0, // owner
};

/**
 * Executes the restart command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export function execute(player, args, { playerUtils }) {
    const { getString } = playerUtils;

    try {
        player.runCommandAsync('reload all');
        player.sendMessage(getString('command.restart.success'));
    } catch (error) {
        console.error(`[restart] Error executing restart command: ${error}`);
        player.sendMessage(getString('command.restart.error'));
    }
}
