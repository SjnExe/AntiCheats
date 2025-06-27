/**
 * @file Defines the !report command - STUB
 */
import { permissionLevels } from '../core/rankManager.js';

export const definition = {
    name: 'report',
    syntax: '!report <playername> <reason>',
    description: 'STUB - Reports a player for rule violations.',
    permissionLevel: permissionLevels.normal,
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config } = dependencies;
    player.sendMessage(`§cCommand ${config.prefix}report is not fully implemented yet.`);
}
