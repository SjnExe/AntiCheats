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
    const { playerDataManager, playerUtils, getString, config } = dependencies; // Added getString and config
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutput = getString("uinfo.myStats.header") + "\n";

    if (pData && pData.flags) {
        statsOutput += getString("uinfo.myStats.totalFlags", { totalFlags: pData.flags.totalFlags || 0 }) + "\n";
        statsOutput += getString("uinfo.myStats.lastFlagType", { lastFlagType: pData.lastFlagType || getString("command.myflags.value.none") }) + "\n\n"; // Use getString for "None"
        statsOutput += getString("uinfo.myStats.breakdownHeader") + "\n";
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                const flagData = pData.flags[flagKey];
                statsOutput += getString("uinfo.myStats.flagEntry", { flagKey: flagKey, count: flagData.count, lastDetectionTime: flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString("command.myflags.value.notApplicable") }) + "\n";
                specificFlagsFound = true;
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
             statsOutput = getString("uinfo.myStats.noFlags");
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
             statsOutput = getString("uinfo.myStats.noSpecificFlags", { totalFlags: pData.flags.totalFlags, lastFlagType: pData.lastFlagType || getString("command.myflags.value.none") });
        }
    } else {
        statsOutput = getString("uinfo.myStats.noData");
    }
    const form = new MessageFormData()
        .title(getString("uinfo.myStats.title"))
        .body(statsOutput.trim())
        .button1(getString("common.button.close"));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows the server rules to the player.
 * @param {import('@minecraft/server').Player} player The player to show the rules to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString
    const rulesKey = config.serverRules;
    // If serverRules is a localization key:
    // const rulesText = getString(rulesKey) || getString("uinfo.serverRules.noRulesConfigured");
    // If serverRules is a direct string:
    const rulesText = (rulesKey && rulesKey.trim() !== "" && !rulesKey.startsWith("config.")) ? rulesKey : getString("uinfo.serverRules.noRulesConfigured");


    const form = new MessageFormData()
        .title(getString("uinfo.serverRules.title"))
        .body(rulesText)
        .button1(getString("common.button.close"));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows helpful links to the player.
 * @param {import('@minecraft/server').Player} player The player to show the links to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString
    let linksBody = getString("uinfo.helpLinks.header") + "\n";
    let hasContent = false;

    if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
        linksBody += getString("uinfo.helpLinks.discord", { discordLink: config.discordLink }) + "\n";
        hasContent = true;
    }
    if (config.websiteLink && config.websiteLink.trim() !== "" && config.websiteLink !== "https://example.com") {
        linksBody += getString("uinfo.helpLinks.website", { websiteLink: config.websiteLink }) + "\n";
        hasContent = true;
    }

    if (config.helpLinks && config.helpLinks.length > 0) {
        if (hasContent) {
            linksBody += getString("uinfo.helpLinks.otherLinksHeader") + "\n";
        }
        config.helpLinks.forEach(link => {
            linksBody += getString("uinfo.helpLinks.linkEntry", { title: link.title, url: link.url }) + "\n";
            hasContent = true;
        });
    }

    if (!hasContent) {
        linksBody = getString("uinfo.helpLinks.noLinksConfigured");
    }

    const form = new MessageFormData()
        .title(getString("uinfo.helpLinks.title"))
        .body(linksBody.trim())
        .button1(getString("common.button.close"));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows general tips to the player.
 * @param {import('@minecraft/server').Player} player The player to show the tips to.
 * @param {import('../types.js').CommandDependencies} dependencies Command dependencies.
 */
async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString, removed configModule
    let tips = "";
    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tips = config.generalHelpMessages.map(key => getString(key, {prefix: config.prefix})).join("\n"); // Use config.prefix
    } else {
        tips = getString("uinfo.generalTips.noTipsConfigured");
    }

    const form = new MessageFormData()
        .title(getString("uinfo.generalTips.title"))
        .body(tips)
        .button1(getString("common.button.close"));
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
    const { logManager, playerUtils, config, getString, permissionLevels } = dependencies; // Added getString, permissionLevels

    // definition.description = getString("uinfo.mainPanel.description"); // Example if dynamic
    // definition.permissionLevel = permissionLevels.normal;

    const mainPanel = new ActionFormData()
        .title(getString("uinfo.mainPanel.title"))
        .body(getString("uinfo.mainPanel.body", { playerName: player.nameTag }))
        .button(getString("uinfo.mainPanel.button.myStats"), "textures/ui/WarningGlyph")
        .button(getString("uinfo.mainPanel.button.serverRules"), "textures/ui/book_glyph_color")
        .button(getString("uinfo.mainPanel.button.helpLinks"), "textures/ui/icon_link")
        .button(getString("uinfo.mainPanel.button.generalTips"), "textures/ui/lightbulb_idea_color");

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
