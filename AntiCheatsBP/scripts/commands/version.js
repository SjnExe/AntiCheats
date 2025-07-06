/**
 * @file Defines the !version command, which displays the current version of the AntiCheat addon.
 */
import { permissionLevels } from '../core/rankManager.js';
import { acVersion } from '../config.js'; // Import the version string from config.js

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'version',
    syntax: '', // No arguments, prefix handled by commandManager
    description: 'Displays the current version of the AntiCheat addon.',
    aliases: ['ver', 'v'], // Aliases are managed in config.js commandAliases
    permissionLevel: permissionLevels.member, // Accessible by all members
    enabled: true,
};

/**
 * Executes the !version command.
 * Sends a message to the player with the current addon version.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { getString, playerUtils } = dependencies; // playerUtils for sound

    if (!player?.isValid()) {
        console.warn('[VersionCommand] Invalid player object.');
        return;
    }

    // acVersion is imported directly from config.js
    const versionString = acVersion || getString('common.value.notAvailable'); // Fallback if acVersion is undefined

    player.sendMessage(getString('command.version.message', { version: versionString }));
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    // No server-side logging for this informational command by default.
    // Optional: Add a debug log if needed.
    // playerUtils?.debugLog(`[VersionCommand] Player ${player.nameTag} checked version: ${versionString}`, player.nameTag, dependencies);
}
