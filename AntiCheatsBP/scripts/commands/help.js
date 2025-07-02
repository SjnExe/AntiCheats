/**
 * @file Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 */
import { permissionLevels } from '../core/rankManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'help',
    syntax: '!help [command_name]',
    description: 'Shows available commands or help for a specific command.',
    permissionLevel: permissionLevels.member,
    enabled: true,
};

/**
 * Executes the !help command.
 * Displays a list of available commands filtered by the user's permission level,
 * or detailed information if a specific command name is provided.
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} args - Command arguments: [command_name].
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, args, dependencies) {
    const { commandDefinitionMap, config, permissionLevels: depPermLevels, rankManager, getString } = dependencies;

    const userPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    const prefix = config.prefix;

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(prefix, '');
        let foundCmdDef = commandDefinitionMap.get(specificCommandName);

        if (!foundCmdDef && config.commandAliases) {
            const aliasTargetName = config.commandAliases[specificCommandName];
            if (aliasTargetName) {
                foundCmdDef = commandDefinitionMap.get(aliasTargetName);
            }
        }

        if (foundCmdDef) {
            let isEffectivelyEnabled = foundCmdDef.enabled;
            if (config.commandSettings && typeof config.commandSettings[foundCmdDef.name]?.enabled === 'boolean') {
                isEffectivelyEnabled = config.commandSettings[foundCmdDef.name].enabled;
            }

            if (!isEffectivelyEnabled) {
                player.sendMessage(getString('command.help.unknownCommand', { prefix: prefix, commandName: specificCommandName }));
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = 'Unknown'; // Fallback
                for (const key in depPermLevels) {
                    if (depPermLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                // Assuming commandDef.description is already a key or plain text.
                // If it's a key, it should be resolved by getString if this help text itself becomes localized.
                // For now, we use it directly as it's from the command definition.
                const description = getString(foundCmdDef.description) || foundCmdDef.description;


                player.sendMessage(
                    getString('command.help.specific.header', { prefix: prefix, commandName: foundCmdDef.name }) + '\n' +
                    getString('command.help.specific.syntax', { prefix: prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + '\n' +
                    getString('command.help.specific.description', { description: description }) + '\n' +
                    getString('command.help.specific.permission', { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel.toString() })
                );
            } else {
                player.sendMessage(getString('command.help.noPermission', { prefix: prefix, commandName: specificCommandName }));
            }
        } else {
            player.sendMessage(getString('command.help.unknownCommand', { prefix: prefix, commandName: specificCommandName }));
        }
    } else {
        let helpMessage = getString('command.help.header', { prefix: prefix }) + '\n';
        let commandsListed = 0;

        const categories = [
            {
                nameStringKey: 'command.help.category.general',
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version'],
            },
            {
                nameStringKey: 'command.help.category.teleport',
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem,
            },
            {
                nameStringKey: 'command.help.category.moderation',
                permissionRequired: depPermLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel'],
            },
            {
                nameStringKey: 'command.help.category.admin',
                permissionRequired: depPermLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder'],
            },
            {
                nameStringKey: 'command.help.category.owner',
                permissionRequired: depPermLevels.owner,
                commands: ['testnotify', 'addrank', 'removerank', 'listranks'],
            },
        ];

        categories.forEach(category => {
            if (category.condition && !category.condition()) {
                return;
            }

            if (typeof category.permissionRequired === 'number' && userPermissionLevel > category.permissionRequired) {
                return;
            }

            let categoryHelp = '';
            category.commands.forEach(commandName => {
                const cmdDef = commandDefinitionMap.get(commandName);
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) {
                    let isEffectivelyEnabled = cmdDef.enabled;
                    if (config.commandSettings && typeof config.commandSettings[cmdDef.name]?.enabled === 'boolean') {
                        isEffectivelyEnabled = config.commandSettings[cmdDef.name].enabled;
                    }
                    if (!isEffectivelyEnabled) {
                        return;
                    }

                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                     // Assuming cmdDef.description is a key or already localized text
                    const description = getString(cmdDef.description) || cmdDef.description;
                    categoryHelp += getString('command.help.entryFormat', { prefix: prefix, commandName: cmdDef.name, syntaxArgs: syntaxArgs, description: description }) + '\n';
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                helpMessage += `\n${getString(category.nameStringKey)}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += getString('command.help.noCommandsAvailable');
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
