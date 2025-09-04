import { commandManager } from './commandManager.js';
import { GameMode } from '@minecraft/server';
import { getPlayer } from '../../core/playerDataManager.js';
import { errorLog } from '../../core/errorLogger.js';

const gamemodes = {
    'survival': GameMode.Survival,
    's': GameMode.Survival,
    'creative': GameMode.Creative,
    'c': GameMode.Creative,
    'adventure': GameMode.Adventure,
    'a': GameMode.Adventure,
    'spectator': GameMode.Spectator,
    'sp': GameMode.Spectator
};

const gamemodeNames = {
    [GameMode.Survival]: 'Survival',
    [GameMode.Creative]: 'Creative',
    [GameMode.Adventure]: 'Adventure',
    [GameMode.Spectator]: 'Spectator'
};

function setGamemode(player, gamemode, target) {
    let targetPlayer = player;
    if (target && target.length > 0) {
        targetPlayer = target[0];

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);
        if (executorData && targetData && executorData.permissionLevel >= targetData.permissionLevel && player.id !== targetPlayer.id) {
            player.sendMessage('§cYou cannot change the gamemode of a player with the same or higher rank.');
            return;
        }
    }

    const gameModeValue = gamemodes[gamemode.toLowerCase()];
    if (gameModeValue === undefined) {
        player.sendMessage(`§cInvalid gamemode: ${gamemode}`);
        return;
    }

    try {
        targetPlayer.setGameMode(gameModeValue);
        const gamemodeName = gamemodeNames[gameModeValue];
        if (player.id === targetPlayer.id) {
            player.sendMessage(`§aYour gamemode has been set to ${gamemodeName}.`);
        } else {
            player.sendMessage(`§aSet ${targetPlayer.name}'s gamemode to ${gamemodeName}.`);
            targetPlayer.sendMessage(`§aYour gamemode has been set to ${gamemodeName} by ${player.name}.`);
        }
    } catch (e) {
        player.sendMessage(`§cFailed to set gamemode. Error: ${e.message}`);
        errorLog(`[/gamemode] Failed to set gamemode: ${e.stack}`);
    }
}

commandManager.register({
    name: 'gamemode',
    aliases: ['gm'],
    description: 'Sets your or another player\'s gamemode.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: false,
    parameters: [
        { name: 'gamemode', type: 'string', description: 'The gamemode to set (survival, creative, adventure, spectator).', optional: false },
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        if (!args.gamemode) {
            player.sendMessage('§cYou must specify a gamemode.');
            return;
        }
        setGamemode(player, args.gamemode, args.target);
    }
});

commandManager.register({
    name: 'gms',
    aliases: ['s', 'survival'],
    description: 'Sets your or another player\'s gamemode to Survival.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        setGamemode(player, 'survival', args.target);
    }
});

commandManager.register({
    name: 'gmc',
    aliases: ['c', 'creative'],
    description: 'Sets your or another player\'s gamemode to Creative.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        setGamemode(player, 'creative', args.target);
    }
});

commandManager.register({
    name: 'gma',
    aliases: ['a', 'adventure'],
    description: 'Sets your or another player\'s gamemode to Adventure.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        setGamemode(player, 'adventure', args.target);
    }
});

commandManager.register({
    name: 'gmsp',
    aliases: ['sp', 'spectator'],
    description: 'Sets your or another player\'s gamemode to Spectator.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true,
    parameters: [
        { name: 'target', type: 'player', description: 'The player to set the gamemode for.', optional: true }
    ],
    execute: (player, args) => {
        setGamemode(player, 'spectator', args.target);
    }
});
