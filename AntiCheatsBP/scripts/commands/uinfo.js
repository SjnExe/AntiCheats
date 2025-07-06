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
    const { playerDataManager, playerUtils, config, getString, logManager } = dependencies;
    const pData = playerDataManager.getPlayerData(player.id);
    let statsOutputLines = [];
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (pData && pData.flags) {
        statsOutputLines.push(getString('command.inspect.totalFlags', { totalFlags: (pData.flags.totalFlags || 0).toString() }));
        statsOutputLines.push(getString('command.inspect.lastFlagType', { lastFlagType: pData.lastFlagType || getString('common.value.notAvailable') }));
        statsOutputLines.push(''); // For spacing
        statsOutputLines.push(getString('command.inspect.flagsByTypeHeader'));
        let specificFlagsFound = false;
        for (const flagKey in pData.flags) {
            if (Object.prototype.hasOwnProperty.call(pData.flags, flagKey)) {
                if (flagKey !== "totalFlags" && typeof pData.flags[flagKey] === 'object' && pData.flags[flagKey] !== null && typeof pData.flags[flagKey].count === 'number' && pData.flags[flagKey].count > 0) {
                    const flagData = pData.flags[flagKey];
                    const timestamp = flagData.lastDetectionTime ? new Date(flagData.lastDetectionTime).toLocaleTimeString() : getString('common.value.notAvailable');
                    statsOutputLines.push(getString('command.inspect.flagEntry', { flagKey: flagKey, count: flagData.count.toString(), timestamp: timestamp }));
                    specificFlagsFound = true;
                }
            }
        }
        if (!specificFlagsFound && (pData.flags.totalFlags === 0 || !pData.flags.totalFlags)) {
            statsOutputLines = [getString('uinfo.myStats.noFlags')];
        } else if (!specificFlagsFound && pData.flags.totalFlags > 0) {
            statsOutputLines.push(getString('uinfo.myStats.noSpecificFlags'));
            playerUtils?.debugLog(`[UInfoCommand.showMyStatsUI] Player ${playerName} has totalFlags=${pData.flags.totalFlags} but no specific flag details. Flags: ${JSON.stringify(pData.flags)}`, playerName, dependencies);
        }
    } else {
        statsOutputLines.push(getString('uinfo.myStats.noData'));
    }
    const form = new MessageFormData()
        .title(getString('ui.myStats.title'))
        .body(statsOutputLines.join('\n').trim())
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error in showMyStatsUI for ${playerName}: ${e.message}`, playerName, dependencies);
        console.error(`[UInfoCommand] Error in showMyStatsUI for ${playerName}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUinfoSubpanel',
            context: 'UInfoCommand.showMyStatsUI',
            adminName: playerName, // Using playerName as the one experiencing UI error
            details: `Error showing MyStatsUI: ${e.stack || e.message}`
        }, dependencies);
    });
}

/**
 * Shows the server rules to the player.
 */
async function showServerRulesUI(player, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    const rulesValue = config.serverRules;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    let rulesText = (typeof rulesValue === 'string' && rulesValue.trim() !== '') ? rulesValue :
                    (Array.isArray(rulesValue) && rulesValue.length > 0) ? rulesValue.join("\n") :
                    getString('ui.serverRules.noRulesDefined');

    const form = new MessageFormData()
        .title(getString('ui.serverRules.title'))
        .body(rulesText)
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error in showServerRulesUI for ${playerName}: ${e.message}`, playerName, dependencies);
        console.error(`[UInfoCommand] Error in showServerRulesUI for ${playerName}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUinfoSubpanel',
            context: 'UInfoCommand.showServerRulesUI',
            adminName: playerName,
            details: `Error showing ServerRulesUI: ${e.stack || e.message}`
        }, dependencies);
    });
}

/**
 * Shows helpful links to the player.
 */
