import { commandManager } from './commandManager.js';
import { updateConfig } from '../../core/configManager.js';
import { playSound } from '../../core/utils.js';

commandManager.register({
    name: 'setspawn',
    aliases: ['setworldspawn'],
    disabledSlashAliases: ['setworldspawn'],
    description: 'Sets the server\'s spawn location to your current position or specified coordinates.',
    category: 'Administration',
    permissionLevel: 1, // Admins only
    allowConsole: true,
    parameters: [
        { name: 'x', type: 'float', description: 'The X coordinate for the spawn.', optional: true },
        { name: 'y', type: 'float', description: 'The Y coordinate for the spawn.', optional: true },
        { name: 'z', type: 'float', description: 'The Z coordinate for the spawn.', optional: true }
    ],
    execute: (player, args) => {
        let location;
        const { x, y, z } = args;

        if (x !== undefined && y !== undefined && z !== undefined) {
            // Coordinates are provided
            location = {
                x: x,
                y: y,
                z: z,
                dimensionId: player.isConsole ? 'minecraft:overworld' : player.dimension.id
            };
        } else {
            // No coordinates, use player location
            if (player.isConsole) {
                player.sendMessage('§cYou must specify X, Y, and Z coordinates when running this command from the console.');
                return;
            }
            location = {
                x: player.location.x,
                y: player.location.y,
                z: player.location.z,
                dimensionId: player.dimension.id
            };
        }

        updateConfig('spawnLocation', location);

        const locationString = `X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)} in ${location.dimensionId.replace('minecraft:', '')}`;
        player.sendMessage(`§aServer spawn point set to: ${locationString}`);
        if (!player.isConsole) {playSound(player, 'random.orb');}
    }
});
