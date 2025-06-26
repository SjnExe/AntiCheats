/**
 * Defines the !version command to display the AntiCheat addon version.
 */
/**
 * @type {import('../types.js').CommandDefinition}
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels

export const definition = {
    name: 'version',
    syntax: '!version',
    description: 'Displays the AntiCheat addon version.',
    permissionLevel: permissionLevels.normal, // Changed to normal
    enabled: true,
};
/**
 * Executes the version command.
 */
export async function execute(player, _args, dependencies) {
    const { config } = dependencies; // Removed unused permissionLevels
    player.sendMessage(`§7AntiCheat Addon Version: §e${config.acVersion || 'N/A'}`);
}
