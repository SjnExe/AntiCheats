import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

function showGeneralHelp(player, userPermissionLevel) {
    let helpMessage = "§a--- Available Commands ---\n";
    let commandCount = 0;

    const sortedCommands = [...commandManager.commands.values()].sort((a, b) => a.name.localeCompare(b.name));

    for (const command of sortedCommands) {
        if (userPermissionLevel <= command.permissionLevel) {
            helpMessage += `§e!${command.name}§r: ${command.description}\n`;
            commandCount++;
        }
    }

    if (commandCount === 0) {
        player.sendMessage("§cYou do not have permission to use any commands.");
    } else {
        helpMessage += "\n§7For more details, type !help <commandName>";
        player.sendMessage(helpMessage.trim());
    }
}

function showSpecificHelp(player, commandName) {
    let cmd = commandManager.commands.get(commandName) || commandManager.commands.get(commandManager.aliases.get(commandName));

    if (!cmd) {
        player.sendMessage(`§cUnknown command or category: '${commandName}'.`);
        return;
    }

    let helpMessage = `§a--- Help: !${cmd.name} ---\n`;
    helpMessage += `§eDescription§r: ${cmd.description}\n`;
    if (cmd.aliases && cmd.aliases.length > 0) {
        helpMessage += `§eAliases§r: ${cmd.aliases.map(a => `!${a}`).join(', ')}\n`;
    }
    helpMessage += `§ePermission Level§r: ${cmd.permissionLevel}`;

    player.sendMessage(helpMessage);
}

function showGamemodeHelp(player) {
    let helpMessage = "§a--- Gamemode Commands ---\n";
    const gamemodeCommands = ['gmc', 'gms', 'gma', 'gmsp'];
    for (const cmdName of gamemodeCommands) {
        const cmd = commandManager.commands.get(cmdName);
        if (cmd) {
            helpMessage += `§e!${cmd.name}§r (${cmd.aliases[0]}): ${cmd.description}\n`;
        }
    }
    player.sendMessage(helpMessage.trim());
}

commandManager.register({
    name: 'help',
    aliases: ['?'],
    description: 'Displays a list of available commands or help for a specific command.',
    permissionLevel: 1024, // Available to everyone
    execute: (player, args) => {
        const pData = getPlayer(player.id);
        const userPermissionLevel = pData ? pData.permissionLevel : 1024;
        const topic = args[0] ? args[0].toLowerCase() : null;

        if (!topic) {
            showGeneralHelp(player, userPermissionLevel);
        } else if (topic === 'gamemode') {
            showGamemodeHelp(player);
        } else {
            showSpecificHelp(player, topic);
        }
    }
});
