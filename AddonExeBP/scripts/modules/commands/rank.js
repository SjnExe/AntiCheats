import { commandManager } from './commandManager.js';
import { playSound } from '../../core/utils.js';
import { rankDefinitions } from '../../core/ranksConfig.js';
import { updatePlayerRank } from '../../core/main.js';

commandManager.register({
    name: 'rank',
    description: 'Sets a player\'s rank by adding or removing the associated tag.',
    category: 'Administration',
    permissionLevel: 1, // Admin and above
    parameters: [
        { name: 'action', type: 'string', description: 'The action to perform: "set" or "remove".' },
        { name: 'target', type: 'player', description: 'The player to set the rank for.' },
        { name: 'rankId', type: 'string', description: 'The ID of the rank to set.' }
    ],
    execute: (player, args) => {
        const { action, target, rankId } = args;
        const subcommands = ['set', 'remove'];
        if (!subcommands.includes(action.toLowerCase())) {
            player.sendMessage('§cUsage: /x:rank <set|remove> <playerName> <rankId>');
            return;
        }

        const actionLC = action.toLowerCase();

        if (!target || target.length === 0) {
            player.sendMessage(`§cPlayer not found.`);
            return;
        }
        const targetPlayer = target[0];

        if (rankId.toLowerCase() === 'owner' || rankId.toLowerCase() === 'admin' || rankId.toLowerCase() === 'member') {
            player.sendMessage(`§cThe '${rankId}' rank cannot be managed with this command.`);
            player.sendMessage('§cOwner is set in config.js, Admin is managed with !admin, and Member is the default fallback.');
            playSound(player, 'note.bass');
            return;
        }

        const rankDef = rankDefinitions.find(r => r.id === rankId.toLowerCase());
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

        const rankTag = tagCondition.value;

        try {
            if (actionLC === 'set') {
                targetPlayer.addTag(rankTag);
                player.sendMessage(`§aSuccessfully set ${targetPlayer.name}'s rank to ${rankDef.name} by adding tag '${rankTag}'.`);
            } else { // actionLC === 'remove'
                targetPlayer.removeTag(rankTag);
                player.sendMessage(`§aSuccessfully removed the ${rankDef.name} rank from ${targetPlayer.name} by removing tag '${rankTag}'.`);
            }
            updatePlayerRank(targetPlayer);
            playSound(player, 'random.orb');
        } catch (e) {
            player.sendMessage('§cFailed to update rank tag.');
            console.error(`[/x:rank] Error: ${e.stack}`);
        }
    }
});
