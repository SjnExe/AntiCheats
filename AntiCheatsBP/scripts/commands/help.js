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
    const { getPlayerPermissionLevel, permissionLevels: permLevelsDep, allCommands: acAllCommands, config: depConfig } = dependencies;
    const userPermissionLevel = getPlayerPermissionLevel(player);

    if (args[0]) {
        const specificCommandName = args[0].toLowerCase().replace(config.prefix, ""); // Remove prefix if present
        let foundCmdDef = acAllCommands.find(cmd => cmd.name === specificCommandName);

        if (!foundCmdDef && depConfig.commandAliases) { // Check aliases if not found by direct name
             const aliasTarget = Object.keys(depConfig.commandAliases).find(alias => alias === specificCommandName && depConfig.commandAliases[alias]);
             if(aliasTarget) {
                const targetCmdName = depConfig.commandAliases[aliasTarget];
                foundCmdDef = acAllCommands.find(cmd => cmd.name === targetCmdName);
             }
        }

        if (foundCmdDef) {
            if (userPermissionLevel <= foundCmdDef.permissionLevel) {
                const syntaxArgs = foundCmdDef.syntax.substring(foundCmdDef.syntax.indexOf(' ') + 1);
                let permLevelName = "Unknown";
                // Find the name of the permission level
                for (const key in permLevelsDep) {
                    if (permLevelsDep[key] === foundCmdDef.permissionLevel) {
                        permLevelName = key.charAt(0).toUpperCase() + key.slice(1); // Capitalize
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
        acAllCommands.forEach(cmdDef => {
            if (userPermissionLevel <= cmdDef.permissionLevel) {
                const syntaxArgs = cmdDef.syntax.substring(cmdDef.syntax.indexOf(' ') + 1);
                helpMessage += `§e${config.prefix}${cmdDef.name} ${syntaxArgs}§7 - ${cmdDef.description}\n`;
            }
        });

        if (config.enableTpaSystem) {
            helpMessage += "\n\n§e--- TPA Commands ---§r\n";
            helpMessage += `§b${config.prefix}tpa <playerName>§r - Request to teleport to another player.\n`;
            helpMessage += `§b${config.prefix}tpahere <playerName>§r - Request another player to teleport to you.\n`;
            helpMessage += `§b${config.prefix}tpaccept [playerName]§r - Accept an incoming TPA request (from specific player or latest).\n`;
            helpMessage += `§b${config.prefix}tpacancel [playerName]§r - Cancel/decline a TPA request (specific or all).\n`;
            helpMessage += `§b${config.prefix}tpastatus <on|off|status>§r - Manage or view your TPA request availability.`;
        }

        // Check if only the title was added (meaning no commands available at this permission level BEFORE TPA check)
        // Or if after adding TPA commands, it's still just the title (unlikely if TPA is on and user is normal)
        if (helpMessage === "§aAvailable commands (for your permission level):\n" && !config.enableTpaSystem) {
             helpMessage += "§7No commands available at your current permission level.";
        } else if (helpMessage.endsWith("§r\n")) { // Remove trailing newline if TPA commands were the last thing added
            helpMessage = helpMessage.slice(0, -1);
        }


        player.sendMessage(helpMessage);
    }
}
