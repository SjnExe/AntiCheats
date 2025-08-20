import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

const commandCategories = ['General', 'Admin']; // Defines the sort order

function showCategorizedHelp(player, userPermissionLevel) {
    const availableCommands = [...commandManager.commands.values()].filter(cmd => userPermissionLevel <= cmd.permissionLevel);

    if (availableCommands.length === 0) {
        player.sendMessage('§cYou do not have permission to use any commands.');
        return;
    }

    const categorized = {};
    for (const cmd of availableCommands) {
        const category = cmd.category || 'General';
        if (!categorized[category]) {
            categorized[category] = [];
        }
        categorized[category].push(cmd);
    }

    let helpMessage = '§a--- Available Commands ---\n';

    for (const category of commandCategories) {
        if (categorized[category]) {
            helpMessage += `§l§e--- ${category} ---\n`;
            const sortedCommands = categorized[category].sort((a, b) => a.name.localeCompare(b.name));
            for (const cmd of sortedCommands) {
                helpMessage += `§b!${cmd.name}§r: ${cmd.description}\n`;
            }
        }
    }

    player.sendMessage(helpMessage.trim());
}

function showSpecificHelp(player, commandName) {
    const cmd = commandManager.commands.get(commandName) || commandManager.commands.get(commandManager.aliases.get(commandName));

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
    aliases: ['?'],
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
    },
});
