import { customCommandManager } from './customCommandManager.js';

customCommandManager.register({
    name: 'tp',
    aliases: ['teleport'],
    description: 'Teleports a player to another player.',
    category: 'General',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to teleport.' },
        { name: 'destination', type: 'player', description: 'The player to teleport to.' }
    ],
    execute: (player, args) => {
        const { target, destination } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cTarget player not found.');
            return;
        }
        if (!destination || destination.length === 0) {
            player.sendMessage('§cDestination player not found.');
            return;
        }

        const targetPlayer = target[0];
        const destinationPlayer = destination[0];

        targetPlayer.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
        player.sendMessage(`§aTeleported ${targetPlayer.name} to ${destinationPlayer.name}.`);
    }
});
