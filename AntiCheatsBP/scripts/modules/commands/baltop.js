/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'baltop',
    description: 'Shows the players with the top balances.',
    syntax: '!baltop',
    permissionLevel: 1024, // member
};

/**
 * Executes the baltop command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, getString } = dependencies;

    if (!config.economy?.enabled) {
        player.sendMessage(getString('command.economy.disabled'));
        return;
    }

    const { world } = dependencies.mc;
    const leaderboardJSON = world.getDynamicProperty('ac:economy_leaderboard');
    if (!leaderboardJSON || typeof leaderboardJSON !== 'string') {
        player.sendMessage(getString('command.baltop.noData'));
        return;
    }

    try {
        const leaderboard = JSON.parse(leaderboardJSON);
        if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
            player.sendMessage(getString('command.baltop.noData'));
            return;
        }

        const topPlayers = leaderboard.slice(0, config.economy.leaderboardSize ?? 10);

        let message = getString('command.baltop.header') + '\n';
        topPlayers.forEach((entry, index) => {
            message += getString('command.baltop.row', {
                rank: index + 1,
                playerName: entry.playerName,
                balance: entry.balance.toLocaleString(),
                symbol: config.economy.symbol,
            }) + '\n';
        });

        player.sendMessage(message.trim());

    } catch (error) {
        dependencies.logError('[baltop.execute] Failed to parse leaderboard data.', error);
        player.sendMessage(getString('command.baltop.error'));
    }
}
