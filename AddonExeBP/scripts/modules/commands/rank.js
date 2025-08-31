import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { playSound } from '../../core/utils.js';
import { rankDefinitions } from '../../core/ranksConfig.js';
import { updatePlayerRank } from '../../core/main.js';

commandManager.register({
    name: 'rank',
    description: 'Sets a player\'s rank by adding or removing the associated tag.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    execute: (player, args) => {
        const subcommands = ['set', 'remove'];
        if (args.length < 3 || !subcommands.includes(args[0].toLowerCase())) {
            player.sendMessage('§cUsage: !rank <set|remove> <playerName> <rankId>');
            return;
        }

        const action = args[0].toLowerCase();
        const targetName = args[1];
        const rankId = args[2].toLowerCase();

        if (rankId === 'owner' || rankId === 'admin' || rankId === 'member') {
            player.sendMessage(`§cThe '${rankId}' rank cannot be managed with this command.`);
            player.sendMessage('§cOwner is set in config.js, Admin is managed with !admin, and Member is the default fallback.');
            playSound(player, 'note.bass');
            return;
        }

        const rankDef = rankDefinitions.find(r => r.id === rankId);
        if (!rankDef) {
            player.sendMessage(`§cRank ID '${rankId}' not found in configuration.`);
            playSound(player, 'note.bass');
            return;
        }

        const tagCondition = rankDef.conditions.find(c => c.type === 'hasTag');
        if (!tagCondition || !tagCondition.value) {
            player.sendMessage(`§cThe rank '${rankId}' is not configured to be assigned by a tag.`);
            playSound(player, 'note.bass');
            return;
        }

        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        const rankTag = tagCondition.value;

        try {
            if (action === 'set') {
                targetPlayer.addTag(rankTag);
                player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s rank to ${rankDef.name} by adding tag '${rankTag}'.`);
            } else { // action === 'remove'
                targetPlayer.removeTag(rankTag);
                player.sendMessage(`§aSuccessfully removed the ${rankDef.name} rank from ${targetPlayer.name} by removing tag '${rankTag}'.`);
            }
            // Re-evaluate the player's rank after changing their tag
            updatePlayerRank(targetPlayer);
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to update rank tag.');
            console.error(`[RankCommand] Error: ${e.stack}`);
        }
    }
});
