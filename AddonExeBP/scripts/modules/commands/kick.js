import { customCommandManager } from './customCommandManager.js';
import { getPlayer } from '../../core/playerDataManager.js';
import { playSound } from '../../core/utils.js';

customCommandManager.register({
    name: 'kick',
    description: 'Kicks a player from the server.',
    aliases: ['boot'],
    category: 'Moderation',
    permissionLevel: 1, // Admins only
    parameters: [
        { name: 'target', type: 'player', description: 'The player to kick.' },
        { name: 'reason', type: 'string', description: 'The reason for the kick.', optional: true }
    ],
    execute: (player, args) => {
        const { target, reason: reasonArg } = args;

        if (!target || target.length === 0) {
            player.sendMessage('§cPlayer not found.');
            playSound(player, 'note.bass');
            return;
        }

        const targetPlayer = target[0];
        const reason = reasonArg || 'No reason provided';

        if (player.id === targetPlayer.id) {
            player.sendMessage('§cYou cannot kick yourself.');
            playSound(player, 'note.bass');
            return;
        }

        const executorData = getPlayer(player.id);
        const targetData = getPlayer(targetPlayer.id);

        if (!executorData || !targetData) {
            player.sendMessage('§cCould not retrieve player data for permission check.');
            playSound(player, 'note.bass');
            return;
        }

        if (executorData.permissionLevel >= targetData.permissionLevel) {
            player.sendMessage('§cYou cannot kick a player with the same or higher rank than you.');
            playSound(player, 'note.bass');
            return;
        }

        try {
            player.runCommand(`kick "${targetPlayer.name}" ${reason}`);
            player.sendMessage(`§aSuccessfully kicked ${targetPlayer.name}. Reason: ${reason}`);
            playSound(player, 'random.orb');
        } catch (error) {
            player.sendMessage(`§cFailed to kick ${targetPlayer.name}. See console for details.`);
            playSound(player, 'note.bass');
            console.error(`[/exe:kick] Failed to run kick command for ${targetPlayer.name}:`, error);
        }
    }
});
