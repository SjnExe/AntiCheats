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
    permissionLevel: permissionLevels.normal,
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
    const { commandDefinitionMap, config, permissionLevels: depPermLevels, rankManager } = dependencies;

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
                player.sendMessage(`§cUnknown command: ${prefix}${specificCommandName}`);
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = 'Unknown';
                for (const key in depPermLevels) {
                    if (depPermLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                const description = foundCmdDef.description;

                player.sendMessage(
                    `§6--- Help: ${prefix}${foundCmdDef.name} ---` + '\n' +
                    `§eSyntax: ${prefix}${foundCmdDef.name} ${syntaxArgs}` + '\n' +
                    `§7Description: ${description}` + '\n' +
                    `§7Permission: ${permLevelName} (Level ${foundCmdDef.permissionLevel})`
                );
            } else {
                // Command exists but player doesn't have permission - still show as unknown to avoid revealing commands
                player.sendMessage(`§cCommand ${prefix}${specificCommandName} not found or you do not have permission.`);
            }
        } else {
            player.sendMessage(`§cUnknown command: ${prefix}${specificCommandName}`);
        }
    } else {
        let helpMessage = `§6--- Available Commands (Prefix: ${prefix}) ---§r\n`;
        let commandsListed = 0;

        // Predefined categories for organizing help output
        const categories = [
            {
                nameString: "§2General Commands:§r",
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version'],
            },
            {
                nameString: "§2Teleportation Commands:§r",
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem,
            },
            {
                nameString: "§cModeration Commands:§r",
                permissionRequired: depPermLevels.moderator, // Ensure 'moderator' exists in permissionLevels
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel'],
            },
            {
                nameString: "§cAdministrative Commands:§r",
                permissionRequired: depPermLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder' /*,'log', 'reports', 'systeminfo' - these might be panel only*/],
            },
            {
                nameString: "§4Owner Commands:§r",
                permissionRequired: depPermLevels.owner,
                commands: ['testnotify', 'addrank', 'removerank', 'listranks'], // Moved rank commands here
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
                    let description = cmdDef.description;
                    categoryHelp += `§e${prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                helpMessage += `\n${category.nameString}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += "§7No commands available to you at this time.";
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
