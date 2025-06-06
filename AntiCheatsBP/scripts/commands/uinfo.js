// AntiCheatsBP/scripts/commands/uinfo.js
import { permissionLevels } from '../core/rankManager.js';
import { ActionFormData, MessageFormData } from '@minecraft/server-ui'; // Specific UI imports

// Helper UI functions (scoped within this module)
async function showMyStatsUI(player, dependencies) {
    const { playerDataManager, config, playerUtils } = dependencies; // config is not used here, but kept for consistency if needed later
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutput = `§e--- Your Anti-Cheat Stats ---\n`; // Added newline
    if (pData && pData.flags) {
        statsOutput += `§fTotal Flags: §c${pData.flags.totalFlags || 0}\n`; // Added newline
        statsOutput += `§fLast Flag Type: §7${pData.lastFlagType || "None"}\n\n`; // Added newline
        statsOutput += `§eBreakdown by Type:\n`; // Added newline
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                statsOutput += `  §f- ${flagKey}: §c${flagData.count} §7(Last: ${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : 'N/A'})\n`; // Added newline
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
             statsOutput = "§aYou have no active flags!"; // Simpler message
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
             statsOutput = `§7Your current flags: §eTotal=${pData.flags.totalFlags}§7. Last type: §e${pData.lastFlagType || "None"}§r\n§7(No specific flag type details available with counts > 0).`;
        }
    } else {
        statsOutput = "§aNo flag data found for you, or you have no flags."; // Simpler message
    }
    const form = new MessageFormData().title("My Anti-Cheat Stats").body(statsOutput.trim()).button1("Close"); // trim() body
    await form.show(player).catch(e => { if(playerUtils.debugLog) playerUtils.debugLog(`Error in showMyStatsUI for ${player.nameTag}: ${e}`, player.nameTag);});
}

async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    const rules = config.serverRules && config.serverRules.length > 0 ? config.serverRules.join("\n") : "No server rules configured.";
    const form = new MessageFormData().title("Server Rules").body(rules).button1("Close");
    await form.show(player).catch(e => { if(playerUtils.debugLog) playerUtils.debugLog(`Error in showServerRulesUI for ${player.nameTag}: ${e}`, player.nameTag);});
}

async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    let linksBody = "§e--- Helpful Links ---\n"; // Added newline
    if (config.helpLinks && config.helpLinks.length > 0) {
        config.helpLinks.forEach(link => linksBody += `§f${link.title}: §7${link.url}\n`); // Added newline
    } else {
        linksBody += "No helpful links configured.";
    }
    const form = new MessageFormData().title("Helpful Links").body(linksBody.trim()).button1("Close"); // trim() body
    await form.show(player).catch(e => { if(playerUtils.debugLog) playerUtils.debugLog(`Error in showHelpLinksUI for ${player.nameTag}: ${e}`, player.nameTag);});
}

async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils } = dependencies;
    const tips = config.generalHelpMessages && config.generalHelpMessages.length > 0 ? config.generalHelpMessages.join("\n") : "No general tips configured.";
    const form = new MessageFormData().title("General Tips").body(tips).button1("Close");
    await form.show(player).catch(e => { if(playerUtils.debugLog) playerUtils.debugLog(`Error in showGeneralTipsUI for ${player.nameTag}: ${e}`, player.nameTag);});
}

export const definition = {
    name: "uinfo",
    syntax: "!uinfo",
    description: "Shows your anti-cheat stats, server rules, and help links in a UI.",
    permissionLevel: permissionLevels.NORMAL
};

export async function execute(player, args, dependencies) {
    const { addLog, playerUtils } = dependencies; // Added playerUtils here for debug logging
    const mainPanel = new ActionFormData()
        .title("Your Info & Server Help")
        .body(`Welcome, ${player.nameTag}! Select an option:`)
        .button("My Anti-Cheat Stats", "textures/ui/WarningGlyph")
        .button("Server Rules", "textures/ui/book_glyph_color")
        .button("Helpful Links", "textures/ui/icon_link")
        .button("General Tips", "textures/ui/lightbulb_idea_color");

    const response = await mainPanel.show(player).catch(e => {
        if(playerUtils.debugLog) playerUtils.debugLog(`Error showing main uinfo panel for ${player.nameTag}: ${e}`, player.nameTag);
        return { canceled: true, error: true }; // Ensure structure for cancellation check
    });

    if (response.canceled) {
        if(playerUtils.debugLog && !response.error) playerUtils.debugLog(`User ${player.nameTag} cancelled uinfo panel. Reason: ${response.cancelationReason}`, player.nameTag);
        return;
    }

    if (addLog) addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'command_uinfo', details: `Player used !uinfo, selected option index: ${response.selection}` });

    // Pass all dependencies down to the helper UI functions
    switch (response.selection) {
        case 0: await showMyStatsUI(player, dependencies); break;
        case 1: await showServerRulesUI(player, dependencies); break;
        case 2: await showHelpLinksUI(player, dependencies); break;
        case 3: await showGeneralTipsUI(player, dependencies); break;
        default:
             if(playerUtils.debugLog) playerUtils.debugLog(`Unexpected selection in uinfo panel for ${player.nameTag}: ${response.selection}`, player.nameTag);
    }
}
