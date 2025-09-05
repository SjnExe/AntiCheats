import { commandManager } from './commandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { playSound } from '../../core/utils.js';
import { world } from '@minecraft/server';
import { errorLog } from '../../core/errorLogger.js';

commandManager.register({
    name: 'ecwipe',
    description: "Clears a player's Ender Chest.",
    aliases: ['clearec', 'ecclear'],
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

            // Lower permissionLevel number means higher rank. 0=Owner, 1=Admin.
            if (executorData.permissionLevel > targetData.permissionLevel) {
                sender.sendMessage('§cYou cannot clear the Ender Chest of a player with a higher rank than you.');
                playSound(sender, 'note.bass');
                return;
            }
        }

        try {
            // Ender Chest has 27 slots (0-26). We loop through and clear each one with a command.
            for (let i = 0; i < 27; i++) {
                // targetPlayer.runCommand() executes the command *as* the target player,
                // so @s is the correct and most reliable selector.
                targetPlayer.runCommand(`/item replace entity @s slot.enderchest ${i} with air`);
            }

            if (targetPlayer.id === sender.id) {
                sender.sendMessage('§aYour Ender Chest has been cleared.');
            } else {
                sender.sendMessage(`§aSuccessfully cleared the Ender Chest of ${targetPlayer.name}.`);
                targetPlayer.sendMessage('§eYour Ender Chest has been cleared by an admin.');
                playSound(targetPlayer, 'random.orb');
            }
            playSound(sender, 'random.orb');
        } catch (error) {
            errorLog(`Failed to clear Ender Chest for ${targetPlayer.name}: ${error}`);
            sender.sendMessage('§cAn error occurred while trying to clear the Ender Chest.');
            playSound(sender, 'note.bass');
        }
    }
});
