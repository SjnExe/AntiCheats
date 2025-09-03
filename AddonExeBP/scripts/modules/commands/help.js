import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

function showCategorizedHelp(player, userPermissionLevel) {
    const categorizedCommands = {};

    for (const cmd of commandManager.commands) {
        if (userPermissionLevel > cmd.permissionLevel) continue;

        const category = cmd.category || 'General';
        if (!categorizedCommands[category]) {
            categorizedCommands[category] = [];
        }
        categorizedCommands[category].push(cmd);
    }

    const categoryOrder = [
        'Administration',
        'Moderation',
        'Economy',
        'Home System',
        'TPA System',
        'General'
    ];

    let helpMessage = '§a--- Available Commands ---';
    let commandsShown = false;

    for (const categoryName of categoryOrder) {
        const commands = categorizedCommands[categoryName];

        if (commands && commands.length > 0) {
            commandsShown = true;
            helpMessage += `\n§l§e--- ${categoryName} ---§r`;
            for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
                helpMessage += `\n §b!${cmd.name}§r: ${cmd.description}`;
            }
        }
    }

    if (!commandsShown) {
        player.sendMessage('§cYou do not have permission to use any commands.');
        return;
    }

    player.sendMessage(helpMessage);
}

function showSpecificHelp(player, commandName) {
    const cmd = commandManager.commands.find(c => c.name === commandName || (c.aliases && c.aliases.includes(commandName)));

    if (!cmd) {
        player.sendMessage(`§cUnknown command: '${commandName}'.`);
        return;
    }

    let helpMessage = `§a--- Help: !${cmd.name} ---\n`;
    helpMessage += `§eDescription§r: ${cmd.description}\n`;
    if (cmd.aliases && cmd.aliases.length > 0) {
        helpMessage += `§eAliases§r: ${cmd.aliases.map(a => `!${a}`).join(', ')}\n`;
    }
    helpMessage += `§eCategory§r: ${cmd.category || 'General'}\n`;
    helpMessage += `§ePermission Level§r: ${cmd.permissionLevel}`;

    player.sendMessage(helpMessage);
}

commandManager.register({
    name: 'help',
    slashName: 'xhelp',
    aliases: ['?', 'h'],
    description: 'Displays a list of available commands or help for a specific command.',
    category: 'General',
    permissionLevel: 1024, // Available to everyone
    execute: (player, args) => {
        const pData = getPlayer(player.id);
        const userPermissionLevel = pData ? pData.permissionLevel : 1024;
        const topic = args[0] ? args[0].toLowerCase() : null;

        if (!topic) {
            showCategorizedHelp(player, userPermissionLevel);
        } else {
            showSpecificHelp(player, topic);
        }
    }
});
