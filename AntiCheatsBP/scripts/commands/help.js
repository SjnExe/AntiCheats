/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.0
 */
import * as config from '../config.js'; // Added import for config
import { permissionLevels } from '../core/rankManager.js'; // Assuming this path is correct from command's perspective

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
                    `§a--- Help for: ${config.prefix}${foundCmdDef.name} ---\n` +
                    `§eSyntax: ${config.prefix}${foundCmdDef.name} ${syntaxArgs}\n` +
                    `§7Description: ${foundCmdDef.description}\n` +
                    `§bPermission Level Required: ${permLevelName} (Value: ${foundCmdDef.permissionLevel})`
                );
            } else {
                player.sendMessage(`§cCommand '${specificCommandName}' not found or you do not have permission to view its help. Try ${config.prefix}help for a list of your commands.`);
            }
        } else {
            player.sendMessage(`§cCommand '${specificCommandName}' not found. Try ${config.prefix}help for a list of available commands.`);
        }
    } else {
        let helpMessage = "§aAvailable commands (for your permission level):\n";
        let commandsListed = 0;

        const categories = [
            {
                name: "--- General Player Commands ---",
                commands: ['help', 'myflags', 'rules', 'uinfo', 'version']
            },
            {
                name: "--- TPA Commands ---",
                commands: ['tpa', 'tpahere', 'tpaccept', 'tpacancel', 'tpastatus'],
                condition: () => config.enableTpaSystem
            },
            {
                name: "--- Moderation Commands ---",
                permissionRequired: permissionLevels.moderator, // Assuming a moderator level might exist or defaults to admin
                commands: ['kick', 'mute', 'unmute', 'clearchat', 'freeze', 'warnings', 'inspect', 'panel']
            },
            {
                name: "--- Administrative Commands ---",
                permissionRequired: permissionLevels.admin,
                commands: ['ban', 'unban', 'vanish', 'tp', 'invsee', 'copyinv', 'gmc', 'gms', 'gma', 'gmsp', 'notify', 'xraynotify', 'resetflags', 'netherlock', 'endlock']
            },
            {
                name: "--- Owner Commands ---",
                permissionRequired: permissionLevels.owner,
                commands: ['testnotify']
            }
        ];

        categories.forEach(category => {
            if (category.condition && !category.condition()) {
                return; // Skip this category if condition is not met (e.g., TPA disabled)
            }

            // Check if user meets the general permission for the category, if defined
            if (category.permissionRequired && userPermissionLevel > category.permissionRequired) {
                return;
            }

            let categoryHelp = "";
            category.commands.forEach(commandName => {
                const cmdDef = allCommands.find(cmd => cmd.name === commandName);
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) {
                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    let description = cmdDef.description;
                    if (cmdDef.name === 'panel') {
                        description = "Opens the Info/Admin Panel (content varies by permission).";
                    }
                    categoryHelp += `§e${config.prefix}${cmdDef.name} ${syntaxArgs}§7 - ${description}\n`;
                    commandsListed++;
                }
            });

            if (categoryHelp) {
                helpMessage += `\n${category.name}\n${categoryHelp}`;
            }
        });

        if (commandsListed === 0) {
            helpMessage += "§7No commands available at your current permission level.";
        } else {
            // Remove last trailing newline if any commands were added
            if (helpMessage.endsWith('\n')) {
                helpMessage = helpMessage.slice(0, -1);
            }
        }
        player.sendMessage(helpMessage);
    }
}
