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
    permissionLevel: permissionLevels.normal,
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
    const { logManager, playerUtils } = dependencies;

    if (!rankDefinitions || rankDefinitions.length === 0) {
        player.sendMessage('§cNo ranks are currently defined in the system.');
        return;
    }

    let message = '§e--- Available Ranks ---\n';
    // Sort by priority for consistent display, then by name
    const sortedRanks = [...rankDefinitions].sort((a, b) => {
        const priorityA = a.priority ?? Infinity;
        const priorityB = b.priority ?? Infinity;
        const priorityDiff = priorityA - priorityB;
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        return (a.name || 'Unknown Rank').localeCompare(b.name || 'Unknown Rank');
    });

    for (const rankDef of sortedRanks) {
        message += `§aID: §f${rankDef.id}\n`;
        message += `  §bName: §f${rankDef.name}\n`;
        message += `  §dPermLevel: §f${rankDef.permissionLevel}\n`;
        message += `  §6Priority: §f${rankDef.priority}\n`;

        let conditionStrings = [];
        if (rankDef.conditions && rankDef.conditions.length > 0) {
            for (const cond of rankDef.conditions) {
                if (cond.type === 'owner_name') conditionStrings.push('Is Owner (by name)');
                else if (cond.type === 'admin_tag') conditionStrings.push('Has Admin Tag');
                else if (cond.type === 'manual_tag_prefix') conditionStrings.push(`Manual Tag (e.g., ${cond.prefix}${rankDef.id})`);
                else if (cond.type === 'tag') conditionStrings.push(`Has Tag: ${cond.tag}`);
                else if (cond.type === 'default') conditionStrings.push('Default fallback');
                else conditionStrings.push(`Custom (${cond.type})`);
            }
        } else {
            conditionStrings.push('None (or implicit default)');
        }
        message += `  §3Conditions: §f${conditionStrings.join(', ')}\n`;
        message += `  §7Chat Prefix: §r${rankDef.chatFormatting?.prefixText || 'Default'}\n`;
        message += `  §7Nametag: §r${rankDef.nametagPrefix?.replace(/\\n/g, '') || 'Default'}\n\n`;
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
