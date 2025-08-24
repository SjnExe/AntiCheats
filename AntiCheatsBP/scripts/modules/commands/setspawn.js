import { commandManager } from './commandManager.js';
import { updateConfig } from '../../core/configManager.js';
import { playSound } from '../../core/utils.js';

commandManager.register({
    name: 'setspawn',
    description: 'Sets the server\'s spawn location to your current position.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        const location = {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
            dimensionId: player.dimension.id,
        };

        updateConfig('spawnLocation', location);

        const locationString = `X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)}`;
        player.sendMessage(`§aServer spawn point set to your location: ${locationString}`);
        playSound(player, 'random.orb');
    },
});
