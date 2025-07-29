/**
 * @file Defines the !pay command.
 * @module AntiCheatsBP/scripts/commands/pay
 */
import { getBalance, subtractBalance, addBalance } from '../core/economyManager.js';

/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'pay',
    description: 'Pays another player from your balance.',
    syntax: '!pay <player> <amount>',
    permissionLevel: 1024, // member
};

/**
 * Executes the !pay command.
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} args Command arguments.
 * @param {import('../types.js').Dependencies} dependencies The dependencies object.
 */
export function execute(player, args, dependencies) {
    const { config, playerUtils, getString } = dependencies;

    if (!config.economy?.enabled) {
        player.sendMessage(getString('command.economy.disabled'));
        return;
    }

    const targetPlayerName = args[0];
    const amount = parseInt(args[1], 10);

    if (!targetPlayerName || isNaN(amount) || amount <= 0) {
        player.sendMessage(getString('command.pay.usage', { prefix: config.prefix }));
        return;
    }

    const targetPlayer = playerUtils.findPlayer(targetPlayerName);
    if (!targetPlayer) {
        player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        return;
    }

    if (targetPlayer.id === player.id) {
        player.sendMessage(getString('command.pay.cannotPaySelf'));
        return;
    }

    const balance = getBalance(player, dependencies);
    if (balance < amount) {
        player.sendMessage(getString('command.pay.insufficientFunds', { balance }));
        return;
    }

    if (subtractBalance(player, amount, dependencies) && addBalance(targetPlayer, amount, dependencies)) {
        player.sendMessage(getString('command.pay.success.sender', { amount, playerName: targetPlayer.nameTag }));
        targetPlayer.sendMessage(getString('command.pay.success.receiver', { amount, playerName: player.nameTag }));
    } else {
        player.sendMessage(getString('command.pay.error'));
    }
}
