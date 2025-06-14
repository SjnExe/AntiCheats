/**
 * @file AntiCheatsBP/scripts/commands/help.js
 * Defines the !help command, which provides players with a list of available commands
 * or detailed information about a specific command based on their permission level.
 * @version 1.0.1
 */
// Removed direct import of config
import { permissionLevels } from '../core/rankManager.js';
import { getString } from '../core/i18n.js';

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
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies, expected to include `allCommands` list.
 */
export async function execute(player, args, dependencies) {
    const { getPlayerPermissionLevel, allCommands, config: runtimeConfig } = dependencies; // runtimeConfig is editableConfigValues
    const userPermissionLevel = getPlayerPermissionLevel(player);
    const prefix = runtimeConfig.prefix; // Get prefix from runtime config

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(prefix, "");
        let foundCmdDef = allCommands.find(cmd => cmd.name === specificCommandName);

        if (!foundCmdDef && runtimeConfig.commandAliases) {
            const aliasTarget = Object.keys(runtimeConfig.commandAliases).find(alias => alias === specificCommandName && runtimeConfig.commandAliases[alias]);
            if (aliasTarget) {
                const targetCmdName = runtimeConfig.commandAliases[aliasTarget];
                foundCmdDef = allCommands.find(cmd => cmd.name === targetCmdName);
            }
        }

        if (foundCmdDef) {
            let isEffectivelyEnabled = foundCmdDef.enabled;
            if (runtimeConfig.commandSettings && typeof runtimeConfig.commandSettings[foundCmdDef.name]?.enabled === 'boolean') {
                isEffectivelyEnabled = runtimeConfig.commandSettings[foundCmdDef.name].enabled;
            }

            if (!isEffectivelyEnabled) {
                player.sendMessage(getString("help.error.unknownCommand", { prefix: prefix, commandName: specificCommandName }));
                return;
            }

            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = "Unknown";
                for (const key in permissionLevels) {
                    if (permissionLevels[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1);
                        break;
                    }
                }
                player.sendMessage(
                    getString("help.specific.header", { prefix: prefix, commandName: foundCmdDef.name }) + "\n" +
                    getString("help.specific.syntax", { prefix: prefix, commandName: foundCmdDef.name, syntaxArgs: syntaxArgs }) + "\n" +
                    getString("help.specific.description", { description: getString(foundCmdDef.description) }) + "\n" +
                    getString("help.specific.permission", { permLevelName: permLevelName, permissionLevel: foundCmdDef.permissionLevel })
                );
            } else {
                player.sendMessage(getString("help.specific.notFoundOrNoPermission", { commandName: specificCommandName, prefix: prefix }));
            }
        } else {
            player.sendMessage(getString("help.error.unknownCommand", { prefix: prefix, commandName: specificCommandName }));
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
                condition: () => runtimeConfig.enableTPASystem // Use runtimeConfig
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
                const cmdDef = allCommands.find(cmd => cmd.name === commandName);
                if (cmdDef && userPermissionLevel <= cmdDef.permissionLevel) {
                    let isEffectivelyEnabled = cmdDef.enabled;
                    if (runtimeConfig.commandSettings && typeof runtimeConfig.commandSettings[cmdDef.name]?.enabled === 'boolean') {
                        isEffectivelyEnabled = runtimeConfig.commandSettings[cmdDef.name].enabled;
                    }
                    if (!isEffectivelyEnabled) {
                        return; // Skips this command in the list
                    }

                    const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                    // Get localized description for each command
                    let description;
                    if (cmdDef.name === 'panel') {
                        description = getString("help.descriptionOverride.panel");
                    } else if (cmdDef.name === 'ui') { // Handle 'ui' alias specifically if its description key is different
                        description = getString("help.descriptionOverride.ui"); // Assuming 'ui' might have its own override or shares panel's
                    } else {
                        description = getString(cmdDef.description); // All command definitions should have description as a key
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
