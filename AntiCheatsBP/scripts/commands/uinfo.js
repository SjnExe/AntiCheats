/**
 * @file AntiCheatsBP/scripts/commands/uinfo.js
 * Defines the !uinfo command, providing a user interface for players to view their
 * AntiCheat statistics, server rules, and other helpful information.
 * @version 1.0.2
 */
// permissionLevels and getString are now accessed via dependencies
import { ActionFormData, MessageFormData } from '@minecraft/server-ui'; // Specific UI imports

/**
 * Shows the player their anti-cheat statistics.
 * @param {import('@minecraft/server').Player} player The player to show the stats to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
// Helper UI functions (scoped within this module)
async function showMyStatsUI(player, dependencies) {
    const { playerDataManager, playerUtils, config } = dependencies; // getString removed
    const pData = playerDataManager.getPlayerData(player.id);
    // Placeholder "uinfo.myStats.header" -> "Your AntiCheat Stats:"
    let statsOutput = "Your AntiCheat Stats:\n";

    if (pData && pData.flags) {
        // Placeholder "uinfo.myStats.totalFlags" -> "Total Flags: {totalFlags}"
        statsOutput += `Total Flags: ${pData.flags.totalFlags || 0}\n`;
        // Placeholder "uinfo.myStats.lastFlagType" -> "Last Flag Type: {lastFlagType}"
        // "common.value.none" -> "None"
        statsOutput += `Last Flag Type: ${pData.lastFlagType || "None"}\n\n`;
        // Placeholder "uinfo.myStats.breakdownHeader" -> "Flag Breakdown:"
        statsOutput += "Flag Breakdown:\n";
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                // Placeholder "uinfo.myStats.flagEntry" -> "- {flagKey}: {count} (Last: {lastDetectionTime})"
                // "common.value.notApplicable" -> "N/A"
                statsOutput += `- ${flagKey}: ${flagData.count} (Last: ${flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : "N/A"})\n`;
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
            // Placeholder "uinfo.myStats.noFlags" -> "You have no active flags."
             statsOutput = "You have no active flags.";
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
            // Placeholder "uinfo.myStats.noSpecificFlags" -> "Total Flags: {totalFlags}. Last Type: {lastFlagType}. (No specific flag details)"
             statsOutput = `Total Flags: ${pData.flags.totalFlags || 0}. Last Type: ${pData.lastFlagType || "None"}. (No specific flag details)`;
        }
    } else {
        // Placeholder "uinfo.myStats.noData" -> "No AntiCheat data found for you."
        statsOutput = "No AntiCheat data found for you.";
    }
    const form = new MessageFormData()
        // Placeholder "uinfo.myStats.title" -> "My AntiCheat Stats"
        .title("My AntiCheat Stats")
        .body(statsOutput.trim())
        // "common.button.close" -> "Close"
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows the server rules to the player.
 * @param {import('@minecraft/server').Player} player The player to show the rules to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils } = dependencies; // getString removed
    const rulesValue = config.serverRules; // This is an array of strings in config.js

    // "command.rules.ui.title" -> "Server Rules" (from en_US.js)
    let rulesText = (Array.isArray(rulesValue) && rulesValue.length > 0)
        ? rulesValue.join("\n")
        // "command.rules.noRulesConfigured" -> "No server rules are currently configured. Please check back later!" (from en_US.js)
        : "No server rules are currently configured. Please check back later!";


    const form = new MessageFormData()
        .title("Server Rules")
        .body(rulesText)
        // "common.button.close" -> "Close"
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows helpful links to the player.
 * @param {import('@minecraft/server').Player} player The player to show the links to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils } = dependencies; // getString removed
    // Placeholder "uinfo.helpLinks.header" -> "Helpful Links:"
    let linksBody = "Helpful Links:\n";
    let hasContent = false;

    if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
        // Placeholder "uinfo.helpLinks.discord" -> "Discord: {discordLink}"
        linksBody += `Discord: ${config.discordLink}\n`;
        hasContent = true;
    }
    if (config.websiteLink && config.websiteLink.trim() !== "" && config.websiteLink !== "https://example.com") {
        // Placeholder "uinfo.helpLinks.website" -> "Website: {websiteLink}"
        linksBody += `Website: ${config.websiteLink}\n`;
        hasContent = true;
    }

    if (config.helpLinks && config.helpLinks.length > 0) {
        if (hasContent) {
            // Placeholder "uinfo.helpLinks.otherLinksHeader" -> "\nOther Links:"
            linksBody += "\nOther Links:\n";
        }
        config.helpLinks.forEach(link => {
            // Placeholder "uinfo.helpLinks.linkEntry" -> "- {title}: {url}"
            linksBody += `- ${link.title}: ${link.url}\n`;
            hasContent = true;
        });
    }

    if (!hasContent) {
        // Placeholder "uinfo.helpLinks.noLinksConfigured" -> "No helpful links are currently configured."
        linksBody = "No helpful links are currently configured.";
    }

    const form = new MessageFormData()
        // "ui.helpfulLinks.title" -> "Helpful Links" (from en_US.js, assuming this is the intended key)
        .title("Helpful Links")
        .body(linksBody.trim())
        // "common.button.close" -> "Close"
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows general tips to the player.
 * @param {import('@minecraft/server').Player} player The player to show the tips to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils } = dependencies; // getString removed
    let tips = "";
    // config.generalHelpMessages contains keys like "message.generalHelp.welcome"
    // These need to be resolved from the en_US.js file.
    // This is tricky because we are removing getString.
    // For this specific case, we might need to hardcode these or assume they are direct strings if not found.
    // Let's assume for now that these keys are NOT being replaced with their actual strings in config.js
    // and we need to provide default/placeholder behavior here.
    // The ideal solution would be that config.generalHelpMessages itself contains the final strings.

    const generalHelpMessagesStrings = { // Manually mapped from en_US.js for this function
        "message.generalHelp.welcome": `Welcome to the server! Use ${config.prefix}help for commands.`, // Example, actual string not in provided en_US
        "message.generalHelp.helpCommandPrompt": `Type ${config.prefix}help [command] for details on a specific command.`, // Example
        "message.generalHelp.reportPrompt": `To report a player, please use our Discord or website.`, // Example
        "message.generalHelp.rulesPrompt": `Type ${config.prefix}rules to see the server rules.` // Example
    };

    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tips = config.generalHelpMessages
            .map(key => generalHelpMessagesStrings[key] || `${key} (Localization missing)`) // Replace key with string or note missing
            .join("\n");
    } else {
        // Placeholder "uinfo.generalTips.noTipsConfigured" -> "No general tips available at the moment."
        tips = "No general tips available at the moment.";
    }

    const form = new MessageFormData()
        // Placeholder "uinfo.generalTips.title" -> "General Tips"
        .title("General Tips")
        .body(tips)
        // "common.button.close" -> "Close"
        .button1("Close");
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "uinfo",
    syntax: "!uinfo",
    description: "Shows your anti-cheat stats, server rules, and help links in a UI.", // Static
    permissionLevel: 0, // Static fallback (Normal)
    enabled: true,
};

/**
 * Executes the uinfo command, showing a UI panel with various info for the player.
 * @param {import('@minecraft/server').Player} player The player issuing the command.
 * @param {string[]} _args The command arguments (unused in this command).
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, config, permissionLevels } = dependencies; // getString removed

    // Static definitions are used

    const mainPanel = new ActionFormData()
        // Placeholder "uinfo.mainPanel.title" -> "Player Information Panel"
        .title("Player Information Panel")
        // Placeholder "uinfo.mainPanel.body" -> "Welcome, {playerName}! Select an option:"
        .body(`Welcome, ${player.nameTag}! Select an option:`)
        // Placeholder "uinfo.mainPanel.button.myStats" -> "My AntiCheat Stats"
        .button("My AntiCheat Stats", "textures/ui/WarningGlyph")
        // Placeholder "uinfo.mainPanel.button.serverRules" -> "Server Rules"
        .button("Server Rules", "textures/ui/book_glyph_color")
        // Placeholder "uinfo.mainPanel.button.helpLinks" -> "Helpful Links"
        .button("Helpful Links", "textures/ui/icon_link")
        // Placeholder "uinfo.mainPanel.button.generalTips" -> "General Tips"
        .button("General Tips", "textures/ui/lightbulb_idea_color");

    const response = await mainPanel.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error showing main uinfo panel for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies);
        console.error(`[UInfoCommand] Error showing main uinfo panel for ${player.nameTag}: ${e.stack || e}`);
        return { canceled: true, error: true }; // Ensure structure for cancellation check
    });

    if (response.canceled) {
        if (!response.error) { // Only log standard cancellation if it wasn't an error causing cancellation
            playerUtils.debugLog(`[UInfoCommand] User ${player.nameTag} cancelled uinfo panel. Reason: ${response.cancelationReason}`, player.nameTag, dependencies);
        }
        return;
    }

    logManager.addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'command_uinfo', details: `Player used !uinfo, selected option index: ${response.selection}` }, dependencies);

    // Pass all dependencies down to the helper UI functions
    switch (response.selection) {
        case 0: await showMyStatsUI(player, dependencies); break;
        case 1: await showServerRulesUI(player, dependencies); break;
        case 2: await showHelpLinksUI(player, dependencies); break;
        case 3: await showGeneralTipsUI(player, dependencies); break;
        default:
            playerUtils.debugLog(`[UInfoCommand] Unexpected selection in uinfo panel for ${player.nameTag}: ${response.selection}`, player.nameTag, dependencies);
    }
}
