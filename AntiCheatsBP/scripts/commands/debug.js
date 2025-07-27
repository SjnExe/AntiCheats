/**
 * @file Defines the !debug command for managing the AntiCheat's debugging features.
 */
/** @type {import('../types.js').CommandDefinition} */
export const definition = {
    name: 'debug',
    syntax: 'log [on|off]|watch <player> [on|off]|list',
    description: 'Manages debugging features of the AntiCheat.',
    permissionLevel: 1, // admin
    enabled: true,
};

/**
 * Executes the !debug command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, playerUtils, playerDataManager, logManager, getString, commandManager, configModule } = dependencies;
    const prefix = config?.prefix ?? '!';

    if (args.length < 1) {
        player.sendMessage(`§cUsage: ${prefix}debug ${definition.syntax}`);
        return;
    }

    const subCommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subCommand) {
        case 'log':
            {
                const action = subArgs[0]?.toLowerCase();
                let newValue;
                if (action === 'on') {
                    newValue = true;
                } else if (action === 'off') {
                    newValue = false;
                } else {
                    player.sendMessage(`§cUsage: ${prefix}debug log [on|off]`);
                    return;
                }

                const result = configModule.updateConfigValue('enableDebugLogging', newValue);
                player.sendMessage(result.success ? `§aDebug logging is now ${newValue ? 'ON' : 'OFF'}.` : `§c${result.message}`);
            }
            break;
        case 'watch':
            {
                const watchCommand = commandManager.getCommand('watch');
                if (watchCommand) {
                    await watchCommand.execute(player, subArgs, dependencies);
                } else {
                    player.sendMessage('§cWatch command not found.');
                }
            }
            break;
        case 'list':
            {
                const listWatchedCommand = commandManager.getCommand('listwatched');
                if (listWatchedCommand) {
                    listWatchedCommand.execute(player, subArgs, dependencies);
                } else {
                    player.sendMessage('§cListwatched command not found.');
                }
            }
            break;
        default:
            player.sendMessage(`§cUsage: ${prefix}debug ${definition.syntax}`);
            break;
    }
}
