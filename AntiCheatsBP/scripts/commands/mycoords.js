/**
 * @file AntiCheatsBP/scripts/commands/mycoords.js
 * Defines the !mycoords command, allowing players to see their current coordinates and dimension.
 * @version 1.0.0
 */
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "mycoords",
    syntax: "!mycoords",
    description: "command.mycoords.description", // Localization key
    aliases: ["pos", "getpos", "location", "loc"],
    permissionLevel: permissionLevels.normal
};

/**
 * Executes the mycoords command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config } = dependencies; // Only need config for prefix if usage was shown, not needed here.

    const location = player.location;
    const dimensionId = player.dimension.id.split(':')[1] || player.dimension.id; // Get short name

    const x = Math.floor(location.x);
    const y = Math.floor(location.y);
    const z = Math.floor(location.z);

    player.sendMessage(
        getString("command.mycoords.message", {
            x: x.toString(),
            y: y.toString(),
            z: z.toString(),
            dimensionId: dimensionId
        })
    );
}
