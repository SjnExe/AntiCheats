/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'spawn',
    description: 'Teleports you to the server spawn point or sets it if you are an admin.',
    syntax: '!spawn [set]',
    permissionLevel: 1024, // member
};

/**
 * Executes the spawn command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { getString, mc, config, permissionLevels, rankManager } = dependencies;
    const { world } = mc;

    const playerPermission = rankManager.getPlayerPermissionLevel(player, dependencies);

    if (args[0]?.toLowerCase() === 'set') {
        if (playerPermission > permissionLevels.admin) {
            player.sendMessage(getString('common.error.permissionDenied'));
            return;
        }

        const location = player.location;
        const dimension = player.dimension.id;

        config.spawnLocation = {
            x: location.x,
            y: location.y,
            z: location.z,
            dimension: dimension,
        };

        player.sendMessage(getString('command.spawn.set.success'));
        return;
    }

    try {
        let spawnPoint;
        let dimension;

        if (config.spawnLocation) {
            spawnPoint = { x: config.spawnLocation.x, y: config.spawnLocation.y, z: config.spawnLocation.z };
            dimension = world.getDimension(config.spawnLocation.dimension);
        } else {
            spawnPoint = world.getDefaultSpawnLocation();
            dimension = world.getDimension('overworld');
        }

        await player.teleport(spawnPoint, { dimension: dimension });
        player.sendMessage(getString('command.spawn.success'));
    } catch (error) {
        dependencies.logError(`[spawn.execute] Failed to teleport player: ${error}`, error);
        player.sendMessage(getString('command.spawn.error'));
    }
}
