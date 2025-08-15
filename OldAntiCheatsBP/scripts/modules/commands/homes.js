import { getHomes } from '../../core/homesManager.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'homes',
    description: 'Lists all of your homes.',
    syntax: '!homes',
    permissionLevel: 1024, // member
};

/**
 * Executes the homes command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export function execute(player, args, dependencies) {
    const { config, getString } = dependencies;

    if (!config.homes?.enabled) {
        player.sendMessage(getString('command.homes.disabled'));
        return;
    }

    const homes = getHomes(player, dependencies);
    if (homes.length === 0) {
        player.sendMessage(getString('command.homes.noHomes'));
        return;
    }

    const homeList = homes.map(home => home.name).join(', ');
    player.sendMessage(getString('command.homes.list', { homes: homeList }));
}
