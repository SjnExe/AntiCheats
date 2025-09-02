import { customCommandManager } from './customCommandManager.js';

customCommandManager.register({
    name: 'tpself',
    description: 'Teleports you to another player.',
    category: 'General',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'destination', type: 'player', description: 'The player to teleport to.' }
    ],
    execute: (player, args) => {
        const { destination } = args;

        if (!destination || destination.length === 0) {
            player.sendMessage('§cDestination player not found.');
            return;
        }

        const destinationPlayer = destination[0];

        player.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
        player.sendMessage(`§aTeleported to ${destinationPlayer.name}.`);
    }
});
