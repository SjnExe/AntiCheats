import { GameMode } from '@minecraft/server';
import { commandManager } from './commandManager.js';

const gamemodeCommands = [
    { name: 'gmc', alias: 'creative', permission: 1, gameModeEnum: GameMode.creative },
    { name: 'gms', alias: 'survival', permission: 1, gameModeEnum: GameMode.survival },
    { name: 'gma', alias: 'adventure', permission: 1, gameModeEnum: GameMode.adventure },
    { name: 'gmsp', alias: 'spectator', permission: 1, gameModeEnum: GameMode.spectator }
];

for (const cmd of gamemodeCommands) {
    commandManager.register({
        name: cmd.name,
        aliases: [cmd.alias],
        description: `Sets your gamemode to ${cmd.alias}.`,
        permissionLevel: cmd.permission,
        execute: (player, args) => {
            console.log(`[Gamemode DEBUG] Executing command for '${cmd.name}'.`);
            console.log(`[Gamemode DEBUG] cmd object: ${JSON.stringify(cmd)}`);
            console.log(`[Gamemode DEBUG] Type of gameModeEnum: ${typeof cmd.gameModeEnum}`);
            console.log(`[Gamemode DEBUG] Value of gameModeEnum: ${cmd.gameModeEnum}`);
            try {
                player.setGameMode(cmd.gameModeEnum);
                player.sendMessage(`§aYour gamemode has been set to ${cmd.alias}.`);
            } catch (error) {
                player.sendMessage(`§cFailed to set gamemode. See server console for details.`);
                console.error(`[GamemodeCommand] Failed to set gamemode for ${player.name}. Error: ${error?.stack ?? JSON.stringify(error)}`);
            }
        }
    });
}

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
