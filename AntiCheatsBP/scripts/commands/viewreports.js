/**
 * @file Defines the !viewreports command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'viewreports',
    syntax: '!viewreports [playername|id]',
    description: 'STUB - Admin command to view player reports.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}viewreports is not fully implemented yet.`);
}
