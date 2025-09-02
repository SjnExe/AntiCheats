import { customCommandManager } from './customCommandManager.js';

customCommandManager.register({
    name: 'tpposplayer',
    description: 'Teleports a player to coordinates.',
    category: 'General',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to teleport.' },
        { name: 'x', type: 'float', description: 'The x-coordinate.' },
        { name: 'y', type: 'float', description: 'The y-coordinate.' },
        { name: 'z', type: 'float', description: 'The z-coordinate.' }
    ],
    execute: (player, args) => {
        const { target, x, y, z } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cTarget player not found.');
            return;
        }

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            player.sendMessage('§cInvalid coordinates provided.');
            return;
        }

        const targetPlayer = target[0];
        targetPlayer.teleport({ x, y, z }, { dimension: targetPlayer.dimension });
        player.sendMessage(`§aTeleported ${targetPlayer.name} to ${x}, ${y}, ${z}.`);
    }
});
