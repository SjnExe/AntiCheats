/**
 * @file Defines the !setspawn command.
 * @module AntiCheatsBP/scripts/commands/setspawn
 */

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'setspawn',
    description: 'Sets the server spawn point to your current location.',
    syntax: '!setspawn',
    permissionLevel: 4, // admin
    enabled: true,
};

/**
 * Executes the !setspawn command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { config, getString } = dependencies;

    const location = player.location;
    const dimension = player.dimension.id;

    config.spawnLocation = {
        x: location.x,
        y: location.y,
        z: location.z,
        dimension: dimension,
    };

    player.sendMessage(getString('command.setspawn.success'));
}
