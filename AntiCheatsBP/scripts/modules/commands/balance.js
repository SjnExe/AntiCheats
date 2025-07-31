import { getBalance } from '../../core/economyManager.js';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'balance',
    description: 'Shows your current balance.',
    syntax: '!balance',
    permissionLevel: 1024, // member
};

/**
 * Executes the balance command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
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
