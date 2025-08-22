import { commandManager } from './commandManager.js';
import { world } from '@minecraft/server';
import { findPlayerByName } from '../utils/playerUtils.js';

commandManager.register({
    name: 'tp',
    description: 'Teleports a player to another player or to coordinates.',
    category: 'Admin',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        if (args.length === 0) {
            player.sendMessage("§cUsage: !tp <targetPlayer> [destinationPlayer] or !tp [targetPlayer] <x> <y> <z>");
            return;
        }

        // Teleporting self to another player: !tp <destinationPlayer>
        if (args.length === 1) {
            const destinationPlayer = findPlayerByName(args[0]);
            if (!destinationPlayer) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
            player.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
            player.sendMessage(`§aTeleported to ${destinationPlayer.name}.`);
            return;
        }

        // Teleporting a player to another player: !tp <playerToMove> <destinationPlayer>
        if (args.length === 2) {
            const playerToMove = findPlayerByName(args[0]);
            if (!playerToMove) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
            const destinationPlayer = findPlayerByName(args[1]);
            if (!destinationPlayer) {
                player.sendMessage(`§cPlayer '${args[1]}' not found.`);
                return;
            }
            playerToMove.teleport(destinationPlayer.location, { dimension: destinationPlayer.dimension });
            player.sendMessage(`§aTeleported ${playerToMove.name} to ${destinationPlayer.name}.`);
            return;
        }

        // Teleporting self to coordinates: !tp <x> <y> <z>
        if (args.length === 3) {
            const [x, y, z] = args.map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage("§cInvalid coordinates provided.");
                return;
            }
            player.teleport({ x, y, z });
            player.sendMessage(`§aTeleported to ${x}, ${y}, ${z}.`);
            return;
        }

        // Teleporting a player to coordinates: !tp <targetPlayer> <x> <y> <z>
        if (args.length === 4) {
            const targetPlayer = findPlayerByName(args[0]);
            if (!targetPlayer) {
                player.sendMessage(`§cPlayer '${args[0]}' not found.`);
                return;
            }
            const [x, y, z] = args.slice(1).map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                player.sendMessage("§cInvalid coordinates provided.");
                return;
            }
            targetPlayer.teleport({ x, y, z }, { dimension: targetPlayer.dimension });
            player.sendMessage(`§aTeleported ${targetPlayer.name} to ${x}, ${y}, ${z}.`);
            return;
        }

        player.sendMessage("§cInvalid syntax for !tp command.");
    },
});
