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
    const { playerUtils, commandDefinitionMap, /*assume commandDefinitions is an array derived from commandDefinitionMap if needed for .find*/ config, permissionLevels } = dependencies;

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
                // Resolve cmdDef.description which is a key
                const cmdDescriptionKey = foundCmdDef.description; // e.g., "commands.ban.description"
                const localizedCmdDescription = dependencies.translations_dict?.[cmdDescriptionKey] || cmdDescriptionKey; // Fallback to key if not found

                player.sendMessage(
                    `§l§b--- Help: ${prefix}${foundCmdDef.name} ---` + "\n" +
                    `§eSyntax:§r ${prefix}${foundCmdDef.name} ${syntaxArgs}` + "\n" +
                    `§bDescription:§r ${localizedCmdDescription}` + "\n" +
                    `§7Permission: ${permLevelName} (Level ${foundCmdDef.permissionLevel})`
                );
            } else {
                player.sendMessage(`§cCommand "${specificCommandName}" not found or you do not have permission to view its details. Type ${prefix}help for a list of available commands.`);
            }
        } else {
            player.sendMessage(`§cUnknown command: "${specificCommandName}". Type ${prefix}help for a list of available commands.`);
        }
    } else {
        let helpMessage = `§l§bAvailable Commands (prefix: ${prefix}):§r` + "\n";
        let commandsListed = 0;

        const categories = [
            {
                nameKey: "commands.help.list_category_general", // Corrected key
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                nameKey: "commands.help.list_category_tpa", // Corrected key
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTPASystem // Use config from dependencies
            },
            {
                nameKey: "commands.help.list_category_moderation", // Corrected key
                permissionRequired: permissionLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel'] // 'ui' is an alias for panel
            },
            {
                nameKey: "commands.help.list_category_administrative", // Corrected key
                permissionRequired: permissionLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock', 'worldborder', 'setlang', 'log', 'reports', 'systeminfo']
            },
            {
                nameKey: "commands.help.list_category_owner", // Corrected key
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
                    const descriptionKey = cmdDef.description; // This is the translation key, e.g., "commands.ban.description"
                    if (cmdDef.name === 'panel') {
                        description = dependencies.translations_dict?.["commands.help.descriptionOverride_panel"] || "Opens the Admin/User Interface Panel.";
                    } else if (cmdDef.name === 'ui') { // Handle 'ui' alias specifically if its description key is different
                        description = dependencies.translations_dict?.["commands.help.descriptionOverride_ui"] || "Alias for !panel. Opens the Admin/User Interface Panel.";
                    } else {
                        description = dependencies.translations_dict?.[descriptionKey] || descriptionKey; // Fallback to key
                    }

                    categoryHelp += `§e${prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                const categoryNameString = dependencies.translations_dict?.[category.nameKey] || category.nameKey.substring(category.nameKey.lastIndexOf('.') + 1); // Fallback to last part of key
                helpMessage += `\n${categoryNameString}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += dependencies.translations_dict?.["commands.help.list_noCommandsAvailable"] || "§7No commands available to you at this time.";
        } else {
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
