import { world } from '@minecraft/server';
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
                // Using world.runCommandAsync as the final and most robust method.
                await world.runCommandAsync(`gamemode ${alias} "${player.name}"`);
                player.sendMessage(`§aYour gamemode has been set to ${alias}.`);
            } catch (error) {
                player.sendMessage(`§cFailed to set gamemode. Please check server console for errors.`);
                console.error(`[${name}] Failed to run command for ${player.name}. Error: ${error?.stack ?? JSON.stringify(error)}`);
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
