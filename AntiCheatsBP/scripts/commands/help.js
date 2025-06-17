/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.1
 */
// Imports for permissionLevels, getString, and config are removed, they will come from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "help",
    syntax: "!help [command_name]",
    description: "Shows available commands or help for a specific command.",
    permissionLevel: permissionLevels.normal, // Accessible by all players
    enabled: true,
};

/**
 * Executes the help command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, expected to include an array of command definitions.
 */
export async function execute(player, args, dependencies) {
    // Use playerUtils.getPlayerPermissionLevel, commandDefinitions (array), config, permissionLevels, getString from dependencies
    const { playerUtils, commandDefinitionMap, /*assume commandDefinitions is an array derived from commandDefinitionMap if needed for .find*/ config, permissionLevels, getString } = dependencies;

    // For clarity, let's create an array from the commandDefinitionMap values if allCommands was meant to be that.
    // Or, if commandDefinitionMap is already passed as an array of definitions by this point, rename it.
    // For now, let's assume commandDefinitionMap is the Map, and we'll get an array from its values.
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
                player.sendMessage(getString("help.error.unknownCommand", { prefix: prefix, commandName: specificCommandName })); // getString from dependencies
                return;
            }

            // permissionLevels is now from dependencies
            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = "Unknown";
                for (const key in permissionLevels) { // permissionLevels from dependencies
                    if (permissionLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                player.sendMessage(
                    getString("help.specific.header", { prefix: prefix, commandName: foundCmdDef.name }) + "\n" + // getString from dependencies
                    getString("help.specific.syntax", { prefix: prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + "\n" + // getString from dependencies
                    getString("help.specific.description", { description: getString(foundCmdDef.description) }) + "\n" + // getString from dependencies
                    getString("help.specific.permission", { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel }) // getString from dependencies
                );
            } else {
                player.sendMessage(getString("help.specific.notFoundOrNoPermission", { commandName: specificCommandName, prefix: prefix })); // getString from dependencies
            }
        } else {
            player.sendMessage(getString("help.error.unknownCommand", { prefix: prefix, commandName: specificCommandName })); // getString from dependencies
        }
    } else {
        let helpMessage = getString("help.list.header", { prefix: prefix }) + "\n"; // getString from dependencies
        let commandsListed = 0;

        const categories = [
            {
                nameKey: "help.list.category.general",
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                nameKey: "help.list.category.tpa",
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem // Use config from dependencies
            },
            {
                nameKey: "help.list.category.moderation",
                permissionRequired: permissionLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel'] // 'ui' is an alias for panel
            },
            {
                nameKey: "help.list.category.administrative",
                permissionRequired: permissionLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder', 'setlang', 'log', 'reports', 'systeminfo']
            },
            {
                nameKey: "help.list.category.owner",
                permissionRequired: permissionLevels.owner,
                commands: ['testnotify'] // Removed 'config' as it's panel-only for owner
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
                const cmdDef = commandDefinitionsArray.find(cmd => cmd.name === commandName); // Use commandDefinitionsArray
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) {
                    let isEffectivelyEnabled = cmdDef.enabled;
                    if (config.commandSettings && typeof config.commandSettings[cmdDef.name]?.enabled === 'boolean') { // config from dependencies
                        isEffectivelyEnabled = config.commandSettings[cmdDef.name].enabled;
                    }
                    if (!isEffectivelyEnabled) {
                        return; // Skips this command in the list
                    }

                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    // Get localized description for each command
                    let description;
                    if (cmdDef.name === 'panel') {
                        description = getString("help.descriptionOverride.panel"); // getString from dependencies
                    } else if (cmdDef.name === 'ui') { // Handle 'ui' alias specifically if its description key is different
                        description = getString("help.descriptionOverride.ui"); // getString from dependencies
                    } else {
                        description = getString(cmdDef.description); // getString from dependencies
                    }

                    categoryHelp += `§e${prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                const categoryNameString = getString(category.nameKey); // getString from dependencies
                helpMessage += `\n${categoryNameString}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += getString("help.list.noCommandsAvailable"); // getString from dependencies
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
