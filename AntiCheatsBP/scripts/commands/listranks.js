/**
 * @file Defines the !listranks command to display available ranks and their properties.
 */
// Assuming permissionLevels is a static export for now.
import { permissionLevels } from '../core/rankManager.js';
// rankDefinitions is imported from ranksConfig, not rankManager directly
import { rankDefinitions as allRankDefinitions } from '../core/ranksConfig.js'; // Renamed to avoid conflict

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'listranks',
    syntax: '', // Prefix handled by commandManager
    description: 'Lists all defined ranks and their basic properties.',
    permissionLevel: permissionLevels.member, // Accessible by members
    enabled: true,
};

/**
 * Executes the !listranks command.
 * Displays a list of all defined ranks, their properties (ID, name, permission level, priority),
 * conditions for assignment, and basic formatting (chat prefix, nametag).
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').Dependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, getString, rankManager } = dependencies; // Added rankManager for getRankById potentially
    const adminName = player?.nameTag ?? 'UnknownAdmin';

    if (!allRankDefinitions || allRankDefinitions.length === 0) {
        player.sendMessage(getString('command.listranks.noRanks'));
        return;
    }

    let message = getString('command.listranks.header') + '\n';
    // Sort by priority for consistent display, then by name
    const sortedRanks = [...allRankDefinitions].sort((a, b) => {
        const priorityA = a.priority ?? Infinity;
        const priorityB = b.priority ?? Infinity;
        const priorityDiff = priorityA - priorityB;
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        // Fallback to sorting by name if priorities are equal
        return (a.name || getString('common.value.unknown')).localeCompare(b.name || getString('common.value.unknown'));
    });

    for (const rankDef of sortedRanks) {
        message += getString('command.listranks.rank.id', { id: rankDef.id }) + '\n';
        message += getString('command.listranks.rank.name', { name: rankDef.name }) + '\n';
        message += getString('command.listranks.rank.permLevel', { permLevel: rankDef.permissionLevel.toString() }) + '\n';
        message += getString('command.listranks.rank.priority', { priority: (rankDef.priority ?? 'N/A').toString() }) + '\n';

        const conditionStrings = [];
        if (rankDef.conditions && rankDef.conditions.length > 0) {
            for (const cond of rankDef.conditions) {
                switch (cond.type) {
                    case 'ownerName': conditionStrings.push(getString('command.listranks.condition.ownerName')); break;
                    case 'adminTag': conditionStrings.push(getString('command.listranks.condition.adminTag')); break;
                    case 'manualTagPrefix': conditionStrings.push(getString('command.listranks.condition.manualTagPrefix', { prefix: cond.prefix ?? '', rankId: rankDef.id })); break;
                    case 'tag': conditionStrings.push(getString('command.listranks.condition.tag', { tag: cond.tag ?? '' })); break;
                    case 'default': conditionStrings.push(getString('command.listranks.condition.default')); break;
                    default: conditionStrings.push(getString('command.listranks.condition.custom', { type: cond.type })); break;
                }
            }
        }
        if (conditionStrings.length === 0) {
            conditionStrings.push(getString('command.listranks.condition.none'));
        }
        message += getString('command.listranks.rank.conditions', { conditions: conditionStrings.join(', ') }) + '\n';

        // Display chat prefix (text part only for brevity)
        const chatPrefixText = rankDef.chatFormatting?.prefixText?.replace(/§[0-9a-fk-or]/gi, '') || getString('command.listranks.formatting.default');
        message += getString('command.listranks.rank.chatPrefix', { prefix: chatPrefixText.trim() || getString('common.value.notAvailable') }) + '\n';

        // Display nametag prefix (text part, removing color codes and newlines for brevity)
        const nametagText = rankDef.nametagPrefix?.replace(/§[0-9a-fk-or]/gi, '').replace(/\\n/g, ' ').trim() || getString('command.listranks.formatting.default');
        message += getString('command.listranks.rank.nametag', { nametag: nametagText || getString('common.value.notAvailable') }) + '\n\n';
    }

    player.sendMessage(message.trim());
    playerUtils?.playSoundForEvent(player, "commandSuccess", dependencies);

    try {
        logManager?.addLog({
            adminName: adminName, // Or player.nameTag if it's a general user command
            actionType: 'ranksListed', // Standardized camelCase
            details: `Listed all ${sortedRanks.length} ranks.`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ListRanksCommand CRITICAL] Error logging: ${logError.stack || logError}`);
        playerUtils?.debugLog(`[ListRanksCommand CRITICAL] Logging error for ${adminName}: ${logError.message}`, adminName, dependencies);
    }
}
