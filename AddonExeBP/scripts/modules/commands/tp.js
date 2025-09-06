import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'tp',
    aliases: ['teleport'],
    description: 'Teleports a player to another player or to coordinates.',
    category: 'General',
    permissionLevel: 1, // Admins only
    disableSlashCommand: true, // This command has a vanilla counterpart
    parameters: [
        { name: 'arg1', type: 'string', description: 'Target player or destination player/X-coordinate.' },
        { name: 'arg2', type: 'string', description: 'Destination player or Y-coordinate.', optional: true },
        { name: 'arg3', type: 'string', description: 'Z-coordinate.', optional: true },
        { name: 'arg4', type: 'string', description: 'Z-coordinate if teleporting another player.', optional: true }
    ],
    execute: (player, args) => {
        const argValues = [args.arg1, args.arg2, args.arg3, args.arg4].filter(arg => arg !== undefined);

        if (argValues.length === 0) {
            player.sendMessage('§cUsage: !tp <target> [destination] OR !tp [target] <x> <y> <z>');
            return;
        }

        // Case 1: !tp <destinationPlayer>
        if (argValues.length === 1) {
            const destinationPlayer = findPlayerByName(argValues[0]);
            if (!destinationPlayer) {
                player.sendMessage(`§cPlayer '${argValues[0]}' not found.`);
                return;
            }
            player.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
            player.sendMessage(`§aTeleported to ${destinationPlayer.name}.`);
            return;
        }

        // Case 2: !tp <playerToMove> <destinationPlayer>
        if (argValues.length === 2) {
            const playerToMove = findPlayerByName(argValues[0]);
            if (!playerToMove) {
                player.sendMessage(`§cPlayer '${argValues[0]}' not found.`);
                return;
            }
            const destinationPlayer = findPlayerByName(argValues[1]);
            if (!destinationPlayer) {
                player.sendMessage(`§cPlayer '${argValues[1]}' not found.`);
                return;
            }
            playerToMove.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
            player.sendMessage(`§aTeleported ${playerToMove.name} to ${destinationPlayer.name}.`);
            return;
        }

        // Case 3: !tp <x> <y> <z>
        if (argValues.length === 3) {
            const [x, y, z] = argValues.map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage('§cInvalid coordinates provided.');
                return;
            }
            player.teleport({ x, y, z });
            player.sendMessage(`§aTeleported to ${x}, ${y}, ${z}.`);
            return;
        }

        // Case 4: !tp <targetPlayer> <x> <y> <z>
        if (argValues.length === 4) {
            const targetPlayer = findPlayerByName(argValues[0]);
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer '${argValues[0]}' not found.`);
                return;
            }
            const [x, y, z] = argValues.slice(1).map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage('§cInvalid coordinates provided.');
                return;
            }
            targetPlayer.teleport({ x, y, z }, { dimension: targetPlayer.dimension });
            player.sendMessage(`§aTeleported ${targetPlayer.name} to ${x}, ${y}, ${z}.`);
            return;
        }

        player.sendMessage('§cInvalid syntax for !tp command. Too many arguments.');
    }
});
