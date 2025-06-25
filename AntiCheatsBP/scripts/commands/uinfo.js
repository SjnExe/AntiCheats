/**
 * Defines the !uinfo command, providing a user interface for players to view their
 * AntiCheat statistics, server rules, and other helpful information.
 */
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';

/**
 * Shows the player their anti-cheat statistics.
 */
async function showMyStatsUI(player, dependencies) {
    const { playerDataManager, playerUtils, config } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutput = "Your AntiCheat Stats:\n";

    if (pData && pData.flags) {
        statsOutput += `Total Flags: ${pData.flags.totalFlags || 0}\n`;
        statsOutput += `Last Flag Type: ${pData.lastFlagType || "None"}\n\n`;
        statsOutput += "Flag Breakdown:\n";
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                statsOutput += `- ${flagKey}: ${flagData.count} (Last: ${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : "N/A"})\n`;
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
             statsOutput = "You have no active flags.";
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
             statsOutput = `Total Flags: ${pData.flags.totalFlags || 0}. Last Type: ${pData.lastFlagType || "None"}. (No specific flag details)`;
        }
    } else {
        statsOutput = "No AntiCheat data found for you.";
    }
    const form = new MessageFormData()
        .title("My AntiCheat Stats")
        .body(statsOutput.trim())
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.stack || e}`); });
}
/**
 * Shows the server rules to the player.
 */
async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    const rulesValue = config.serverRules;

    let rulesText = (Array.isArray(rulesValue) && rulesValue.length > 0)
        ? rulesValue.join("\n")
        : "No server rules are currently configured. Please check back later!";

    const form = new MessageFormData()
        .title("Server Rules")
        .body(rulesText)
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows helpful links to the player.
 */
async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    let linksBody = "Helpful Links:\n";
    let hasContent = false;

    if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
        linksBody += `Discord: ${config.discordLink}\n`;
        hasContent = true;
    }
    if (config.websiteLink && config.websiteLink.trim() !== "" && config.websiteLink !== "https://example.com") {
        linksBody += `Website: ${config.websiteLink}\n`;
        hasContent = true;
    }

    if (config.helpLinks && config.helpLinks.length > 0) {
        if (hasContent) {
            linksBody += "\nOther Links:\n";
        }
        config.helpLinks.forEach(link => {
            linksBody += `- ${link.title}: ${link.url}\n`;
            hasContent = true;
        });
    }

    if (!hasContent) {
        linksBody = "No helpful links are currently configured.";
    }

    const form = new MessageFormData()
        .title("Helpful Links")
        .body(linksBody.trim())
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.stack || e}`); });
}
/**
 * Shows general tips to the player.
 */
async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    let tips = "";

    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tips = config.generalHelpMessages
            .filter(tip => typeof tip === 'string' && tip.trim() !== '')
            .join("\n");
    }

    if (!tips) {
        tips = "No general tips available at the moment.";
    }

    const form = new MessageFormData()
        .title("General Tips")
        .body(tips)
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "uinfo",
    syntax: "!uinfo",
    description: "Shows your anti-cheat stats, server rules, and help links in a UI.",
    permissionLevel: 0,
    enabled: true,
};
/**
 * Executes the uinfo command, showing a UI panel with various info for the player.
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, config, permissionLevels } = dependencies;

    const mainPanel = new ActionFormData()
        .title("Player Information Panel")
        .body(`Welcome, ${player.nameTag}! Select an option:`)
        .button("My AntiCheat Stats", "textures/ui/WarningGlyph")
        .button("Server Rules", "textures/ui/book_glyph_color")
        .button("Helpful Links", "textures/ui/icon_link")
        .button("General Tips", "textures/ui/lightbulb_idea_color");

    const response = await mainPanel.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error showing main uinfo panel for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[UInfoCommand] Error showing main uinfo panel for ${player.nameTag}: ${e.stack || e}`);
        return { canceled: true, error: true };
    });

    if (response.canceled) {
        if (!response.error) {
            playerUtils.debugLog(`[UInfoCommand] User ${player.nameTag} cancelled uinfo panel. Reason: ${response.cancelationReason}`, player.nameTag, dependencies);
        }
        return;
    }

    logManager.addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'commandUinfo', details: `Player used !uinfo, selected option index: ${response.selection}` }, dependencies); // Changed to camelCase

    switch (response.selection) {
        case 0: await showMyStatsUI(player, dependencies); break;
        case 1: await showServerRulesUI(player, dependencies); break;
        case 2: await showHelpLinksUI(player, dependencies); break;
        case 3: await showGeneralTipsUI(player, dependencies); break;
        default:
            playerUtils.debugLog(`[UInfoCommand] Unexpected selection in uinfo panel for ${player.nameTag}: ${response.selection}`, player.nameTag, dependencies);
    }
}
