/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.0
 */
import * as config from '../config.js';
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/localizationManager.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "help",
    syntax: "!help [command_name]",
    description: "Shows available commands or help for a specific command.",
    permissionLevel: permissionLevels.normal // Accessible by all players
};

/**
 * Executes the help command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, expected to include `allCommands` list.
 */
export async function execute(player, args, dependencies) {
    // config is now directly imported, not from dependencies for this command's direct use.
    // However, other parts of dependencies.config might be used by other commands, so keep it in destructuring.
    // config is now directly imported. permissionLevels is also directly imported.
    const { getPlayerPermissionLevel, allCommands, config: depConfig } = dependencies; // depConfig for commandAliases
    const userPermissionLevel = getPlayerPermissionLevel(player);

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(config.prefix, "");
        let foundCmdDef = allCommands.find(cmd => cmd.name === specificCommandName);

        if (!foundCmdDef && depConfig.commandAliases) {
            const aliasTarget = Object.keys(depConfig.commandAliases).find(alias => alias === specificCommandName && depConfig.commandAliases[alias]);
            if (aliasTarget) {
                const targetCmdName = depConfig.commandAliases[aliasTarget];
                foundCmdDef = allCommands.find(cmd => cmd.name === targetCmdName);
            }
        }

        if (foundCmdDef) {
            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = "Unknown";
                for (const key in permissionLevels) { // Use imported permissionLevels
                    if (permissionLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                player.sendMessage(
                    getString("help.specific.header", { prefix: config.prefix, commandName: foundCmdDef.name }) + "\n" +
                    getString("help.specific.syntax", { prefix: config.prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + "\n" +
                    getString("help.specific.description", { description: foundCmdDef.description }) + "\n" +
                    getString("help.specific.permission", { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel })
                );
            } else {
                // Assuming the no permission to view specific help is covered by "common.error.noPermissionCommand" or a more specific one.
                // The original message combined "not found" and "no permission".
                // Using the specific key for "not found or no permission for specific command help"
                player.sendMessage(getString("help.specific.notFoundOrNoPermission", { commandName: specificCommandName, prefix: config.prefix }));
            }
        } else {
            player.sendMessage(getString("help.error.unknownCommand", { prefix: config.prefix, commandName: specificCommandName }));
        }
    } else {
        let helpMessage = getString("help.list.header") + "\n";
        let commandsListed = 0;

        const categories = [
            {
                nameKey: "help.list.category.general", // Key for "--- General Player Commands ---"
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                nameKey: "help.list.category.tpa", // Key for "--- TPA Commands ---"
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTpaSystem // config is the imported config.js module
            },
            {
                nameKey: "help.list.category.moderation", // Key for "--- Moderation Commands ---"
                permissionRequired: permissionLevels.moderator,
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel']
            },
            {
                nameKey: "help.list.category.administrative", // Key for "--- Administrative Commands ---"
                permissionRequired: permissionLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock']
            },
            {
                nameKey: "help.list.category.owner", // Key for "--- Owner Commands ---"
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
                const cmdDef = allCommands.find(cmd => cmd.name === commandName);
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) {
                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    let description = cmdDef.name === 'panel' ? getString("help.descriptionOverride.panel") : cmdDef.description;

                    // For Phase 1, command descriptions themselves are not localized yet, unless they are special like 'panel'.
                    // This would be a larger change across all command definitions.
                    categoryHelp += `§e${config.prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                // Get localized category name. If key doesn't exist, it returns the key itself.
                const categoryNameString = getString(category.nameKey) || category.name; // Fallback to .name if nameKey isn't on all
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
