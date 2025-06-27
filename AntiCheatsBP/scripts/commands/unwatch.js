/**
 * @file Defines the !unwatch command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'unwatch',
    syntax: '!unwatch <playername>',
    description: 'STUB - Removes a player from the watchlist.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}unwatch is not fully implemented yet.`);
}
