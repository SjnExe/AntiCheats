import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { getConfig } from '../../core/configManager.js';
import { playSound } from '../../core/utils.js';

commandManager.register({
    name: 'rank',
    description: 'Sets a player\'s rank. Currently only supports setting "admin".',
    category: 'Admin',
    permissionLevel: 0, // Owner only
    execute: (player, args) => {
        if (args.length < 2) {
            player.sendMessage('§cUsage: !rank <playerName> <rankName>');
            player.sendMessage('§cNote: The only rank that can be set is "admin".');
            return;
        }

        const targetName = args[0];
        const rankName = args[1].toLowerCase();

        if (rankName !== 'admin' && rankName !== 'member') {
            player.sendMessage('§cInvalid rank. You can only set a player to "admin" or "member" (by removing admin).');
            return;
        }

        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        const config = getConfig();
        const adminTag = config.adminTag;

        try {
            if (rankName === 'admin') {
                targetPlayer.addTag(adminTag);
                player.sendMessage(`§aSuccessfully promoted ${targetPlayer.name} to Admin.`);
                targetPlayer.sendMessage('§aYou have been promoted to Admin.');
            } else { // rankName === 'member'
                targetPlayer.removeTag(adminTag);
                player.sendMessage(`§aSuccessfully demoted ${targetPlayer.name} to Member.`);
                targetPlayer.sendMessage('§cYou have been demoted to Member.');
            }
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to update rank.');
            console.error(`[RankCommand] Error: ${e.stack}`);
        }
    }
});
