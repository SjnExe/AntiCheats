import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';

const gamemodeCommands = [
    { name: 'gmc', alias: 'creative', permission: 1 },
    { name: 'gms', alias: 'survival', permission: 1 },
    { name: 'gma', alias: 'adventure', permission: 1 },
    { name: 'gmsp', alias: 'spectator', permission: 1 }
];

for (const cmd of gamemodeCommands) {
    commandManager.register({
        name: cmd.name,
        aliases: [cmd.alias],
        description: `Sets your gamemode to ${cmd.alias}.`,
        permissionLevel: cmd.permission,
        execute: async (player, args) => {
            console.log(`[DEBUG] Attempting to set gamemode for ${player.name} to ${cmd.alias}.`);
            console.log(`[DEBUG] Player object valid: ${player.isValid()}`);

            try {
                // Using world.runCommandAsync without quotes around player name.
                await world.getDimension('overworld').runCommandAsync(`gamemode ${cmd.alias} ${player.name}`);
                player.sendMessage(`§aYour gamemode has been set to ${cmd.alias}.`);
                console.log(`[DEBUG] Successfully executed gamemode command for ${player.name}.`);
            } catch (error) {
                player.sendMessage(`§cFailed to set gamemode. See server console for details.`);
                console.error(`[GamemodeCommand] Error setting gamemode for ${player.name}.`);
                console.error(`[GamemodeCommand] Error Name: ${error?.name}`);
                console.error(`[GamemodeCommand] Error Message: ${error?.message}`);
                console.error(`[GamemodeCommand] Error Stack: ${error?.stack}`);
                console.error(`[GamemodeCommand] Full Error Object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
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
