/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * @description Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// updateConfigValue remains a direct import.
import { updateConfigValue } from '../config.js';
import { formatSessionDuration } from '../utils/playerUtils.js';
import { permissionLevels as importedPermissionLevels, editableConfigValues as globalEditableConfigValues } from '../config.js';

// Helper function to format dimension names
function formatDimensionName(dimensionId) {
    if (typeof dimensionId !== 'string') return "Unknown";
    let name = dimensionId.replace("minecraft:", "");
    name = name.replace(/_/g, " ");
    name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return name;
}

// Forward declarations
let showAdminPanelMain;
let showEditConfigForm;
let showOnlinePlayersList;
let showPlayerActionsForm;
let showServerManagementForm;
let showModLogTypeSelectionForm;
let showDetailedFlagsForm;
let showSystemInfo;
let showActionLogsForm;
let showResetFlagsForm;
let showWatchedPlayersList;

/**
 * A reusable helper function to show a confirmation modal.
 */
async function _showConfirmationModal(adminPlayer, titleKey, bodyKey, confirmToggleLabelKey, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    // const translationsDict = dependencies.translations_dict || {}; // Removed

    const modalForm = new ModalFormData();
    modalForm.title(dependencies.translations_dict[titleKey] || titleKey);
    let bodyText = dependencies.translations_dict[bodyKey] || bodyKey;
    if (bodyParams && typeof bodyParams === 'object') {
        for (const param in bodyParams) {
            bodyText = bodyText.replace(`{${param}}`, bodyParams[param]);
        }
    }
    modalForm.body(bodyText);
    modalForm.toggle(dependencies.translations_dict[confirmToggleLabelKey] || confirmToggleLabelKey, false);

    try {
        const response = await modalForm.show(adminPlayer);

        if (response.canceled || !response.formValues[0]) {
            adminPlayer.sendMessage(dependencies.translations_dict["common.actionCancelled"] || "Action cancelled.");
            depPlayerUtils.debugLog(dependencies, `[UiManager] Confirmation modal (title: ${titleKey}) cancelled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag);
            return;
        }

        await onConfirmCallback();
        depPlayerUtils.debugLog(dependencies, `[UiManager] Confirmation modal (title: ${titleKey}) confirmed by ${adminPlayer.nameTag}. Action executed.`, adminPlayer.nameTag);

    } catch (error) {
        console.error(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager._showConfirmationModal', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack, titleKey: titleKey }, dependencies);
        }
        adminPlayer.sendMessage(dependencies.translations_dict["common.error.genericForm"] || "An error occurred while displaying this form.");
    }
}


async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `[UiManager] Inspect Player form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(translationsDict["ui.inspectPlayerForm.title"] || "Inspect Player (Enter Name)");
    modalForm.textField(translationsDict["ui.inspectPlayerForm.textField.label"] || "Player Name:", translationsDict["ui.inspectPlayerForm.textField.placeholder"] || "Enter player's exact name");

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            depPlayerUtils.debugLog(dependencies, `[UiManager] Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage(translationsDict["common.error.nameEmpty"] || "§cName cannot be empty.");
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "inspect"));
        }
    } catch (error) {
        console.error(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showInspectPlayerForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
    }
}

async function showMyStats(player, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `[UiManager] showMyStats for ${player.nameTag}`, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);
    let sessionPlaytimeFormatted = translationsDict["common.value.notApplicable"] || "N/A";

    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        const durationMs = Date.now() - pData.joinTime;
        sessionPlaytimeFormatted = formatSessionDuration(durationMs);
    }

    const statsForm = new MessageFormData();
    statsForm.title(translationsDict["ui.myStats.title"] || "My Stats");

    const location = player.location;
    const locX = Math.floor(location.x);
    const locY = Math.floor(location.y);
    const locZ = Math.floor(location.z);
    const dimensionId = player.dimension.id;
    const friendlyDimensionName = formatDimensionName(dimensionId);

    let bodyLines = [];
    bodyLines.push((translationsDict["ui.myStats.body"] || "Session Playtime: {sessionPlaytime}").replace("{sessionPlaytime}", sessionPlaytimeFormatted));
    bodyLines.push("");
    bodyLines.push((translationsDict["ui.myStats.labelLocation"] || "Location: X:{x}, Y:{y}, Z:{z}").replace("{x}", locX.toString()).replace("{y}", locY.toString()).replace("{z}", locZ.toString()));
    bodyLines.push((translationsDict["ui.myStats.labelDimension"] || "Dimension: {dimensionName}").replace("{dimensionName}", friendlyDimensionName));

    statsForm.body(bodyLines.join('\n'));
    statsForm.button1(translationsDict["common.button.back"] || "Back");

    try {
        await statsForm.show(player);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showMyStats for ${player.nameTag}: ${error.message}`, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showMyStats', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    }
}

async function showServerRules(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `[UiManager] showServerRules for ${player.nameTag}`, player.nameTag);

    const rules = config.serverRules;
    let rulesBody = "";

    if (Array.isArray(rules) && rules.length > 0) {
        rulesBody = rules.join("\n");
    } else {
        rulesBody = translationsDict["ui.serverRules.noRulesDefined"] || "No server rules are currently defined.";
    }

    const rulesForm = new MessageFormData();
    rulesForm.title(translationsDict["ui.serverRules.title"] || "Server Rules");
    rulesForm.body(rulesBody);
    rulesForm.button1(translationsDict["common.button.back"] || "Back");

    try {
        await rulesForm.show(player);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showServerRules for ${player.nameTag}: ${error.message}`, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showServerRules', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

async function showHelpAndLinks(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `[UiManager] showHelpAndLinks for ${player.nameTag}`, player.nameTag);

    const form = new ActionFormData();
    form.title(translationsDict["ui.helpfulLinks.title"] || "Helpful Links");
    form.body(translationsDict["ui.helpfulLinks.body"] || "Select a link to view its URL:");

    const helpLinksArray = config.helpLinks;

    if (!Array.isArray(helpLinksArray) || helpLinksArray.length === 0) {
        const msgForm = new MessageFormData();
        msgForm.title(translationsDict["ui.helpfulLinks.title"] || "Helpful Links");
        msgForm.body(translationsDict["ui.helpfulLinks.noLinks"] || "No helpful links are currently configured.");
        msgForm.button1(translationsDict["common.button.back"] || "Back");

        try {
            await msgForm.show(player);
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        } catch (error) {
            console.error(`[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
            depPlayerUtils.debugLog(dependencies, `[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.message}`, player.nameTag);
            if (logManager?.addLog) {
                logManager.addLog('error', { context: 'uiManager.showHelpAndLinks.noLinksForm', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
            }
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        }
        return;
    }

    helpLinksArray.forEach(link => {
        if (link && typeof link.title === 'string') {
            form.button(link.title);
        }
    });
    form.button(translationsDict["common.button.back"] || "Back");

    try {
        const response = await form.show(player);

        if (response.canceled || response.selection === helpLinksArray.length) {
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
            return;
        }

        const selectedLink = helpLinksArray[response.selection];
        if (selectedLink && typeof selectedLink.url === 'string' && typeof selectedLink.title === 'string') {
            player.sendMessage((translationsDict["ui.helpfulLinks.linkMessageFormat"] || "§e{title}: §b{url}").replace("{title}", selectedLink.title).replace("{url}", selectedLink.url));
            await showHelpAndLinks(player, dependencies);
        } else {
            depPlayerUtils.debugLog(dependencies, `[UiManager] Error: Invalid link item at index ${response.selection} in showHelpAndLinks.`, player.nameTag);
            player.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        }

    } catch (error) {
        console.error(`[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.message}`, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showHelpAndLinks', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `[UiManager] showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    const form = new ActionFormData();
    form.title((translationsDict["ui.playerActions.title"] || "Actions for {targetPlayerName}").replace("{targetPlayerName}", targetPlayer.nameTag));

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body((translationsDict["ui.playerActions.body"] || "Flags: {flagCount} | Watched: {isWatched}").replace("{flagCount}", flagCount.toString()).replace("{isWatched}", isWatched.toString()));

    const frozenTag = "frozen";
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = translationsDict[isTargetFrozen ? "ui.playerActions.button.unfreeze" : "ui.playerActions.button.freeze"] || (isTargetFrozen ? "Unfreeze Player" : "Freeze Player");
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = playerDataManager.getMuteInfo?.(targetPlayer, dependencies);
    const isTargetMuted = muteInfo !== null;
    let muteButtonText;
    if (isTargetMuted) {
        muteButtonText = muteInfo.unmuteTime === Infinity ?
            (translationsDict["ui.playerActions.button.unmutePermanent"] || "Unmute (Permanent)") :
            (translationsDict["ui.playerActions.button.unmuteTimed"] || "Unmute (Expires: {time})").replace("{time}", new Date(muteInfo.unmuteTime).toLocaleTimeString());
    } else {
        muteButtonText = translationsDict["ui.playerActions.button.mute"] || "Mute Player";
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button(translationsDict["ui.playerActions.button.viewFlags"] || "View Flags", "textures/ui/magnifying_glass");
    form.button(translationsDict["ui.playerActions.button.viewInventory"] || "View Inventory", "textures/ui/chest_icon.png");
    form.button(translationsDict["ui.playerActions.button.teleportTo"] || "Teleport To Player", "textures/ui/portal");
    form.button(translationsDict["ui.playerActions.button.teleportHere"] || "Teleport Player Here", "textures/ui/arrow_down_thin");
    form.button(translationsDict["ui.playerActions.button.kick"] || "Kick Player", "textures/ui/icon_hammer");
    form.button(freezeButtonText, freezeButtonIcon);
    form.button(muteButtonText, muteButtonIcon);
    form.button(translationsDict["ui.playerActions.button.ban"] || "Ban Player", "textures/ui/icon_resource_pack");
    form.button(translationsDict["ui.playerActions.button.resetFlags"] || "Reset Player Flags", "textures/ui/refresh");
    form.button(translationsDict["ui.playerActions.button.clearInventory"] || "Clear Player Inventory", "textures/ui/icon_trash");
    form.button(translationsDict["ui.playerActions.button.backToList"] || "Back to Player List", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const showModalAndExecute = async (commandName, titleKey, fields, argsTransform = (vals) => vals, titleParams = {}) => {
            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", commandName));
                return false;
            }
            const modal = new ModalFormData().title((translationsDict[titleKey] || titleKey).replace(/{(\w+)}/g, (match, p1) => titleParams[p1] || match));
            fields.forEach(field => {
                if (field.type === 'textField') modal.textField(translationsDict[field.labelKey] || field.labelKey, translationsDict[field.placeholderKey] || field.placeholderKey);
                if (field.type === 'toggle') modal.toggle(translationsDict[field.labelKey] || field.labelKey, field.defaultValue);
            });
            try {
                const modalResponse = await modal.show(adminPlayer);
                if (modalResponse.canceled) {
                    let cancelledKey = `ui.playerActions.${commandName}.cancelled`;
                    if (commandName === 'kick') cancelledKey = "ui.playerActions.kick_cancelled";
                    else if (commandName === 'ban') cancelledKey = "ui.playerActions.ban_cancelled";
                    else if (commandName === 'mute') cancelledKey = "ui.playerActions.mute_cancelled";
                    adminPlayer.sendMessage(translationsDict[cancelledKey] || "Action cancelled.");
                    return true;
                }
                await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
                return true;
            } catch (modalError) {
                console.error(`[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.stack || modalError}`);
                depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.message}`, adminPlayer.nameTag);
                if (logManager?.addLog) {
                     logManager.addLog('error', { context: `uiManager.showModalAndExecute.${commandName}`, player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: modalError.message, stack: modalError.stack }, dependencies);
                }
                adminPlayer.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
                return false;
            }
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        switch (response.selection) {
            case 0:
                await showDetailedFlagsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                shouldReturnToPlayerActions = false;
                break;
            case 1:
                const invseeExec = dependencies.commandExecutionMap?.get('invsee');
                if (invseeExec) await invseeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "invsee"));
                break;
            case 2:
                try {
                    adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    adminPlayer.sendMessage((translationsDict["ui.playerActions.teleport.toPlayerSuccess"] || "§aTeleported to {targetPlayerName}.").replace("{targetPlayerName}", targetPlayer.nameTag));
                    if (logManager?.addLog) {
                        logManager.addLog('info', { adminName: adminPlayer.nameTag, actionType: 'teleportSelfToPlayer', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag}` }, dependencies);
                    }
                } catch (e) {
                    adminPlayer.sendMessage((translationsDict["ui.playerActions.teleport.error"] || "§cTeleport error: {errorMessage}").replace("{errorMessage}", e.message));
                    if (logManager?.addLog) {
                        logManager.addLog('error', { context: 'uiManager.teleportToPlayer', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
                    }
                }
                break;
            case 3:
                try {
                    targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    adminPlayer.sendMessage((translationsDict["ui.playerActions.teleport.playerToAdminSuccess"] || "§aTeleported {targetPlayerName} to you.").replace("{targetPlayerName}", targetPlayer.nameTag));
                    targetPlayer.sendMessage(translationsDict["ui.playerActions.teleport.playerToAdminNotifyTarget"] || "§eYou have been teleported by an admin.");
                    if (logManager?.addLog) {
                        logManager.addLog('info', { adminName: adminPlayer.nameTag, actionType: 'teleportPlayerToAdmin', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to them.` }, dependencies);
                    }
                } catch (e) {
                    adminPlayer.sendMessage((translationsDict["ui.playerActions.teleport.error"] || "§cTeleport error: {errorMessage}").replace("{errorMessage}", e.message));
                     if (logManager?.addLog) {
                        logManager.addLog('error', { context: 'uiManager.teleportPlayerHere', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
                    }
                }
                break;
            case 4:
                await showModalAndExecute('kick', "ui.playerActions.kick.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.kick.reasonPrompt", placeholderKey: "ui.playerActions.kick.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1]],
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 5:
                const freezeExec = dependencies.commandExecutionMap?.get('freeze');
                if (freezeExec) await freezeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "freeze"));
                break;
            case 6:
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "unmute"));
                } else {
                    await showModalAndExecute('mute', "ui.playerActions.mute.title",
                        [{ type: 'textField', labelKey: "ui.playerActions.mute.durationPrompt", placeholderKey: "ui.playerActions.mute.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.mute.reasonPrompt", placeholderKey: "ui.playerActions.mute.reasonPlaceholder" }],
                        (vals) => [vals[0], vals[1], vals[2]],
                        { targetPlayerName: targetPlayer.nameTag }
                    );
                }
                break;
            case 7:
                await showModalAndExecute('ban', "ui.playerActions.ban.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.ban.durationPrompt", placeholderKey: "ui.playerActions.ban.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.ban.reasonPrompt", placeholderKey: "ui.playerActions.ban.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1], vals[2]],
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 8:
                const resetFlagsExec = dependencies.commandExecutionMap?.get('resetflags');
                if (resetFlagsExec) await resetFlagsExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "resetflags"));
                break;
            case 9:
                await _showConfirmationModal(
                    adminPlayer,
                    "ui.playerActions.clearInventory.confirmTitle",
                    "ui.playerActions.clearInventory.confirmBody",
                    "ui.playerActions.clearInventory.confirmToggle",
                    async () => {
                        const inventoryComp = targetPlayer.getComponent("minecraft:inventory");
                        if (inventoryComp && inventoryComp.container) {
                            for (let i = 0; i < inventoryComp.container.size; i++) {
                                inventoryComp.container.setItem(i);
                            }
                            adminPlayer.sendMessage((translationsDict["ui.playerActions.clearInventory.success"] || "§aSuccessfully cleared inventory for {targetPlayerName}.").replace("{targetPlayerName}", targetPlayer.nameTag));
                            if (logManager?.addLog) {
                                logManager.addLog('info', { adminName: adminPlayer.nameTag, actionType: 'clearInventory', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}` }, dependencies);
                            }
                        } else {
                            adminPlayer.sendMessage((translationsDict["ui.playerActions.clearInventory.fail"] || "§cFailed to clear inventory for {targetPlayerName}.").replace("{targetPlayerName}", targetPlayer.nameTag));
                        }
                    },
                    dependencies,
                    { targetPlayerName: targetPlayer.nameTag }
                );
                break;
            case 10:
                shouldReturnToPlayerList = true;
                shouldReturnToPlayerActions = false;
                break;
            default:
                adminPlayer.sendMessage(translationsDict["ui.adminPanel.error.invalidSelection"] || "§cInvalid selection.");
                break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        } else if (shouldReturnToPlayerActions) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        }

    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showPlayerActionsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.playerActions.error.generic"] || "§cAn error occurred in the player actions form.");
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    const form = new ActionFormData();
    form.title((translationsDict["ui.onlinePlayers.title"] || "Online Players ({playerCount})").replace("{playerCount}", onlinePlayers.length.toString()));

    if (onlinePlayers.length === 0) {
        form.body(translationsDict["ui.onlinePlayers.noPlayers"] || "No players currently online.");
    } else {
        form.body(translationsDict["ui.onlinePlayers.body"] || "Select a player to manage:");
    }

    const playerMappings = onlinePlayers.map(p => {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const flagCount = targetPData?.flags?.totalFlags ?? 0;
        form.button((translationsDict["ui.onlinePlayers.button.playerEntry"] || "{playerName} (Flags: {flagCount})").replace("{playerName}", p.nameTag).replace("{flagCount}", flagCount.toString()), "textures/ui/icon_steve");
        return p.id;
    });

    form.button(translationsDict["ui.button.backToAdminPanel"] || "Back to Admin Panel", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === playerMappings.length) {
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }

        const selectedPlayerId = playerMappings[response.selection];
        const targetPlayer = mc.world.getPlayer(selectedPlayerId);
        if (targetPlayer) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        } else {
            adminPlayer.sendMessage((translationsDict["common.error.playerNotFoundOnline"] || "§cPlayer '{playerName}' not found or is not online.").replace("{playerName}", "Selected Player"));
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showOnlinePlayersList: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showOnlinePlayersList', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.onlinePlayers.error.generic"] || "§cAn error occurred while listing online players.");
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
};

showAdminPanelMain = async function (player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Admin Panel Main requested by ${player.nameTag}`, player.nameTag);
    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player, dependencies);

    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title(translationsDict["ui.adminPanel.title"] || "AntiCheat Admin Panel");
            form.body((translationsDict["ui.adminPanel.body"] || "Welcome, {playerName}! Please select an action.").replace("{playerName}", player.nameTag));
            form.button(translationsDict["ui.adminPanel.button.viewPlayers"] || "View Online Players", "textures/ui/icon_multiplayer");
            form.button(translationsDict["ui.adminPanel.button.inspectPlayerText"] || "Inspect Player (Text)", "textures/ui/spyglass");
            form.button(translationsDict["ui.adminPanel.button.resetFlagsText"] || "Reset Player Flags (Text)", "textures/ui/refresh");
            form.button(translationsDict["ui.adminPanel.button.listWatched"] || "List Watched Players", "textures/ui/magnifying_glass");
            form.button(translationsDict["ui.adminPanel.button.serverManagement"] || "Server Management", "textures/ui/icon_graph");

            let closeButtonIndex = 5;
            if (userPermLevel === permissionLevels.owner) {
                form.button(translationsDict["ui.adminPanel.button.editConfig"] || "Edit System Config", "textures/ui/gear");
                closeButtonIndex = 6;
            }
            form.button(translationsDict["common.button.close"] || "Close", "textures/ui/cancel");

            const response = await form.show(player);
            if (response.canceled || response.selection === closeButtonIndex) {
                depPlayerUtils.debugLog(dependencies, `Admin Panel Main cancelled or closed by ${player.nameTag}.`, player.nameTag);
                return;
            }
            switch (response.selection) {
                case 0: await showOnlinePlayersList(player, playerDataManager, dependencies); break;
                case 1: await showInspectPlayerForm(player, playerDataManager, dependencies); break;
                case 2: await showResetFlagsForm(player, playerDataManager, dependencies); break;
                case 3: await showWatchedPlayersList(player, playerDataManager, dependencies); break;
                case 4: await showServerManagementForm(player, playerDataManager, config, dependencies); break;
                case 5:
                    if (userPermLevel === permissionLevels.owner) {
                        await showEditConfigForm(player, playerDataManager, globalEditableConfigValues, dependencies);
                    }
                    break;
            }
        } else {
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
            return;
        }

    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showAdminPanelMain for ${player.nameTag}: ${error.stack || error}`, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showAdminPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.adminPanel.error.generic"] || "§cAn error occurred in the admin panel.");
    }
};

async function showNormalUserPanelMain(player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Normal User Panel Main requested by ${player.nameTag}`, player.nameTag);
    const form = new ActionFormData();
    form.title(translationsDict["ui.normalPanel.title"] || "User Panel");
    form.body((translationsDict["ui.normalPanel.body"] || "Welcome, {playerName}! Select an option:").replace("{playerName}", player.nameTag));
    form.button(translationsDict["ui.normalPanel.button.myStats"] || "My Stats", "textures/ui/icon_multiplayer");
    form.button(translationsDict["ui.normalPanel.button.serverRules"] || "Server Rules", "textures/ui/book_glyph");
    form.button(translationsDict["ui.normalPanel.button.helpLinks"] || "Helpful Links", "textures/ui/lightbulb_idea");
    form.button(translationsDict["common.button.close"] || "Close", "textures/ui/cancel");

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === 3) { return; }
        switch (response.selection) {
            case 0: await showMyStats(player, dependencies); break;
            case 1: await showServerRules(player, dependencies); break;
            case 2: await showHelpAndLinks(player, dependencies); break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showNormalUserPanelMain for ${player.nameTag}: ${error.stack || error}`, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showNormalUserPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.");
    }
}

export { showAdminPanelMain };

showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, reportManager, worldBorderManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: System Info requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = playerDataManager.getAllPlayerDataEntries ? playerDataManager.getAllPlayerDataEntries().length : (translationsDict["common.value.notApplicable"] || "N/A");
    const watchedPlayersCount = onlinePlayers.filter(p => playerDataManager.getPlayerData(p.id)?.isWatched).length;

    let mutedPersistentCount = 0;
    let bannedPersistentCount = 0;
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.muteInfo && (pData.muteInfo.unmuteTime === Infinity || pData.muteInfo.unmuteTime > Date.now())) {
            mutedPersistentCount++;
        }
        if (pData?.banInfo && (pData.banInfo.unbanTime === Infinity || pData.banInfo.unbanTime > Date.now())) {
            bannedPersistentCount++;
        }
    });

    const activeBordersCount = ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'].filter(dim => worldBorderManager?.getBorderSettings(dim)).length;
    const logCount = logManager?.getLogs ? logManager.getLogs().length : (translationsDict["common.value.notApplicable"] || "N/A");
    const reportCount = reportManager?.getReports ? reportManager.getReports().length : (translationsDict["common.value.notApplicable"] || "N/A");

    const form = new MessageFormData()
        .title(translationsDict["ui.systemInfo.title"] || "System Information")
        .body(
            `${(translationsDict["ui.systemInfo.entry.acVersion"] || "AntiCheat Version: {version}").replace("{version}", dependencies.config.acVersion || "N/A")}\n` +
            `${(translationsDict["ui.systemInfo.entry.mcVersion"] || "Minecraft Version: {version}").replace("{version}", mc.game.version)}\n` +
            `${(translationsDict["ui.systemInfo.entry.serverTime"] || "Server Time: {time}").replace("{time}", new Date().toLocaleTimeString())}\n` +
            `${translationsDict["ui.systemInfo.label_currentTick"] || "Current Server Tick:"}§r §e${mc.system.currentTick}\n` +
            `${translationsDict["ui.systemInfo.label_worldTime"] || "World Time (ticks):"}§r §e${mc.world.getTime()}\n` +
            `${(translationsDict["ui.systemInfo.entry.onlinePlayers"] || "Online Players: {onlineCount}/{maxCount}").replace("{onlineCount}", onlinePlayers.length.toString()).replace("{maxCount}", mc.world.maxPlayers.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.totalPlayerData"] || "Total Player Data Entries: {count}").replace("{count}", pDataEntries.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.watchedPlayers"] || "Watched Players Online: {count}").replace("{count}", watchedPlayersCount.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.mutedPersistent"] || "Persistent Mutes Active: {count}").replace("{count}", mutedPersistentCount.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.bannedPersistent"] || "Persistent Bans Active: {count}").replace("{count}", bannedPersistentCount.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.activeWorldBorders"] || "Active World Borders: {count}").replace("{count}", activeBordersCount.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.logManagerEntries"] || "LogManager Entries: {count}").replace("{count}", logCount.toString())}\n` +
            `${(translationsDict["ui.systemInfo.entry.reportManagerEntries"] || "ReportManager Entries: {count}").replace("{count}", reportCount.toString())}`
        )
        .button1(translationsDict["ui.systemInfo.button.backToServerMgmt"] || "Back to Server Management");
    try {
        await form.show(adminPlayer);
    } catch (error) {
        console.error(`[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showSystemInfo', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, permissionLevels } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Edit Config Form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) !== permissionLevels.owner) {
        adminPlayer.sendMessage(translationsDict["ui.configEditor.error.ownerOnly"] || "§cOnly the server owner can edit the configuration.");
        await showAdminPanelMain(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        return;
    }

    const form = new ActionFormData();
    form.title(translationsDict["ui.configEditor.title"] || "Edit Configuration");
    form.body(translationsDict["ui.configEditor.body"] || "Select a configuration value to edit. Be careful, changes are live!");

    const configKeysToDisplay = Object.keys(currentEditableConfig);
    const keyDetailsMapping = [];

    for (const key of configKeysToDisplay) {
        const displayValueFromRuntime = currentRuntimeConfig[key];
        const valueType = typeof displayValueFromRuntime;
        let displayValueString = String(displayValueFromRuntime);

        if (valueType === 'object' && Array.isArray(displayValueFromRuntime)) {
            displayValueString = JSON.stringify(displayValueFromRuntime);
        } else if (valueType === 'object') {
            displayValueString = translationsDict["ui.configEditor.button.objectPlaceholder"] || "[Object - View/Edit via direct config]";
        }

        const buttonLabelFormat = translationsDict["ui.configEditor.button.format"] || "{key} ({type}): {value}";
        const buttonLabelFormatTruncated = translationsDict["ui.configEditor.button.formatTruncated"] || "{key} ({type}): {value}...";
        const buttonLabel = displayValueString.length > 30 ?
            buttonLabelFormatTruncated.replace("{key}", key).replace("{type}", valueType).replace("{value}", displayValueString.substring(0, 27)) :
            buttonLabelFormat.replace("{key}", key).replace("{type}", valueType).replace("{value}", displayValueString);
        form.button(buttonLabel);
        keyDetailsMapping.push({ name: key, type: typeof currentEditableConfig[key], value: displayValueFromRuntime });
    }
    form.button(translationsDict["ui.configEditor.button.backToAdminPanel"] || "Back to Server Management", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
            return;
        }

        if (response.selection === configKeysToDisplay.length) {
            await showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        } else if (response.selection < configKeysToDisplay.length) {
            const selectedKeyDetail = keyDetailsMapping[response.selection];
            if (selectedKeyDetail.type === 'object' && !Array.isArray(selectedKeyDetail.value)) {
                adminPlayer.sendMessage((translationsDict["ui.configEditor.error.nonArrayObject"] || "§cConfiguration key '{keyName}' is a non-array object and cannot be edited via UI.").replace("{keyName}", selectedKeyDetail.name));
                await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
            } else {
                await showEditSingleConfigValueForm(adminPlayer, selectedKeyDetail.name, selectedKeyDetail.type, selectedKeyDetail.value, dependencies);
            }
        } else {
            adminPlayer.sendMessage(translationsDict["ui.configEditor.error.invalidSelection"] || "§cInvalid selection.");
            await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showEditConfigForm: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showEditConfigForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.configEditor.error.generic"] || "§cAn error occurred while showing the config editor.");
        await showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
    }
};

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title((translationsDict["ui.configEditor.valueInput.title"] || "Edit: {keyName}").replace("{keyName}", keyName));
    let originalValueForComparison = currentValue;

    switch (keyType) {
        case 'boolean': modalForm.toggle((translationsDict["ui.configEditor.valueInput.boolean.label"] || "Value for {keyName} (boolean):").replace("{keyName}", keyName), currentValue); break;
        case 'string': modalForm.textField((translationsDict["ui.configEditor.valueInput.string.label"] || "New value for {keyName} (string):").replace("{keyName}", keyName), (translationsDict["ui.configEditor.valueInput.string.placeholder"] || "Enter string value"), String(currentValue)); break;
        case 'number': modalForm.textField((translationsDict["ui.configEditor.valueInput.number.label"] || "New value for {keyName} (number):").replace("{keyName}", keyName), (translationsDict["ui.configEditor.valueInput.number.placeholder"] || "Enter numeric value"), String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField((translationsDict["ui.configEditor.valueInput.array.label"] || "New value for {keyName} (JSON array):").replace("{keyName}", keyName), (translationsDict["ui.configEditor.valueInput.array.placeholder"] || "Enter JSON array, e.g., [\"val1\", \"val2\"]"), JSON.stringify(currentValue));
            } else {
                adminPlayer.sendMessage((translationsDict["ui.configEditor.error.nonArrayObjectEdit"] || "§cCannot edit non-array objects like '{keyName}' via this UI.").replace("{keyName}", keyName));
                await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
                return;
            }
            break;
        default:
            adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.error.typeUnknown"] || "§cUnknown type '{type}' for config key '{keyName}'.").replace("{type}", keyType).replace("{keyName}", keyName));
            await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
            return;
    }

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
            return;
        }
        let newValue = response.formValues[0];
        let failureReason = "";

        switch (keyType) {
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = translationsDict["ui.configEditor.valueInput.error.notANumber"] || "Input was not a valid number."; else newValue = numVal; break;
            case 'object':
                if (Array.isArray(currentValue)) {
                    try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = translationsDict["ui.configEditor.valueInput.error.notAnArray"] || "Input was not a valid JSON array."; else newValue = parsedArray; }
                    catch (e) { failureReason = (translationsDict["ui.configEditor.valueInput.error.jsonFormat"] || "Invalid JSON format: {errorMessage}").replace("{errorMessage}", e.message); }
                }
                break;
        }

        if (failureReason) {
            adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.error.updateFailed"] || "§cUpdate failed for {keyName}: {failureReason}").replace("{keyName}", keyName).replace("{failureReason}", failureReason));
        } else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison) {
                 adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.noChange"] || "§eNo changes made to {keyName}.").replace("{keyName}", keyName));
            } else {
                const success = updateConfigValue(keyName, newValue);
                if (success) {
                    adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.success"] || "§aSuccessfully updated {keyName} to: {newValue}").replace("{keyName}", keyName).replace("{newValue}", (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue))));
                    if (logManager?.addLog) {
                        logManager.addLog('info', { adminName: adminPlayer.nameTag, actionType: 'configUpdate', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}'` }, dependencies);
                    }
                } else {
                    adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.error.updateFailedInternal"] || "§cInternal error updating {keyName}. Check logs.").replace("{keyName}", keyName));
                }
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showEditSingleConfigValueForm for ${keyName}: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showEditSingleConfigValueForm', player: adminPlayer?.nameTag, keyName: keyName, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage((translationsDict["ui.configEditor.valueInput.error.generic"] || "§cAn error occurred while editing {keyName}.").replace("{keyName}", keyName));
    }
    await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
}


