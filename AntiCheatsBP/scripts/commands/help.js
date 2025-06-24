/**
 * @file Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 */
import { permissionLevels } from '../core/rankManager.js'; // Standardized import

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'help',
    syntax: '!help [command_name]',
    description: 'Shows available commands or help for a specific command.',
    permissionLevel: permissionLevels.normal, // Accessible to all players
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
    const { commandDefinitionMap, config, permissionLevels: depPermLevels, getString, rankManager } = dependencies;

    const commandDefinitionsArray = Array.from(commandDefinitionMap.values());
    const userPermissionLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    const prefix = config.prefix;

    if (args[0]) { // User requested help for a specific command
        const specificCommandName = args[0].toLowerCase().replace(prefix, '');
        let foundCmdDef = commandDefinitionMap.get(specificCommandName);

        // Check aliases if direct name not found
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
                player.sendMessage(getString('help.error.unknownCommand', { commandName: specificCommandName, prefix: prefix }));
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1); // Get args part of syntax
                let permLevelName = 'Unknown';
                // Find the string name for the permission level number
                for (const key in depPermLevels) {
                    if (depPermLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                // Get localized description if key is provided, otherwise use raw description
                const description = (foundCmdDef.description.startsWith('command.') || foundCmdDef.description.startsWith('help.descriptionOverride.')) ?
                                    getString(foundCmdDef.description) :
                                    foundCmdDef.description;

                player.sendMessage(
                    getString('help.specific.header', { prefix: prefix, commandName: foundCmdDef.name }) + '\n' +
                    getString('help.specific.syntax', { prefix: prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + '\n' +
                    getString('help.specific.description', { description: description }) + '\n' +
                    getString('help.specific.permission', { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel.toString() })
                );
            } else {
                // Command exists but player doesn't have permission - still show as unknown to avoid revealing commands
                player.sendMessage(getString('help.specific.notFoundOrNoPermission', { commandName: specificCommandName, prefix: prefix }));
            }
        } else {
            player.sendMessage(getString('help.error.unknownCommand', { commandName: specificCommandName, prefix: prefix }));
        }
    } else { // User requested general help (list of commands)
        let helpMessage = getString('help.list.header', { prefix: prefix }) + '\n';
        let commandsListed = 0;

        // Predefined categories for organizing help output
        const categories = [
            {
                nameKey: 'help.list.category.general',
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version'],
            },
            {
                nameKey: 'help.list.category.tpa',
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem,
            },
            {
                nameKey: 'help.list.category.moderation',
                permissionRequired: depPermLevels.moderator, // Ensure 'moderator' exists in permissionLevels
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel'],
            },
            {
                nameKey: 'help.list.category.administrative',
                permissionRequired: depPermLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder', 'setlang' /*,'log', 'reports', 'systeminfo' - these might be panel only*/],
            },
            {
                nameKey: 'help.list.category.owner',
                permissionRequired: depPermLevels.owner,
                commands: ['testnotify', 'addrank', 'removerank', 'listranks'], // Moved rank commands here
            },
        ];

        categories.forEach(category => {
            if (category.condition && !category.condition()) {
                return; // Skip category if its condition is not met (e.g., TPA system disabled)
            }

            // Skip category if player doesn't meet the base permission level for it
            if (category.permissionRequired && userPermissionLevel > category.permissionRequired) {
                return;
            }

            let categoryHelp = '';
            category.commands.forEach(commandName => {
                const cmdDef = commandDefinitionMap.get(commandName);
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) { // Check individual command permission
                    let isEffectivelyEnabled = cmdDef.enabled;
                    if (config.commandSettings && typeof config.commandSettings[cmdDef.name]?.enabled === 'boolean') {
                        isEffectivelyEnabled = config.commandSettings[cmdDef.name].enabled;
                    }
                    if (!isEffectivelyEnabled) {
                        return; // Skip disabled commands
                    }

                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    let description = cmdDef.description;
                    // Handle localized descriptions
                    if (description.startsWith('command.') || description.startsWith('help.descriptionOverride.')) {
                        description = getString(description); // Default params if none specific needed
                    }
                    categoryHelp += `§e${prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                const categoryNameString = getString(category.nameKey);
                helpMessage += `\n${categoryNameString}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += getString('help.list.noCommandsAvailable');
        } else {
            if (helpMessage.endsWith('\n')) { // Trim trailing newline if any
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
