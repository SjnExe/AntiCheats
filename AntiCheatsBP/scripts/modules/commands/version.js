import { acVersion } from '../../config.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'version',
    syntax: '',
    description: 'Displays the current version of the AntiCheat addon.',
    permissionLevel: 1024, // member
};

/**
 * Executes the !version command.
 * Sends a message to the player with the current addon version.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {void}
 */
export function execute(player, _args, dependencies) {
    const { getString, playerUtils } = dependencies;

    if (!player?.isValid()) {
        console.warn('[VersionCommand] Invalid player object.');
        return;
    }

    const versionString = acVersion || getString('common.value.notAvailable');

    player.sendMessage(getString('command.version.message', { version: versionString }));
    playerUtils?.playSoundForEvent(player, 'commandSuccess', dependencies);

}
