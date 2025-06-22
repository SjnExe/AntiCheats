/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js';
/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "help",
    syntax: "!help [command_name]",
    description: "Shows available commands or help for a specific command.",
    permissionLevel: permissionLevels.normal,
    enabled: true,
};
/**
 * Executes the help command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, expected to include an array of command definitions.
 */
export async function execute(player, args, dependencies) {
    const { playerUtils, commandDefinitionMap, config, permissionLevels: depPermLevels, getString } = dependencies;

    const commandDefinitionsArray = Array.from(commandDefinitionMap.values());
    const userPermissionLevel = playerUtils.getPlayerPermissionLevel(player);
    const prefix = config.prefix;

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(prefix, "");
        let foundCmdDef = commandDefinitionsArray.find(cmd => cmd.name === specificCommandName);

        if (!foundCmdDef && config.commandAliases) {
            const aliasTarget = Object.keys(config.commandAliases).find(alias => alias === specificCommandName && config.commandAliases[alias]);
            if (aliasTarget) {
                const targetCmdName = config.commandAliases[aliasTarget];
                foundCmdDef = commandDefinitionsArray.find(cmd => cmd.name === targetCmdName);
            }
        }

        if (foundCmdDef) {
            let isEffectivelyEnabled = foundCmdDef.enabled;
            if (config.commandSettings && typeof config.commandSettings[foundCmdDef.name]?.enabled === 'boolean') {
                isEffectivelyEnabled = config.commandSettings[foundCmdDef.name].enabled;
            }

            if (!isEffectivelyEnabled) {
                player.sendMessage(getString("help.error.unknownCommand", { commandName: specificCommandName, prefix: prefix }));
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = "Unknown";
                for (const key in depPermLevels) {
                    if (depPermLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                const description = (foundCmdDef.description.startsWith("command.") || foundCmdDef.description.startsWith("help.descriptionOverride."))
                                    ? getString(foundCmdDef.description)
                                    : foundCmdDef.description;

                player.sendMessage(
                    getString("help.specific.header", { prefix: prefix, commandName: foundCmdDef.name }) + "\n" +
                    getString("help.specific.syntax", { prefix: prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + "\n" +
                    getString("help.specific.description", { description: description }) + "\n" +
                    getString("help.specific.permission", { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel.toString() })
                );
            } else {
                player.sendMessage(getString("help.specific.notFoundOrNoPermission", { commandName: specificCommandName, prefix: prefix }));
            }
        } else {
            player.sendMessage(getString("help.error.unknownCommand", { commandName: specificCommandName, prefix: prefix }));
        }
    } else {
        let helpMessage = getString("help.list.header", { prefix: prefix }) + "\n";
        let commandsListed = 0;

        const categories = [
            {
                nameKey: "help.list.category.general",
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                nameKey: "help.list.category.tpa",
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem
            },
            {
                nameKey: "help.list.category.moderation",
                permissionRequired: depPermLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel']
            },
            {
                nameKey: "help.list.category.administrative",
                permissionRequired: depPermLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder', 'setlang', 'log', 'reports', 'systeminfo']
            },
            {
                nameKey: "help.list.category.owner",
                permissionRequired: depPermLevels.owner,
                commands: ['testnotify']
            }
        ];

        categories.forEach(category => {
            if (category.condition && !category.condition()) {
                return;
            }

            if (category.permissionRequired && userPermissionLevel > category.permissionRequired) {
                return;
            }

            let categoryHelp = "";
            category.commands.forEach(commandName => {
                const cmdDef = commandDefinitionsArray.find(cmd => cmd.name === commandName);
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
                    if (description.startsWith("command.") || description.startsWith("help.descriptionOverride.")) {
                        if (cmdDef.name === 'panel') {
                            description = getString("help.descriptionOverride.panel");
                        } else if (cmdDef.name === 'ui') {
                            description = getString("help.descriptionOverride.ui");
                        } else {
                            description = getString(cmdDef.description);
                        }
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
            helpMessage += getString("help.list.noCommandsAvailable");
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
