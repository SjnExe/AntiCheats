/**
 * Defines the !uinfo command, providing a user interface for players to view their
 * AntiCheat statistics, server rules, and other helpful information.
 */
import { ActionFormData, MessageFormData } from '@minecraft/server-ui';
import { permissionLevels } from '../core/rankManager.js';

/**
 * Shows the player their anti-cheat statistics.
 */
async function showMyStatsUI(player, dependencies) {
    const { playerDataManager, playerUtils, config, getString } = dependencies; // Added getString
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutputLines = [];

    if (pData && pData.flags) {
        statsOutputLines.push(getString('command.inspect.totalFlags', { totalFlags: (pData.flags.totalFlags || 0).toString() }));
        statsOutputLines.push(getString('command.inspect.lastFlagType', { lastFlagType: pData.lastFlagType || getString('common.value.notAvailable') }));
        statsOutputLines.push(''); // For spacing
        statsOutputLines.push(getString('command.inspect.flagsByTypeHeader'));
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (Object.prototype.hasOwnProperty.call(pData.flags, flagKey)) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString('common.value.notAvailable');
                    statsOutputLines.push(getString('command.inspect.flagEntry', { flagKey: flagKey, count: flagData.count.toString(), timestamp: timestamp }));
                    specificFlagsFound = true;
                }
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
            statsOutputLines = [getString('uinfo.myStats.noFlags')]; // Using a more specific key from textDatabase
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
            statsOutputLines.push(getString('uinfo.myStats.noSpecificFlags'));
        }
    } else {
        statsOutputLines.push(getString('uinfo.myStats.noData'));
    }
    const form = new MessageFormData()
        .title(getString('ui.myStats.title')) // Already uses getString
        .body(statsOutputLines.join('\n').trim())
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showMyStatsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows the server rules to the player.
 */
async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString
    const rulesValue = config.serverRules;

    let rulesText = (typeof rulesValue === 'string' && rulesValue.trim() !== '') ? rulesValue :
                    (Array.isArray(rulesValue) && rulesValue.length > 0) ? rulesValue.join("\n") :
                    getString('ui.serverRules.noRulesDefined');


    const form = new MessageFormData()
        .title(getString('ui.serverRules.title')) // Already uses getString
        .body(rulesText)
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showServerRulesUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * Shows helpful links to the player.
 */
async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString
    let linksBodyLines = [getString('ui.helpfulLinks.body')]; // Changed to array for easier line management
    let hasContent = false;

    if (config.discordLink && config.discordLink.trim() !== "" && config.discordLink !== "https://discord.gg/example") {
        linksBodyLines.push(getString('ui.helpfulLinks.linkMessageFormat', { title: 'Discord', url: config.discordLink }));
        hasContent = true;
    }
    if (config.websiteLink && config.websiteLink.trim() !== "" && config.websiteLink !== "https://example.com") {
        linksBodyLines.push(getString('ui.helpfulLinks.linkMessageFormat', { title: 'Website', url: config.websiteLink }));
        hasContent = true;
    }

    if (config.helpLinks && config.helpLinks.length > 0) {
        if (hasContent) {
            linksBodyLines.push(''); // Add a blank line for separation
            linksBodyLines.push(getString('ui.helpfulLinks.otherLinksHeader', {defaultValue: "Other Links:"})); // Added new key
        }
        config.helpLinks.forEach(link => {
            linksBodyLines.push(getString('ui.helpfulLinks.linkEntryFormat', { title: link.title, url: link.url })); // Added new key
            hasContent = true;
        });
    }

    if (!hasContent) {
        linksBodyLines = [getString('ui.helpfulLinks.noLinks')];
    }

    const form = new MessageFormData()
        .title(getString('ui.helpfulLinks.title')) // Already uses getString
        .body(linksBodyLines.join('\n').trim())
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showHelpLinksUI for ${player.nameTag}: ${e.stack || e}`); });
}
/**
 * Shows general tips to the player.
 */
async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils, getString } = dependencies; // Added getString
    let tips = "";

    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tips = config.generalHelpMessages
            .filter(tip => typeof tip === 'string' && tip.trim() !== '')
            .map(tip => getString(tip) || tip) // Attempt to use tip as a key, fallback to literal
            .join("\n");
    }

    if (!tips) {
        tips = getString('ui.generalTips.noTips', {defaultValue: "No general tips available at the moment."}); // Added new key
    }

    const form = new MessageFormData()
        .title(getString('ui.generalTips.title', {defaultValue: "General Tips"})) // Added new key
        .body(tips)
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => { playerUtils.debugLog(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.message}`, player.nameTag, dependencies); console.error(`[UInfoCommand] Error in showGeneralTipsUI for ${player.nameTag}: ${e.stack || e}`); });
}

/**
 * @type {import('../types.js').CommandDefinition}
 */
export const definition = {
    name: "uinfo",
    syntax: "!uinfo",
    description: "Shows your anti-cheat stats, server rules, and help links in a UI.",
    permissionLevel: permissionLevels.member,
    enabled: true,
};
/**
 * Executes the uinfo command, showing a UI panel with various info for the player.
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, config } = dependencies;

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

    logManager.addLog({ timestamp: Date.now(), playerName: player.nameTag, actionType: 'commandUinfo', details: `Player used !uinfo, selected option index: ${response.selection}` }, dependencies);

    switch (response.selection) {
        case 0: await showMyStatsUI(player, dependencies); break;
        case 1: await showServerRulesUI(player, dependencies); break;
        case 2: await showHelpLinksUI(player, dependencies); break;
        case 3: await showGeneralTipsUI(player, dependencies); break;
        default:
            playerUtils.debugLog(`[UInfoCommand] Unexpected selection in uinfo panel for ${player.nameTag}: ${response.selection}`, player.nameTag, dependencies);
    }
}
