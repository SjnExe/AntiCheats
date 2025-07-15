/**
 * @file Defines the !reload command, which reloads the server's configuration.
 */

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'reload',
    aliases: ['rl'],
    description: 'Reloads the server configuration.',
    permissionLevel: 0, // owner
    enabled: true,
};

/**
 * Executes the !reload command.
 * @param {import('@minecraft/server').Player} player
 */
export function execute(player) {
    player.runCommandAsync('reload');
}
