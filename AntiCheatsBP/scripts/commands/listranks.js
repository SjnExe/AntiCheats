/**
 * Defines the !listranks command to display available ranks and their properties.
 */
import { permissionLevels } from '../core/rankManager.js'; // For defining command's own permission
import { rankDefinitions } from '../core/ranksConfig.js'; // To get rank information

export const definition = {
    name: "listranks",
    syntax: "!listranks",
    description: "Lists all defined ranks and their basic properties.",
    permissionLevel: permissionLevels.admin, // Admins can see rank structure
    enabled: true,
};

export async function execute(player, args, dependencies) {
    const { config, playerUtils, logManager } = dependencies;

    if (!rankDefinitions || rankDefinitions.length === 0) {
        player.sendMessage("§cNo ranks are currently defined in the system.");
        return;
    }

    let message = "§e--- Available Ranks ---\n";
    // Sort by priority for consistent display, then by name
    const sortedRanks = [...rankDefinitions].sort((a, b) => {
        const priorityDiff = (a.priority ?? Infinity) - (b.priority ?? Infinity);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name);
    });

    for (const rankDef of sortedRanks) {
        message += `§aID: §f${rankDef.id}\n`;
        message += `  §bName: §f${rankDef.name}\n`;
        message += `  §dPermLevel: §f${rankDef.permissionLevel}\n`;
        message += `  §6Priority: §f${rankDef.priority}\n`;

        let conditionStrings = [];
        if (rankDef.conditions && rankDef.conditions.length > 0) {
            for (const cond of rankDef.conditions) {
                if (cond.type === "owner_name") conditionStrings.push("Is Owner (by name)");
                else if (cond.type === "admin_tag") conditionStrings.push("Has Admin Tag");
                else if (cond.type === "manual_tag_prefix") conditionStrings.push(`Manual Tag (e.g., ${cond.prefix}${rankDef.id})`);
                else if (cond.type === "tag") conditionStrings.push(`Has Tag: ${cond.tag}`);
                else if (cond.type === "default") conditionStrings.push(`Default fallback`);
                else conditionStrings.push(`Custom (${cond.type})`);
            }
        } else {
            conditionStrings.push("None (or implicit default)");
        }
        message += `  §3Conditions: §f${conditionStrings.join(', ')}\n`;
        message += `  §7Chat Prefix: §r${rankDef.chatFormatting?.prefixText || "Default"}\n`;
        message += `  §7Nametag: §r${rankDef.nametagPrefix?.replace("\\n", "") || "Default"}\n\n`;
    }

    player.sendMessage(message.trim());

    logManager.addLog({
        adminName: player.nameTag,
        actionType: 'list_ranks',
        details: `Listed all ${rankDefinitions.length} ranks.`
    }, dependencies);
}