async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    try {
        await _showConfirmationModal(
            adminPlayer,
            "ui.serverManagement.clearChat.confirmTitle",
            "ui.serverManagement.clearChat.confirmBody",
            "ui.serverManagement.clearChat.confirmToggle",
            async () => {
                const clearChatExec = dependencies.commandExecutionMap?.get('clearchat');
                if (clearChatExec) {
                    await clearChatExec(adminPlayer, [], dependencies);
                } else {
                    adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "clearchat"));
                }
            },
            dependencies
        );
    } catch (error) {
        console.error(`[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.handleClearChatAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);

    try {
        await _showConfirmationModal(
            adminPlayer,
            "ui.serverManagement.lagClear.confirmTitle",
            "ui.serverManagement.lagClear.confirmBody",
            "ui.serverManagement.lagClear.confirmToggle",
            async () => {
                const lagClearExec = dependencies.commandExecutionMap?.get('lagclear');
                if (lagClearExec) {
                    await lagClearExec(adminPlayer, [], dependencies);
                } else {
                    adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "lagclear"));
                }
            },
            dependencies
        );
    } catch (error) {
         console.error(`[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(dependencies, `[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.handleLagClearAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    const form = new ActionFormData();
    form.title(translationsDict["ui.modLogSelect.title"] || "Moderation Log Viewer");
    form.body(currentFilterName ? (translationsDict["ui.modLogSelect.body.filtered"] || "Currently filtering by: {filterName}").replace("{filterName}", currentFilterName) : (translationsDict["ui.modLogSelect.body.all"] || "Select a log category or filter by player name."));
    form.button(translationsDict["ui.modLogSelect.button.banUnban"] || "Bans/Unbans", "textures/ui/icon_alert");
    form.button(translationsDict["ui.modLogSelect.button.muteUnmute"] || "Mutes/Unmutes", "textures/ui/speaker_glyph_color");
    form.button(currentFilterName ? (translationsDict["ui.modLogSelect.button.clearFilter"] || "Clear Filter ({filterName})").replace("{filterName}", currentFilterName) : (translationsDict["ui.modLogSelect.button.filterByName"] || "Filter by Name"), currentFilterName ? "textures/ui/cancel" : "textures/ui/magnifying_glass");
    form.button(translationsDict["ui.modLogSelect.button.backToServerMgmt"] || "Back to Server Management", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, translationsDict["ui.logViewer.title.banUnban"] || "Ban/Unban Logs"); break;
            case 1: await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, translationsDict["ui.logViewer.title.muteUnmute"] || "Mute/Unmute Logs"); break;
            case 2:
                if (currentFilterName) {
                    adminPlayer.sendMessage(translationsDict["ui.modLogSelect.filterModal.filterCleared"] || "Log filter cleared.");
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData().title(translationsDict["ui.modLogSelect.filterModal.title"] || "Filter Logs by Player Name");
                    modalFilter.textField(translationsDict["ui.modLogSelect.filterModal.textField.label"] || "Player Name:", translationsDict["ui.modLogSelect.filterModal.textField.placeholder"] || "Enter player name to filter");
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) { await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); return; }
                    const newFilter = modalResponse.formValues[0]?.trim();
                    adminPlayer.sendMessage(newFilter ? (translationsDict["ui.modLogSelect.filterModal.filterSet"] || "Log filter set to: {filterName}").replace("{filterName}", newFilter) : (translationsDict["ui.modLogSelect.filterModal.filterBlank"] || "Log filter not set (blank input)."));
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                }
                break;
            case 3: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (e) {
        depPlayerUtils.debugLog(dependencies, `Error in showModLogTypeSelectionForm: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showModLogTypeSelectionForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.modLogSelect.error.generic"] || "§cError in mod log selection form.");
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    const form = new MessageFormData();
    form.title(filterPlayerName ? (translationsDict["ui.logViewer.title.filtered"] || "{logTypeName} (Filtered by: {filterName})").replace("{logTypeName}", logTypeName).replace("{filterName}", filterPlayerName) : logTypeName);

    const displayLimit = 50;
    let bodyContent = "";
    try {
        const allLogs = logManager.getLogs(200);
        const filteredLogs = allLogs.filter(logEntry => {
            const typeMatch = logActionTypesArray.includes(logEntry.actionType);
            if (!typeMatch) return false;
            if (filterPlayerName) {
                const targetNameMatch = logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase());
                const adminNameMatch = logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase());
                return targetNameMatch || adminNameMatch;
            }
            return true;
        }).slice(0, displayLimit);

        if (filteredLogs.length === 0) {
            bodyContent = translationsDict["ui.logViewer.noLogs"] || "No logs found matching your criteria.";
        } else {
            const entryFormat = translationsDict["ui.actionLogs.logEntry"] || "[{timestamp}] {adminNameOrPlayer} -> {actionType}: Target: {targetNameOrEmpty}{duration}{reason}{details}";
            const durationPrefix = translationsDict["ui.actionLogs.logEntry.durationPrefix"] || " (Duration: ";
            const reasonPrefix = translationsDict["ui.actionLogs.logEntry.reasonPrefix"] || " (Reason: ";
            const detailsPrefix = translationsDict["ui.actionLogs.logEntry.detailsPrefix"] || " (Details: ";
            const suffix = translationsDict["ui.actionLogs.logEntry.suffix"] || ")";

            bodyContent = filteredLogs.map(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                return entryFormat
                    .replace("{timestamp}", timestampStr)
                    .replace("{adminNameOrPlayer}", log.adminName || log.playerName || 'SYSTEM')
                    .replace("{actionType}", log.actionType)
                    .replace("{targetNameOrEmpty}", log.targetName || '')
                    .replace("{duration}", log.duration ? `${durationPrefix}${log.duration}${suffix}` : "")
                    .replace("{reason}", log.reason ? `${reasonPrefix}${log.reason}${suffix}` : "")
                    .replace("{details}", log.details ? `${detailsPrefix}${log.details}${suffix}` : "")
                    .replace(/\s+\(\s*\)/g, ''); // Clean up empty parentheses
            }).join("\n");

            const totalMatchingLogs = allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).length;
            if (totalMatchingLogs > displayLimit) {
                 bodyContent += "\n" + (translationsDict["ui.actionLogs.footer.showingLatest"] || "Showing latest {count} entries.").replace("{count}", displayLimit.toString());
            }
        }
    } catch (e) {
        bodyContent = translationsDict["common.error.genericForm"] || "An error occurred while displaying this form.";
        depPlayerUtils.debugLog(dependencies, `Error in showLogViewerForm log processing: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showLogViewerForm.processing', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }

    form.body(bodyContent.trim() || (translationsDict["ui.actionLogs.body.empty"] || "No logs to display."));
    form.button1(translationsDict["ui.logViewer.button.backToLogSelect"] || "Back to Log Selection");
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(dependencies, `Error displaying LogViewerForm: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showLogViewerForm.display', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title(translationsDict["ui.serverManagement.title"] || "Server Management");
    form.body(translationsDict["ui.serverManagement.body"] || "Select a server management action:");
    form.button(translationsDict["ui.serverManagement.button.systemInfo"] || "System Information", "textures/ui/icon_graph");
    form.button(translationsDict["ui.serverManagement.button.clearChat"] || "Clear Global Chat", "textures/ui/speech_bubble_glyph_color");
    form.button(translationsDict["ui.serverManagement.button.lagClear"] || "Clear Ground Items (Lag Clear)", "textures/ui/icon_trash");
    form.button(translationsDict["ui.serverManagement.button.actionLogs"] || "View Action Logs", "textures/ui/book_writable");
    form.button(translationsDict["ui.serverManagement.button.modLogs"] || "View Moderation Logs", "textures/ui/book_edit_default");

    let backButtonIndex = 5;
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) {
        form.button(translationsDict["ui.serverManagement.button.editConfig"] || "Edit System Config", "textures/ui/gear");
        backButtonIndex = 6;
    }
    form.button(translationsDict["ui.serverManagement.button.backToAdminPanel"] || "Back to Admin Panel", "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === backButtonIndex) {
            await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
            return;
        }
        switch (response.selection) {
            case 0: await showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: await handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: await handleLagClearAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 3: await showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: await showModLogTypeSelectionForm(adminPlayer, dependencies, null); break;
            case 5:
                if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) {
                    await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
                }
                break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showServerManagementForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.serverManagement.error.generic"] || "§cAn error occurred in server management.");
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    }
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title(translationsDict["ui.actionLogs.title"] || "Action Logs");

    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = (translationsDict["ui.actionLogs.bodyHeader"] || "Recent Actions:") + "\n";

    if (logs.length === 0) {
        bodyContent += translationsDict["ui.actionLogs.noLogs"] || "No logs recorded yet.";
    } else {
        const entryFormat = translationsDict["ui.actionLogs.logEntry"] || "[{timestamp}] {adminNameOrPlayer} -> {actionType}: Target: {targetNameOrEmpty}{duration}{reason}{details}";
        const durationPrefix = translationsDict["ui.actionLogs.logEntry.durationPrefix"] || " (Duration: ";
        const reasonPrefix = translationsDict["ui.actionLogs.logEntry.reasonPrefix"] || " (Reason: ";
        const detailsPrefix = translationsDict["ui.actionLogs.logEntry.detailsPrefix"] || " (Details: ";
        const suffix = translationsDict["ui.actionLogs.logEntry.suffix"] || ")";

        bodyContent += logs.map(logEntry => {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            return entryFormat
                .replace("{timestamp}", timestampStr)
                .replace("{adminNameOrPlayer}", logEntry.adminName || logEntry.playerName || 'SYSTEM')
                .replace("{actionType}", logEntry.actionType)
                .replace("{targetNameOrEmpty}", logEntry.targetName || '')
                .replace("{duration}", logEntry.duration ? `${durationPrefix}${logEntry.duration}${suffix}` : "")
                .replace("{reason}", logEntry.reason ? `${reasonPrefix}${logEntry.reason}${suffix}` : "")
                .replace("{details}", logEntry.details ? `${detailsPrefix}${logEntry.details}${suffix}` : "")
                .replace(/\s+\(\s*\)/g, '');
        }).join("\n");

        if (logs.length === logsToDisplayCount && logManager.getLogs().length > logsToDisplayCount) {
            bodyContent += "\n" + (translationsDict["ui.actionLogs.footer.showingLatest"] || "Showing latest {count} entries.").replace("{count}", logsToDisplayCount.toString());
        }
    }
    form.body(bodyContent.trim() || (translationsDict["ui.actionLogs.body.empty"] || "No logs to display."));
    form.button1(translationsDict["ui.actionLogs.button.backToServerMgmt"] || "Back to Server Management");
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(dependencies, `Error in showActionLogsForm: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showActionLogsForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
};

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Reset Flags form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage((translationsDict["common.error.commandModuleNotFound"] || "§cError: Command module '{moduleName}' not found or failed to load.").replace("{moduleName}", "resetflags"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title(translationsDict["ui.resetFlagsForm.title"] || "Reset Player Flags");
    modalForm.textField(translationsDict["ui.resetFlagsForm.textField.label"] || "Player Name:", translationsDict["ui.resetFlagsForm.textField.placeholder"] || "Enter player's exact name");
    modalForm.toggle(translationsDict["ui.resetFlagsForm.toggle.label"] || "Confirm Reset", false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) {
            adminPlayer.sendMessage(translationsDict["ui.resetFlagsForm.cancelled"] || "Flag reset cancelled.");
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage(translationsDict["ui.resetFlagsForm.error.nameEmpty"] || "§cPlayer name cannot be empty.");
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(dependencies, `Error in showResetFlagsForm: ${error.stack || error}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showResetFlagsForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(translationsDict["ui.resetFlagsForm.error.generic"] || "§cAn error occurred while resetting flags.");
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Watched Players list requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    let body = (translationsDict["ui.watchedPlayers.header"] || "Watched Players:\n") + "\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            body += (translationsDict["ui.watchedPlayers.playerEntry"] || "- {playerName}").replace("{playerName}", p.nameTag) + "\n";
            watchedCount++;
        }
    });

    if (watchedCount === 0) {
        body = translationsDict["ui.watchedPlayers.noPlayers"] || "No players are currently being watched.";
    }

    const form = new MessageFormData()
        .title(translationsDict["ui.watchedPlayers.title"] || "Watched Players List")
        .body(body.trim())
        .button1(translationsDict["ui.watchedPlayers.button.ok"] || "OK");
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(dependencies, `Error showing watched players list: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showWatchedPlayersList', player: adminPlayer?.nameTag, errorMessage: e.message, stack: error.stack }, dependencies);
        }
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies;
    const translationsDict = dependencies.translations_dict || {};
    depPlayerUtils.debugLog(dependencies, `UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag);
    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title((translationsDict["ui.detailedFlags.title"] || "Detailed Flags: {targetPlayerName}").replace("{targetPlayerName}", targetPlayer.nameTag));

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) { // Check if more than just totalFlags exists
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : (translationsDict["common.value.notApplicable"] || "N/A");
                body += ((translationsDict["ui.detailedFlags.flagEntry"] || "{flagType}: {count} (Last: {timestamp})")
                    .replace("{flagType}", flagKey)
                    .replace("{count}", flagDetail.count.toString())
                    .replace("{timestamp}", lastDetectionStr)) + "\n";
            }
        }
    }
    if (!body) {
        body = translationsDict["ui.detailedFlags.noFlags"] || "No specific flags recorded for this player.";
    }
    form.body(body.trim());
    form.button1(translationsDict["common.button.back"] || "Back");
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(dependencies, `Error showing detailed flags: ${e.stack || e}`, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog('error', { context: 'uiManager.showDetailedFlagsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
};
