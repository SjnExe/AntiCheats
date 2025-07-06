/**
 * @file Defines the !listranks command to display available ranks and their properties.
 */
import { permissionLevels } from '../core/rankManager.js';
import { rankDefinitions } from '../core/ranksConfig.js';

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: 'listranks',
    syntax: '!listranks',
    description: 'Lists all defined ranks and their basic properties.',
    permissionLevel: permissionLevels.member,
    enabled: true,
};

/**
 * Executes the !listranks command.
 * Displays a list of all defined ranks, their properties (ID, name, permission level, priority),
 * conditions for assignment, and basic formatting (chat prefix, nametag).
 * @async
 * @param {import('@minecraft/server').Player} player - The player issuing the command.
 * @param {string[]} _args - Command arguments (not used in this command).
 * @param {import('../types.js').CommandDependencies} dependencies - Object containing dependencies.
 * @returns {Promise<void>}
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, getString } = dependencies;

    if (!rankDefinitions || rankDefinitions.length === 0) {
        player.sendMessage(getString('command.listranks.noRanks'));
        return;
    }

    let message = getString('command.listranks.header') + '\n';
    // Sort by priority for consistent display, then by name
    const sortedRanks = [...rankDefinitions].sort((a, b) => {
        const priorityA = a.priority ?? Infinity;
        const priorityB = b.priority ?? Infinity;
        const priorityDiff = priorityA - priorityB;
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        return (a.name || getString('common.value.unknown') + ' Rank').localeCompare(b.name || getString('common.value.unknown') + ' Rank');
    });

    for (const rankDef of sortedRanks) {
        message += getString('command.listranks.rank.id', { id: rankDef.id }) + '\n';
        message += getString('command.listranks.rank.name', { name: rankDef.name }) + '\n';
        message += getString('command.listranks.rank.permLevel', { permLevel: rankDef.permissionLevel.toString() }) + '\n';
        message += getString('command.listranks.rank.priority', { priority: rankDef.priority.toString() }) + '\n';

        let conditionStrings = [];
        if (rankDef.conditions && rankDef.conditions.length > 0) {
            for (const cond of rankDef.conditions) {
                if (cond.type === 'ownerName') conditionStrings.push(getString('command.listranks.condition.ownerName'));
                else if (cond.type === 'adminTag') conditionStrings.push(getString('command.listranks.condition.adminTag'));
                else if (cond.type === 'manualTagPrefix') conditionStrings.push(getString('command.listranks.condition.manualTagPrefix', { prefix: cond.prefix, rankId: rankDef.id }));
                else if (cond.type === 'tag') conditionStrings.push(getString('command.listranks.condition.tag', { tag: cond.tag }));
                else if (cond.type === 'default') conditionStrings.push(getString('command.listranks.condition.default'));
                else conditionStrings.push(getString('command.listranks.condition.custom', { type: cond.type }));
            }
        } else {
            conditionStrings.push(getString('command.listranks.condition.none'));
        }
        message += getString('command.listranks.rank.conditions', { conditions: conditionStrings.join(', ') }) + '\n';
        message += getString('command.listranks.rank.chatPrefix', { prefix: rankDef.chatFormatting?.prefixText || getString('command.listranks.formatting.default') }) + '\n';
        message += getString('command.listranks.rank.nametag', { nametag: rankDef.nametagPrefix?.replace(/\\n/g, '') || getString('command.listranks.formatting.default') }) + '\n\n';
    }

    player.sendMessage(message.trim());

    try {
        logManager.addLog({
            adminName: player.nameTag,
            actionType: 'listRanks',
            details: `Listed all ${rankDefinitions.length} ranks.`,
        }, dependencies);
    } catch (logError) {
        console.error(`[ListRanksCommand] Error logging: ${logError.stack || logError}`);
        if (playerUtils && playerUtils.debugLog) {
            playerUtils.debugLog(`[ListRanksCommand] Logging error: ${logError.message}`, player.nameTag, dependencies);
        }
    }
}
