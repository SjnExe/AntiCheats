import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

commandManager.register({
    name: 'freeze',
    description: 'Freezes or unfreezes a player.',
    category: 'Moderation',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        if (args.length < 1) {
            player.sendMessage('§cUsage: !freeze <playerName> [on|off]');
            return;
        }

        const targetName = args[0];
        const targetPlayer = [...world.getPlayers()].find(p => p.name === targetName);

        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot freeze yourself.');
            return;
        }

        const action = args[1] ? args[1].toLowerCase() : 'toggle';
        const frozenTag = 'frozen';
        const isFrozen = targetPlayer.hasTag(frozenTag);

        let freeze;
        if (action === 'on') freeze = true;
        else if (action === 'off') freeze = false;
        else freeze = !isFrozen;

        if (freeze) {
            if (isFrozen) {
                player.sendMessage(`§ePlayer ${targetPlayer.name} is already frozen.`);
                return;
            }
            targetPlayer.addTag(frozenTag);
            targetPlayer.addEffect('slowness', 2000000, { amplifier: 255, showParticles: false });
            player.sendMessage(`§aSuccessfully froze ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§cYou have been frozen by an admin.');
        } else {
            if (!isFrozen) {
                player.sendMessage(`§ePlayer ${targetPlayer.name} is not frozen.`);
                return;
            }
            targetPlayer.removeTag(frozenTag);
            targetPlayer.removeEffect('slowness');
            player.sendMessage(`§aSuccessfully unfroze ${targetPlayer.name}.`);
            targetPlayer.sendMessage('§aYou have been unfrozen.');
        }
    },
});
