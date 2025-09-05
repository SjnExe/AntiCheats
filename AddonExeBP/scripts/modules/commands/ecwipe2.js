import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { playSound } from '../../core/utils.js';
import { world } from '@minecraft/server';
import { errorLog } from '../../core/errorLogger.js';

commandManager.register({
    name: 'ecwipe2',
    description: "Clears a player's Ender Chest (Method 2: Slot-by-slot).",
    aliases: ['clearec2', 'ecclear2'],
    category: 'Moderation',
    permissionLevel: 1, // Admin and above
    parameters: [
        { name: 'target', type: 'string', description: 'The player whose Ender Chest to clear.', optional: true }
    ],
    execute: (sender, args) => {
        let targetPlayer;

        if (!args.target) {
            targetPlayer = sender;
        } else {
            const targetName = args.target;
            const potentialTargets = [...world.getPlayers({ name: targetName })];

            if (potentialTargets.length === 0) {
                sender.sendMessage(`§cPlayer "${targetName}" not found.`);
                playSound(sender, 'note.bass');
                return;
            }
            targetPlayer = potentialTargets[0];

            const executorData = getPlayer(sender.id);
            const targetData = getPlayer(targetPlayer.id);

            if (executorData.permissionLevel > targetData.permissionLevel && sender.id !== targetPlayer.id) {
                sender.sendMessage('§cYou cannot clear the Ender Chest of a player with a higher rank.');
                playSound(sender, 'note.bass');
                return;
            }
        }

        try {
            const ecContainer = targetPlayer.enderChestContainer;
            for (let i = 0; i < ecContainer.size; i++) {
                if (ecContainer.getItem(i)) { // Only clear if there's an item, minor optimization
                    ecContainer.setItem(i); // Passing undefined clears the slot
                }
            }

            if (targetPlayer.id === sender.id) {
                sender.sendMessage('§aYour Ender Chest has been cleared (Method 2).');
            } else {
                sender.sendMessage(`§aSuccessfully cleared the Ender Chest of ${targetPlayer.name} (Method 2).`);
                targetPlayer.sendMessage('§eYour Ender Chest has been cleared by an admin.');
                playSound(targetPlayer, 'random.orb');
            }
            playSound(sender, 'random.orb');
        } catch (error) {
            errorLog(`Failed to clear Ender Chest for ${targetPlayer.name} using Method 2: ${error}`);
            sender.sendMessage('§cAn error occurred while trying to clear the Ender Chest (Method 2).');
            playSound(sender, 'note.bass');
        }
    }
});
