import { commandManager } from './commandManager.js';
import { EffectTypes } from '@minecraft/server';

commandManager.register({
    name: 'vanish',
    aliases: ['v'],
    description: 'Toggles visibility for yourself.',
    permissionLevel: 1, // Admins only
    execute: (player, args) => {
        try {
            if (player.hasTag('vanished')) {
                // Unvanish
                player.removeTag('vanished');
                player.removeEffect(EffectTypes.get('invisibility'));
                player.sendMessage('§aYou are no longer vanished.');
            } else {
                // Vanish
                player.addTag('vanished');
                // Apply invisibility for a very long time (approx. 2.7 years in ticks)
                player.addEffect(EffectTypes.get('invisibility'), 1700000000, { amplifier: 0, showParticles: false });
                player.sendMessage('§aYou are now vanished.');
            }
        } catch (error) {
            player.sendMessage('§cFailed to toggle vanish state.');
            console.error(`[!vanish] ${error.stack}`);
        }
    },
});
