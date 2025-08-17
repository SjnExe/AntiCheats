import { commandManager } from './commandManager.js';

// Helper function to create the gamemode command registration
function registerGamemodeCommand(name, alias) {
    commandManager.register({
        name: name,
        aliases: [alias],
        description: `Sets your gamemode to ${alias}.`,
        permissionLevel: 1,
        execute: async (player, args) => {
            try {
                // Execute the .mcfunction file, which has the necessary permissions
                await player.runCommandAsync(`function ${name}`);
                // The success message will be handled by the script, as the function provides no feedback.
                player.sendMessage(`§aYour gamemode has been set to ${alias}.`);
            } catch (error) {
                player.sendMessage(`§cFailed to execute gamemode function. Player may not have permission to run function commands.`);
                console.error(`[${name}] Failed to run '/function ${name}' for ${player.name}. Error: ${error?.stack ?? JSON.stringify(error)}`);
            }
        }
    });
}

// Register all gamemode commands
registerGamemodeCommand('gmc', 'creative');
registerGamemodeCommand('gms', 'survival');
registerGamemodeCommand('gma', 'adventure');
registerGamemodeCommand('gmsp', 'spectator');

// Register Gamemode help command
commandManager.register({
    name: 'gamemode',
    aliases: ['gm'],
    description: 'Shows help for gamemode commands.',
    permissionLevel: 1,
    execute: (player, args) => {
        let helpMessage = "§a--- Gamemode Commands ---\n";
        helpMessage += "§e!gmc (creative)§r: Sets your gamemode to Creative.\n";
        helpMessage += "§e!gms (survival)§r: Sets your gamemode to Survival.\n";
        helpMessage += "§e!gma (adventure)§r: Sets your gamemode to Adventure.\n";
        helpMessage += "§e!gmsp (spectator)§r: Sets your gamemode to Spectator.";
        player.sendMessage(helpMessage);
    }
});
