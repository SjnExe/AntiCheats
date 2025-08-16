import { GameMode } from '@minecraft/server';
import { commandManager } from './commandManager.js';

const gamemodeCommands = [
    { name: 'gmc', alias: 'creative', gameMode: GameMode.creative, permission: 1 },
    { name: 'gms', alias: 'survival', gameMode: GameMode.survival, permission: 1 },
    { name: 'gma', alias: 'adventure', gameMode: GameMode.adventure, permission: 1 },
    { name: 'gmsp', alias: 'spectator', gameMode: GameMode.spectator, permission: 1 }
];

for (const cmd of gamemodeCommands) {
    commandManager.register({
        name: cmd.name,
        aliases: [cmd.alias],
        description: `Sets your gamemode to ${cmd.alias}.`,
        permissionLevel: cmd.permission,
        execute: (player, args) => {
            try {
                player.setGameMode(cmd.gameMode);
                player.sendMessage(`§aYour gamemode has been set to ${cmd.alias}.`);
            } catch (error) {
                player.sendMessage(`§cFailed to set gamemode: ${error.message}`);
                console.error(`[GamemodeCommand] Failed to set gamemode for ${player.name}: ${error.stack}`);
            }
        }
    });
}

commandManager.register({
    name: 'gamemode',
    aliases: ['gm'],
    description: 'Shows help for gamemode commands.',
    permissionLevel: 1024, // Available to everyone
    execute: (player, args) => {
        let helpMessage = "§a--- Gamemode Commands ---\n";
        helpMessage += "§e!gmc (creative)§r: Sets your gamemode to Creative.\n";
        helpMessage += "§e!gms (survival)§r: Sets your gamemode to Survival.\n";
        helpMessage += "§e!gma (adventure)§r: Sets your gamemode to Adventure.\n";
        helpMessage += "§e!gmsp (spectator)§r: Sets your gamemode to Spectator.";
        player.sendMessage(helpMessage);
    }
});
