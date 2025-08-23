import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { getConfig } from '../../core/configManager.js';

function showCategorizedHelp(player, userPermissionLevel) {
    const config = getConfig();
    let helpMessage = '§a--- Available Commands ---\n';
    let commandsShown = false;

    const commandStructure = {
        '§aGeneral': {
            systemToggle: null,
            commands: ['help', 'status', 'rules', 'version'],
        },
        '§dTeleportation': {
            systemToggles: ['tpa', 'homes'], // Is visible if EITHER is enabled
            commands: ['tpa', 'tpahere', 'tpaccept', 'tpadeny', 'tpacancel', 'sethome', 'home', 'delhome', 'homes'],
        },
        '§6Economy': {
            systemToggle: 'economy',
            commands: ['balance', 'pay', 'baltop'],
        },
        '§eKits': {
            systemToggle: 'kits',
            commands: ['kit'],
        },
        '§cModeration': {
            systemToggle: null,
            commands: ['panel', 'kick', 'mute', 'unmute', 'freeze', 'vanish', 'invsee', 'tp'],
        },
        '§9Administration': {
            systemToggle: null,
            commands: ['admin', 'ban', 'unban', 'gmc', 'gms', 'gma', 'gmsp', 'clear', 'ecwipe', 'clearchat', 'reload', 'debug'],
        },
    };

    for (const categoryName in commandStructure) {
        const category = commandStructure[categoryName];

        // --- System-level toggle check ---
        if (category.systemToggle && !config[category.systemToggle]?.enabled) {
            continue;
        }
        if (category.systemToggles && !category.systemToggles.some(toggle => config[toggle]?.enabled)) {
            continue;
        }

        const visibleCommands = category.commands.map(cmdName => commandManager.commands.get(cmdName))
            .filter(cmd => {
                if (!cmd) return false;
                // Permission level check
                if (userPermissionLevel > cmd.permissionLevel) return false;
                // Individual command toggle check
                const cmdSetting = config.commandSettings?.[cmd.name];
                if (cmdSetting && cmdSetting.enabled === false) return false;
                // System toggle check for commands within combined categories
                if (['tpa', 'tpahere', 'tpaccept', 'tpadeny', 'tpacancel'].includes(cmd.name) && !config.tpa?.enabled) return false;
                if (['sethome', 'home', 'delhome', 'homes'].includes(cmd.name) && !config.homes?.enabled) return false;

                return true;
            });

        if (visibleCommands.length > 0) {
            commandsShown = true;
            helpMessage += `§l${categoryName}§r\n`;
            const sortedCommands = visibleCommands.sort((a, b) => a.name.localeCompare(b.name));
            for (const cmd of sortedCommands) {
                helpMessage += ` §b!${cmd.name}§r: ${cmd.description}\n`;
            }
        }
    }

    if (!commandsShown) {
        player.sendMessage('§cYou do not have permission to use any commands, or all commands are disabled.');
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
    },
});
