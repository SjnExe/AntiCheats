/**
 * Defines the !version command to display the AntiCheat addon version.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'version',
    syntax: '!version',
    description: 'Displays the AntiCheat addon version.',
    permissionLevel: permissionLevels.member, // Changed to normal
    enabled: true,
};
/**
 * Executes the version command.
 */
export async function execute(player, _args, dependencies) {
    const { config, getString } = dependencies;
    player.sendMessage(getString('command.version.message', { version: config.acVersion || getString('common.value.notAvailable') }));
}
