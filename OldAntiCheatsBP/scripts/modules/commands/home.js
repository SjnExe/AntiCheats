import { getHome } from '../../core/homesManager.js';
import * as mc from '@minecraft/server';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'home',
    description: 'Teleports you to one of your homes.',
    syntax: '!home <name>',
    permissionLevel: 1024, // member
};

/**
 * Executes the home command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, getString } = dependencies;

    if (!config.homes?.enabled) {
        player.sendMessage(getString('command.homes.disabled'));
        return;
    }

    const homeName = args[0];
    if (!homeName) {
        player.sendMessage(getString('command.home.usage', { prefix: config.prefix }));
        return;
    }

    const home = getHome(player, homeName, dependencies);
    if (!home) {
        player.sendMessage(getString('command.home.notFound', { homeName }));
        playerUtils.playSoundForEvent(player, 'commandError', dependencies);
        return;
    }

    try {
        const dimension = mc.world.getDimension(home.dimensionId);
        await player.teleport(home.location, { dimension });
        player.sendMessage(getString('command.home.success', { homeName }));
        playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
    } catch (error) {
        player.sendMessage(getString('command.home.teleportError', { error: error.message }));
        playerUtils.playSoundForEvent(player, 'commandError', dependencies);
    }
}
