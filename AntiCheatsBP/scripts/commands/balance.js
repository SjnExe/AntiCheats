/**
 * @file Defines the !balance command.
 * @module AntiCheatsBP/scripts/commands/balance
 */
import { getBalance } from '../core/economyManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'balance',
    description: 'Shows your current balance.',
    syntax: '!balance',
    permissionLevel: 1024, // member
    enabled: true,
};

/**
 * Executes the !balance command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function execute(player, args, dependencies) {
    const { config, getString } = dependencies;

    if (!config.economy?.enabled) {
        player.sendMessage(getString('command.economy.disabled'));
        return;
    }

    const balance = getBalance(player, dependencies);
    player.sendMessage(getString('command.balance.success', { balance }));
}
