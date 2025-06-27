/**
 * @file Defines the !clearreports command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'clearreports',
    syntax: '!clearreports <playername|id|all>',
    description: 'STUB - Admin command to clear player reports.',
    permissionLevel: permissionLevels.admin,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}clearreports is not fully implemented yet.`);
}
