// AntiCheatsBP/scripts/commands/help.js
import { permissionLevels } from '../core/rankManager.js'; // Assuming this path is correct from command's perspective

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "help",
    syntax: "!help [command_name]",
    description: "Shows available commands or help for a specific command.",
    permissionLevel: permissionLevels.normal
};

/**
 * Executes the help command.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} args The command arguments.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, args, dependencies) {
    const { config, getPlayerPermissionLevel, permissionLevels: permLevelsDep, allCommands: acAllCommands } = dependencies; // Renamed to avoid conflict with outer scope allCommands if any
    const userPermissionLevel = getPlayerPermissionLevel(player);

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(config.prefix, ""); // Remove prefix if present
        let foundCmdDef = acAllCommands.find(cmd => cmd.name === specificCommandName);

        if (!foundCmdDef && config.commandAliases) { // Check aliases if not found by direct name
             const aliasTarget = Object.keys(config.commandAliases).find(alias => alias === specificCommandName && config.commandAliases[alias]);
             if(aliasTarget) {
                const targetCmdName = config.commandAliases[aliasTarget];
                foundCmdDef = acAllCommands.find(cmd => cmd.name === targetCmdName);
             }
        }

        if (foundCmdDef) {
            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1); // Get args part of syntax
                let permLevelName = "Unknown";
                for (const key in permLevelsDep) { // Correctly iterate permissionLevels from dependencies
                    if (permLevelsDep[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key;
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
        let helpOutput = ["§aAvailable commands (for your permission level):"];
        acAllCommands.forEach(cmdDef => {
            if (userPermissionLevel <= cmdDef.permissionLevel) {
                const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                helpOutput.push(`§e${config.prefix}${cmdDef.name} ${syntaxArgs}§7 - ${cmdDef.description}`);
            }
        });
        if (helpOutput.length === 1) { // Only title, no commands
            helpOutput.push("§7No commands available at your current permission level.");
        }
        player.sendMessage(helpOutput.join('\n'));
    }
}
