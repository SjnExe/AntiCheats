/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.1
 */
import { permissionLevels } from '../core/rankManager.js'; // Import permissionLevels
// getString, and config are removed, they will come from dependencies.

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "help",
    syntax: "!help [command_name]",
    description: "Shows available commands or help for a specific command.",
    permissionLevel: permissionLevels.normal, // Use imported permissionLevels
    enabled: true,
};

/**
 * Executes the help command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, expected to include an array of command definitions.
 */
export async function execute(player, args, dependencies) {
    // Use playerUtils.getPlayerPermissionLevel, commandDefinitions (array), config, permissionLevels from dependencies
    const { playerUtils, commandDefinitionMap, config, permissionLevels } = dependencies; // getString removed

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
                // "help.error.unknownCommand" -> "§cUnknown command: \"{commandName}\". Type {prefix}help for a list of available commands."
                player.sendMessage(`§cUnknown command: "${specificCommandName}". Type ${prefix}help for a list of available commands.`);
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
                // "help.specific.header" -> "§l§b--- Help: {prefix}{commandName} ---"
                // "help.specific.syntax" -> "§eSyntax:§r {prefix}{commandName} {syntaxArgs}"
                // "help.specific.description" -> "§bDescription:§r {description}" (Note: description itself might be a key)
                // "help.specific.permission" -> "§7Permission: {permLevelName} (Level {permissionLevel})"
                // For foundCmdDef.description, if it's a key, it needs to be resolved. Assuming it's already a direct string.
                const description = (foundCmdDef.description.startsWith("command.") || foundCmdDef.description.startsWith("help.descriptionOverride."))
                                    ? dependencies.getString(foundCmdDef.description) // Resolve if it's a key
                                    : foundCmdDef.description; // Use as is if direct

                player.sendMessage(
                    `§l§b--- Help: ${prefix}${foundCmdDef.name} ---\n` +
                    `§eSyntax:§r ${prefix}${foundCmdDef.name} ${syntaxArgs}\n` +
                    `§bDescription:§r ${description}\n` +
                    `§7Permission: ${permLevelName} (Level ${foundCmdDef.permissionLevel})`
                );
            } else {
                // "help.specific.notFoundOrNoPermission" -> "§cCommand \"{commandName}\" not found or you do not have permission to view its details. Type {prefix}help for a list of available commands."
                player.sendMessage(`§cCommand "${specificCommandName}" not found or you do not have permission to view its details. Type ${prefix}help for a list of available commands.`);
            }
        } else {
            // "help.error.unknownCommand" -> "§cUnknown command: \"{commandName}\". Type {prefix}help for a list of available commands."
            player.sendMessage(`§cUnknown command: "${specificCommandName}". Type ${prefix}help for a list of available commands.`);
        }
    } else {
        // "help.list.header" -> "§l§bAvailable Commands (prefix: {prefix}):§r"
        let helpMessage = `§l§bAvailable Commands (prefix: ${prefix}):§r\n`;
        let commandsListed = 0;

        const categories = [
            {
                nameKey: "help.list.category.general", // -> "--- General Player Commands ---"
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                nameKey: "help.list.category.tpa", // -> "--- TPA Commands ---"
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem
            },
            {
                nameKey: "help.list.category.moderation", // -> "--- Moderation Commands ---"
                permissionRequired: permissionLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel']
            },
            {
                nameKey: "help.list.category.administrative", // -> "--- Administrative Commands ---"
                permissionRequired: permissionLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder', 'setlang', 'log', 'reports', 'systeminfo']
            },
            {
                nameKey: "help.list.category.owner", // -> "--- Owner Commands ---"
                permissionRequired: permissionLevels.owner,
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
                    // Resolve command description. It might be a key or a direct string.
                    let description = cmdDef.description; // Default to the direct string
                    if (description.startsWith("command.") || description.startsWith("help.descriptionOverride.")) {
                         // Attempt to resolve if it looks like a key.
                         // This relies on `dependencies` potentially having `getString` if this path is taken.
                         // However, the goal is to remove getString. This indicates descriptions in cmdDef should be direct strings.
                         // For now, assuming descriptions are direct. If any are keys, they won't be localized.
                         // This part of the logic might need adjustment if command definitions store keys instead of strings.
                         // Based on other commands, `definition.description` is usually a static string.
                         // The special overrides for panel/ui are handled here.
                        if (cmdDef.name === 'panel') {
                            description = "Opens the Admin/User Interface Panel."; // "help.descriptionOverride.panel"
                        } else if (cmdDef.name === 'ui') {
                            description = "Alias for !panel. Opens the Admin/User Interface Panel."; // "help.descriptionOverride.ui"
                        }
                        // If other cmdDef.description are keys, they won't be translated without getString.
                        // This refactor assumes cmdDef.description are actual strings.
                    }


                    categoryHelp += `§e${prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                // Resolve category name
                const categoryNameString = dependencies.getString(category.nameKey); // This is one of the few places getString would still be needed if category names are keys
                                                                                // Or, make category names direct strings in the categories array.
                                                                                // "help.list.category.general" -> "--- General Player Commands ---"
                                                                                // "help.list.category.tpa" -> "--- TPA Commands ---"
                                                                                // "help.list.category.moderation" -> "--- Moderation Commands ---"
                                                                                // "help.list.category.administrative" -> "--- Administrative Commands ---"
                                                                                // "help.list.category.owner" -> "--- Owner Commands ---"
                const categoryNames = {
                    "help.list.category.general": "--- General Player Commands ---",
                    "help.list.category.tpa": "--- TPA Commands ---",
                    "help.list.category.moderation": "--- Moderation Commands ---",
                    "help.list.category.administrative": "--- Administrative Commands ---",
                    "help.list.category.owner": "--- Owner Commands ---"
                };
                helpMessage += `\n${categoryNames[category.nameKey] || category.nameKey}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            // "help.list.noCommandsAvailable" -> "§7No commands available to you at this time."
            helpMessage += "§7No commands available to you at this time.";
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
