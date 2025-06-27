/**
 * @file Defines the !purgeflags command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'purgeflags',
    syntax: '!purgeflags <playername>',
    description: 'STUB - Admin command to completely purge all flags for a player.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}purgeflags is not fully implemented yet.`);
}
