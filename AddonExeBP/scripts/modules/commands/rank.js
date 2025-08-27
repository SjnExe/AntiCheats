import { commandManager } from './commandManager.js';
import { findPlayerByName } from '../utils/playerUtils.js';
import { playSound } from '../../core/utils.js';
import { rankDefinitions } from '../../core/ranksConfig.js';

commandManager.register({
    name: 'rank',
    description: 'Sets a player\'s rank by adding or removing the associated tag.',
    category: '§4Administration',
    permissionLevel: 0, // Owner only for now, for safety.
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

        const tagCondition = rankDef.conditions.find(c => c.type === 'tag');
        if (!tagCondition || !tagCondition.tag) {
            player.sendMessage(`§cThe rank '${rankId}' is not configured to be assigned by a tag.`);
            playSound(player, 'note.bass');
            return;
        }

        const targetPlayer = findPlayerByName(targetName);
        if (!targetPlayer) {
            player.sendMessage(`§cPlayer "${targetName}" not found.`);
            return;
        }

        const rankTag = tagCondition.tag;

        try {
            if (action === 'set') {
                targetPlayer.addTag(rankTag);
                player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s rank to ${rankDef.name} by adding tag '${rankTag}'.`);
                targetPlayer.sendMessage(`§aYour rank has been updated to ${rankDef.name}.`);
            } else { // action === 'remove'
                targetPlayer.removeTag(rankTag);
                player.sendMessage(`§aSuccessfully removed the ${rankDef.name} rank from ${targetPlayer.name} by removing tag '${rankTag}'.`);
                targetPlayer.sendMessage('§eYour rank has been updated.');
            }
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to update rank tag.');
            console.error(`[RankCommand] Error: ${e.stack}`);
        }
    }
});
