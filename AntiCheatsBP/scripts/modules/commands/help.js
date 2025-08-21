import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

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

    // Dynamically get and sort categories to be more robust
    const categoryOrder = ['General', 'Moderation', 'Admin'];
    const sortedCategories = Object.keys(categorized).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Both in preferred order
        if (indexA !== -1) return -1; // A is in order, B is not
        if (indexB !== -1) return 1; // B is in order, A is not
        return a.localeCompare(b); // Neither in order, sort alphabetically
    });

    for (const category of sortedCategories) {
        if (categorized[category].length > 0) {
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
