import { customCommandManager } from './customCommandManager.js';

customCommandManager.register({
    name: 'tppos',
    description: 'Teleports you to coordinates.',
    category: 'General',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'x', type: 'float', description: 'The x-coordinate.' },
        { name: 'y', type: 'float', description: 'The y-coordinate.' },
        { name: 'z', type: 'float', description: 'The z-coordinate.' }
    ],
    execute: (player, args) => {
        const { x, y, z } = args;

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            player.sendMessage('§cInvalid coordinates provided.');
            return;
        }

        player.teleport({ x, y, z });
        player.sendMessage(`§aTeleported to ${x}, ${y}, ${z}.`);
    }
});
