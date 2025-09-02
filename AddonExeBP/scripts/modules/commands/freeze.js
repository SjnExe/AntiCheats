import { world } from '@minecraft/server';
import { customCommandManager } from './customCommandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';

customCommandManager.register({
    name: 'freeze',
    description: 'Freezes or unfreezes a player.',
    category: 'Moderation',
    permissionLevel: 1, // Admin only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to freeze or unfreeze.' },
        { name: 'state', type: 'string', description: 'Set to "on" to freeze or "off" to unfreeze. Toggles if omitted.', optional: true }
    ],
    execute: (player, args) => {
        const { target, state } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            return;
        }

        const targetPlayer = target[0];

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot freeze yourself.');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot freeze a player with the same or higher rank than you.');
            return;
        }

        const action = state ? state.toLowerCase() : 'toggle';
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
    }
});
