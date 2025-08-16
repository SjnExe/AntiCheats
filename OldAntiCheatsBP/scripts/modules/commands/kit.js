import { giveKit } from '../../core/kitsManager.js';
import { kits } from '../../core/kits.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'kit',
    description: 'Gives you a kit of items.',
    syntax: '!kit [name]',
    permissionLevel: 1024, // member
};

/**
 * Executes the kit command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, getString } = dependencies;

    if (!config.kits?.enabled) {
        player.sendMessage(getString('command.kit.disabled'));
        return;
    }

    const kitName = args[0];
    if (!kitName) {
        const availableKits = Object.keys(kits).join(', ');
        player.sendMessage(getString('command.kit.usage', { prefix: config.prefix, kits: availableKits }));
        return;
    }

    const result = giveKit(player, kitName, dependencies);
    player.sendMessage(result.message);
    if (result.success) {
        playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
    } else {
        playerUtils.playSoundForEvent(player, 'commandError', dependencies);
    }
}
