import { GameMode } from '@minecraft/server';
import { commandManager } from './commandManager.js';

// Register Creative command
commandManager.register({
    name: 'gmc',
    aliases: ['creative'],
    description: 'Sets your gamemode to creative.',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.setGameMode(GameMode.creative);
            player.sendMessage("§aYour gamemode has been set to creative.");
        } catch (error) {
            player.sendMessage("§cFailed to set gamemode.");
            console.error(`[gmc] ${error.stack}`);
        }
    }
});

// Register Survival command
commandManager.register({
    name: 'gms',
    aliases: ['survival'],
    description: 'Sets your gamemode to survival.',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.setGameMode(GameMode.survival);
            player.sendMessage("§aYour gamemode has been set to survival.");
        } catch (error) {
            player.sendMessage("§cFailed to set gamemode.");
            console.error(`[gms] ${error.stack}`);
        }
    }
});

// Register Adventure command
commandManager.register({
    name: 'gma',
    aliases: ['adventure'],
    description: 'Sets your gamemode to adventure.',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.setGameMode(GameMode.adventure);
            player.sendMessage("§aYour gamemode has been set to adventure.");
        } catch (error) {
            player.sendMessage("§cFailed to set gamemode.");
            console.error(`[gma] ${error.stack}`);
        }
    }
});

// Register Spectator command
commandManager.register({
    name: 'gmsp',
    aliases: ['spectator'],
    description: 'Sets your gamemode to spectator.',
    permissionLevel: 1,
    execute: (player, args) => {
        try {
            player.setGameMode(GameMode.spectator);
            player.sendMessage("§aYour gamemode has been set to spectator.");
        } catch (error) {
            player.sendMessage("§cFailed to set gamemode.");
            console.error(`[gmsp] ${error.stack}`);
        }
    }
});

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
