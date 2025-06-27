/**
 * @file Defines the !watch command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'watch',
    syntax: '!watch <playername>',
    description: 'STUB - Adds a player to the watchlist for detailed logging.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}watch is not fully implemented yet.`);
}