async function showHelpLinksUI(player, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    let linksBodyLines = [getString('ui.helpfulLinks.body')];
    let hasContent = false;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

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
            linksBodyLines.push('');
            linksBodyLines.push(getString('ui.helpfulLinks.otherLinksHeader'));
        }
        config.helpLinks.forEach(link => {
            linksBodyLines.push(getString('ui.helpfulLinks.linkEntryFormat', { title: link.title, url: link.url }));
            hasContent = true;
        });
    }

    if (!hasContent) {
        linksBodyLines = [getString('ui.helpfulLinks.noLinks')];
    }

    const form = new MessageFormData()
        .title(getString('ui.helpfulLinks.title'))
        .body(linksBodyLines.join('\n').trim())
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error in showHelpLinksUI for ${playerName}: ${e.message}`, playerName, dependencies);
        console.error(`[UInfoCommand] Error in showHelpLinksUI for ${playerName}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUinfoSubpanel',
            context: 'UInfoCommand.showHelpLinksUI',
            adminName: playerName,
            details: `Error showing HelpLinksUI: ${e.stack || e.message}`
        }, dependencies);
    });
}

/**
 * Shows general tips to the player.
 */
async function showGeneralTipsUI(player, dependencies) {
    const { config, playerUtils, getString, logManager } = dependencies;
    let tips = "";
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    if (config.generalHelpMessages && config.generalHelpMessages.length > 0) {
        tips = config.generalHelpMessages
            .filter(tip => typeof tip === 'string' && tip.trim() !== '')
            .map(tip => getString(tip) || tip)
            .join("\n");
    }

    if (!tips) {
        tips = getString('ui.generalTips.noTips');
    }

    const form = new MessageFormData()
        .title(getString('ui.generalTips.title'))
        .body(tips)
        .button1(getString('common.button.close'));
    await form.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error in showGeneralTipsUI for ${playerName}: ${e.message}`, playerName, dependencies);
        console.error(`[UInfoCommand] Error in showGeneralTipsUI for ${playerName}: ${e.stack || e}`);
        logManager.addLog({
            actionType: 'errorUinfoSubpanel',
            context: 'UInfoCommand.showGeneralTipsUI',
            adminName: playerName,
            details: `Error showing GeneralTipsUI: ${e.stack || e.message}`
        }, dependencies);
    });
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
 * @param {import('@minecraft/server').Player} player The player executing the command.
 * @param {string[]} _args Command arguments (not used).
 * @param {import('../types.js').CommandDependencies} dependencies The dependencies object.
 */
export async function execute(player, _args, dependencies) {
    const { logManager, playerUtils, config, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    const mainPanel = new ActionFormData()
        .title(getString('ui.uinfo.mainPanel.title'))
        .body(getString('ui.uinfo.mainPanel.body', { playerName: player.nameTag }))
        .button(getString('ui.uinfo.button.myStats'), "textures/ui/WarningGlyph")
        .button(getString('ui.uinfo.button.serverRules'), "textures/ui/book_glyph_color")
        .button(getString('ui.uinfo.button.helpfulLinks'), "textures/ui/icon_link")
        .button(getString('ui.uinfo.button.generalTips'), "textures/ui/lightbulb_idea_color");

    const response = await mainPanel.show(player).catch(e => {
        playerUtils.debugLog(`[UInfoCommand] Error showing main uinfo panel for ${playerName}: ${e.message}`, playerName, dependencies);
        console.error(`[UInfoCommand] Error showing main uinfo panel for ${playerName}: ${e.stack || e}`);
        dependencies.logManager.addLog({
            actionType: 'errorUinfoPanel',
            context: 'UInfoCommand.execute',
            adminName: playerName,
            details: `Error showing main uinfo panel: ${e.stack || e.message}`
        }, dependencies);
        return { canceled: true, error: true };
    });

    if (response.canceled) {
        if (!response.error) {
            playerUtils.debugLog(`[UInfoCommand] User ${playerName} cancelled uinfo panel. Reason: ${response.cancelationReason}`, playerName, dependencies);
        }
        return;
    }

    logManager.addLog({ adminName: playerName, actionType: 'commandUinfo', targetName: playerName, details: `Used !uinfo, selected option index: ${response.selection}` }, dependencies);

    switch (response.selection) {
        case 0: await showMyStatsUI(player, dependencies); break;
        case 1: await showServerRulesUI(player, dependencies); break;
        case 2: await showHelpLinksUI(player, dependencies); break;
        case 3: await showGeneralTipsUI(player, dependencies); break;
        default:
            playerUtils.debugLog(`[UInfoCommand] Unexpected selection in uinfo panel for ${player.nameTag}: ${response.selection}`, player.nameTag, dependencies);
    }
}
