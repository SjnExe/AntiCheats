import { world } from '@minecraft/server';

/** @type {import('../../types.js').CommandDefinition} */
export const definition = {
    name: 'debug',
    syntax: 'log [on|off]|watch <player> [on|off]|list|config|playerdata <PlayerName>|ranks|commands|actionprofiles',
    description: 'Manages debugging features of the AntiCheat and displays diagnostic information.',
    permissionLevel: 1, // admin
};

/**
 * Executes the debug command.
 * @param {import('@minecraft/server').Player} player
 * @param {string[]} args
 * @param {import('../../types.js').Dependencies} dependencies
 */
export async function execute(player, args, dependencies) {
    const { config, commandManager, updateConfigValue, playerDataManager, rankManager, checkActionProfiles } = dependencies;
    const prefix = config?.prefix ?? '!';

    const subCommand = args[0] ? args[0].toLowerCase() : 'help';
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

                const result = updateConfigValue('enableDebugLogging', newValue);
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
        case 'config':
            handleConfigDebug(player, dependencies);
            break;
        case 'playerdata':
            handlePlayerDataDebug(player, subArgs, playerDataManager);
            break;
        case 'ranks':
            handleRanksDebug(player, rankManager);
            break;
        case 'commands':
            handleCommandsDebug(player, dependencies, commandManager);
            break;
        case 'actionprofiles':
            handleActionProfilesDebug(player, checkActionProfiles);
            break;
        case 'help':
        default:
            player.sendMessage(
                '§2--- AntiCheat Debug Help ---\n' +
                `§a${prefix}debug log [on|off]§7 - Toggles debug logging.\n` +
                `§a${prefix}debug watch <player>§7 - Toggles watching a player.\n` +
                `§a${prefix}debug list§7 - Lists watched players.\n` +
                `§a${prefix}debug config§7 - Displays the current system configuration.\n` +
                `§a${prefix}debug playerdata <PlayerName>§7 - Shows cached data for a player.\n` +
                `§a${prefix}debug ranks§7 - Lists all registered ranks.\n` +
                `§a${prefix}debug commands§7 - Lists all registered commands and aliases.\n` +
                `§a${prefix}debug actionprofiles§7 - Lists all available action profiles.`,
            );
            break;
    }
}

function handleConfigDebug(player, { editableConfigValues }) {
    try {
        const configString = JSON.stringify(editableConfigValues, (key, value) => {
            if (typeof value === 'function') return 'function';
            if (typeof value === 'bigint') return value.toString();
            return value;
        }, 2);

        const chunks = configString.match(/.{1,900}/gs) || [];
        player.sendMessage('§2--- Current Configuration ---');
        chunks.forEach(chunk => player.sendMessage(chunk));

    } catch (e) {
        player.sendMessage(`§cFailed to serialize and display config: ${e.message}`);
    }
}

function handlePlayerDataDebug(player, args, playerDataManager) {
    const targetName = args[0];
    if (!targetName) {
        player.sendMessage('§cUsage: !debug playerdata <PlayerName>');
        return;
    }

    const targetPlayer = world.getAllPlayers().find(p => p.name === targetName);
    if (!targetPlayer) {
        player.sendMessage(`§cPlayer "${targetName}" not found or is offline.`);
        return;
    }

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    if (!pData) {
        player.sendMessage(`§cNo player data found for "${targetName}".`);
        return;
    }

    try {
        const pDataString = JSON.stringify(pData, (key, value) => {
            if (typeof value === 'bigint') return value.toString();
            if (key === 'someLargeArray' && Array.isArray(value)) return `Array[${value.length}]`;
            return value;
        }, 2);

        const chunks = pDataString.match(/.{1,900}/gs) || [];
        player.sendMessage(`§2--- Player Data for ${targetName} ---`);
        chunks.forEach(chunk => player.sendMessage(chunk));

    } catch (e) {
        player.sendMessage(`§cFailed to serialize and display player data: ${e.message}`);
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../../core/rankManager.js')} rankManager
 */
function handleRanksDebug(player, rankManager) {
    const { rankDefinitions } = rankManager;
    player.sendMessage('§2--- Registered Ranks ---');

    if (!rankDefinitions || rankDefinitions.length === 0) {
        player.sendMessage('§cNo ranks are defined.');
        return;
    }

    rankDefinitions.forEach(rank => {
        const rankInfo = `§aID: §f${rank.id}, §aName: §f${rank.name}, §aPriority: §f${rank.priority}, §aPerms: §f${rank.permissionLevel}`;
        player.sendMessage(rankInfo);
        const conditions = rank.conditions.map(c => `  - Type: ${c.type}, Prefix: ${c.prefix || 'N/A'}, Tag: ${c.tag || 'N/A'}`).join('\n');
        player.sendMessage(`§bConditions:\n${conditions}`);
    });
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../../types.js').Dependencies} dependencies
 * @param {import('../../core/commandManager.js')} commandManager
 */
function handleCommandsDebug(player, dependencies, commandManager) {
    const { config } = dependencies;
    const allCommands = commandManager.getAllRegisteredCommandNames();
    player.sendMessage('§2--- Registered Commands ---');
    player.sendMessage(allCommands.join(', '));

    player.sendMessage('\n§2--- Command Aliases ---');
    const aliasEntries = Array.from(config.commandAliases.entries());
    if (aliasEntries.length > 0) {
        const aliasString = aliasEntries.map(([alias, cmd]) => `${alias} -> ${cmd}`).join(', ');
        player.sendMessage(aliasString);
    } else {
        player.sendMessage('No aliases are configured.');
    }
}

function handleActionProfilesDebug(player, checkActionProfiles) {
    player.sendMessage('§2--- Action Profiles ---');
    const profileNames = Object.keys(checkActionProfiles);

    if (profileNames.length === 0) {
        player.sendMessage('§cNo action profiles are defined.');
        return;
    }

    profileNames.forEach(name => {
        const profile = checkActionProfiles[name];
        const enabledStatus = profile.enabled ? '§aEnabled' : '§cDisabled';
        let actions = [];
        if (profile.flag) actions.push(`Flag(+${profile.flag.increment})`);
        if (profile.notifyAdmins) actions.push('Notify');
        if (profile.log) actions.push('Log');
        if (profile.cancelMessage) actions.push('CancelMsg');
        if (profile.customAction) actions.push(profile.customAction);

        player.sendMessage(`§b${name}§r [${enabledStatus}§r]: ${actions.join(', ')}`);
    });
}
