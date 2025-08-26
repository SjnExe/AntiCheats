import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

function showCategorizedHelp(player, userPermissionLevel) {
    const config = getConfig();
    const categorizedCommands = {};

    // Dynamically categorize all registered commands
    for (const cmd of commandManager.commands.values()) {
        // Permission level check
        if (userPermissionLevel > cmd.permissionLevel) continue;
        // Individual command toggle check
        const cmdSetting = config.commandSettings?.[cmd.name];
        if (cmdSetting && cmdSetting.enabled === false) continue;

        const category = cmd.category || 'General';
        if (!categorizedCommands[category]) {
            categorizedCommands[category] = [];
        }
        categorizedCommands[category].push(cmd);
    }

    let helpMessage = '§a--- Available Commands ---[AddonExe]';
    let commandsShown = false;

    // Get sorted list of categories
    const sortedCategories = Object.keys(categorizedCommands).sort();

    for (const categoryName of sortedCategories) {
        const commands = categorizedCommands[categoryName];
        // Sort commands alphabetically within the category
        const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));

        if (sortedCommands.length > 0) {
            commandsShown = true;
            helpMessage += `§l§e${categoryName}§r[AddonExe]`;
            for (const cmd of sortedCommands) {
                helpMessage += ` §b!${cmd.name}§r: ${cmd.description}[AddonExe]`;
            }
        }
    }

    if (!commandsShown) {
        player.sendMessage('§cYou do not have permission to use any commands.');
        return;
    }

    player.sendMessage(helpMessage.trim());
}

function showSpecificHelp(player, commandName) {
    const cmd = commandManager.commands.get(commandName) || commandManager.commands.get(commandManager.aliases.get(commandName));

    if (!cmd) {
        player.sendMessage(`§cUnknown command: '${commandName}'.`);
        return;
    }

    let helpMessage = `§a--- Help: !${cmd.name} ---[AddonExe]`;
    helpMessage += `§eDescription§r: ${cmd.description}[AddonExe]`;
    if (cmd.aliases && cmd.aliases.length > 0) {
        helpMessage += `§eAliases§r: ${cmd.aliases.map(a => `!${a}`).join(', ')}[AddonExe]`;
    }
    helpMessage += `§eCategory§r: ${cmd.category || 'General'}[AddonExe]`;
    helpMessage += `§ePermission Level§r: ${cmd.permissionLevel}`;

    player.sendMessage(helpMessage);
}

commandManager.register({
    name: 'help',
    aliases: ['?', 'h'],
    description: 'Displays a list of available commands or help for a specific command.',
    category: '§aGeneral',
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
