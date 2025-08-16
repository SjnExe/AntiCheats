import { setHome } from '../../core/homesManager.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'sethome',
    description: 'Sets a home at your current location.',
    syntax: '!sethome <name>',
    permissionLevel: 1024, // member
};

/**
 * Executes the sethome command.
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
        player.sendMessage(getString('command.sethome.usage', { prefix: config.prefix }));
        return;
    }

    const result = setHome(player, homeName, dependencies);
    player.sendMessage(result.message);
    if (result.success) {
        playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
    } else {
        playerUtils.playSoundForEvent(player, 'commandError', dependencies);
    }
}
