import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'help',
    description: 'Displays a list of available commands.',
    permissionLevel: 1024, // Available to everyone
    execute: (player, args) => {
        const pData = getPlayer(player.id);
        const userPermissionLevel = pData ? pData.permissionLevel : 1024;

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
            player.sendMessage(helpMessage.trim());
        }
    }
});
