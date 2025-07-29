/**
 * @file Defines the !spawn command.
 * @module AntiCheatsBP/scripts/commands/spawn
 */

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'spawn',
    description: 'Teleports you to the server spawn point.',
    syntax: '!spawn',
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !spawn command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export async function execute(player, args, dependencies) {
    const { getString, mc } = dependencies;
    const { world } = mc;

    try {
        const spawnPoint = world.getDefaultSpawnLocation();
        await player.teleport(spawnPoint, { dimension: world.getDimension('overworld') });
        player.sendMessage(getString('command.spawn.success'));
    } catch (error) {
        dependencies.logError(`[spawn.execute] Failed to teleport player: ${error}`, error);
        player.sendMessage(getString('command.spawn.error'));
    }
}
