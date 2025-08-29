import { world } from '@minecraft/server';
import { commandManager } from './commandManager.js';

commandManager.register({
    name: 'vanish',
    aliases: ['v'],
    description: 'Makes you invisible to other players.',
    aliases: ['v'],
    category: 'Moderation',
    permissionLevel: 1, // Admin only
    execute: (player, args) => {
        const vanishedTag = 'vanished';
        const isVanished = player.hasTag(vanishedTag);

        if (isVanished) {
            player.removeTag(vanishedTag);
            player.removeEffect('invisibility');
            player.sendMessage('§aYou are no longer vanished.');
            world.sendMessage(`§e${player.name} joined the game.`);
        } else {
            player.addTag(vanishedTag);
            player.addEffect('invisibility', 2000000, { amplifier: 1, showParticles: false });
            player.sendMessage('§aYou are now vanished.');
            world.sendMessage(`§e${player.name} left the game.`);
        }
    }
});
