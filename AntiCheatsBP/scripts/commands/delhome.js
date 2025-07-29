/**
 * @file Defines the !delhome command.
 * @module AntiCheatsBP/scripts/commands/delhome
 */
import { deleteHome } from '../core/homesManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'delhome',
    description: 'Deletes one of your homes.',
    syntax: '!delhome <name>',
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !delhome command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, getString } = dependencies;

    if (!config.homes?.enabled) {
        player.sendMessage(getString('command.homes.disabled'));
        return;
    }

    const homeName = args[0];
    if (!homeName) {
        player.sendMessage(getString('command.delhome.usage', { prefix: config.prefix }));
        return;
    }

    const result = deleteHome(player, homeName, dependencies);
    player.sendMessage(result.message);
    if (result.success) {
        playerUtils.playSoundForEvent(player, 'commandSuccess', dependencies);
    } else {
        playerUtils.playSoundForEvent(player, 'commandError', dependencies);
    }
}
