/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * @description Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { updateConfigValue } from '../config.js';
import { formatSessionDuration } from '../utils/playerUtils.js';
import { permissionLevels as importedPermissionLevels, editableConfigValues as globalEditableConfigValues } from '../config.js';

function formatDimensionName(dimensionId) {
    if (typeof dimensionId !== 'string') return "Unknown";
    let name = dimensionId.replace("minecraft:", "");
    name = name.replace(/_/g, " ");
    name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return name;
}

/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * @description Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { updateConfigValue } from '../config.js';
import { formatSessionDuration } from '../utils/playerUtils.js';
import { permissionLevels as importedPermissionLevels, editableConfigValues as globalEditableConfigValues } from '../config.js';

function formatDimensionName(dimensionId) {
    if (typeof dimensionId !== 'string') return "Unknown";
    let name = dimensionId.replace("minecraft:", "");
    name = name.replace(/_/g, " ");
    name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return name;
}

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

async function _showConfirmationModal(adminPlayer, titleKey, bodyKey, confirmToggleLabelKey, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;

    const title = getString(titleKey);
    let body = getString(bodyKey, bodyParams);
    const toggleLabel = getString(confirmToggleLabelKey);
    const actionCancelledMsg = getString("ui.common.actionCancelled");
    const genericFormErrorMsg = getString("common.error.genericForm");

    const modalForm = new ModalFormData();
    modalForm.title(title);
    modalForm.body(body);
    modalForm.toggle(toggleLabel, false);

    try {
        const response = await modalForm.show(adminPlayer);

        if (response.canceled || !response.formValues[0]) {
            adminPlayer.sendMessage(actionCancelledMsg);
            depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) cancelled by ${adminPlayer.nameTag}.`, dependencies, adminPlayer.nameTag);
            return;
        }

        await onConfirmCallback();
        depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) confirmed by ${adminPlayer.nameTag}. Action executed.`, dependencies, adminPlayer.nameTag);

    } catch (error) {
        console.error(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager._showConfirmationModal', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack, titleKey: titleKey }, dependencies);
        }
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}

async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] Inspect Player form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.inspectPlayerForm.title");
    const textFieldLabel = getString("ui.inspectPlayerForm.textField.label");
    const textFieldPlaceholder = getString("ui.inspectPlayerForm.textField.placeholder");
    const nameEmptyMsg = getString("common.error.nameEmpty");
    const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });
    const genericFormErrorMsg = getString("common.error.genericForm");

    const modalForm = new ModalFormData();
    modalForm.title(title);
    modalForm.textField(textFieldLabel, textFieldPlaceholder);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            depPlayerUtils.debugLog(`[UiManager] Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, dependencies, adminPlayer.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage(nameEmptyMsg);
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage(commandNotFoundMsg("inspect"));
        }
    } catch (error) {
        console.error(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showInspectPlayerForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}

async function showMyStats(player, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showMyStats for ${player.nameTag}`, dependencies, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);
    let sessionPlaytimeFormatted = getString("common.value.notAvailable");

    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        const durationMs = Date.now() - pData.joinTime;
        sessionPlaytimeFormatted = formatSessionDuration(durationMs);
    }

    const title = getString("ui.myStats.title");
    const bodyText = getString("ui.myStats.body", { playtime: sessionPlaytimeFormatted });
    const locationLabel = getString("ui.myStats.labelLocation", { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) });
    const dimensionLabel = getString("ui.myStats.labelDimension", { dimensionName: formatDimensionName(player.dimension.id) });
    const backButton = getString("common.button.back");
    const genericFormErrorMsg = getString("common.error.genericForm");

    const statsForm = new MessageFormData();
    statsForm.title(title);

    let bodyLines = [bodyText, "", locationLabel, dimensionLabel];

    statsForm.body(bodyLines.join('\n'));
    statsForm.button1(backButton);

    try {
        await statsForm.show(player);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showMyStats', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    }
}

async function showServerRules(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showServerRules for ${player.nameTag}`, dependencies, player.nameTag);

    const noRulesDefinedMsg = getString("ui.serverRules.noRulesDefined");
    const title = getString("ui.serverRules.title");
    const backButton = getString("common.button.back");
    const genericFormErrorMsg = getString("common.error.genericForm");

    const rules = config.serverRules;
    let rulesBody = "";

    if (Array.isArray(rules) && rules.length > 0) {
        rulesBody = rules.join("\n");
    } else {
        rulesBody = noRulesDefinedMsg;
    }

    const rulesForm = new MessageFormData();
    rulesForm.title(title);
    rulesForm.body(rulesBody);
    rulesForm.button1(backButton);

    try {
        await rulesForm.show(player);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showServerRules', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

async function showHelpAndLinks(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showHelpAndLinks for ${player.nameTag}`, dependencies, player.nameTag);

    const title = getString("ui.helpfulLinks.title");
    const body = getString("ui.helpfulLinks.body");
    const noLinksMsg = getString("ui.helpfulLinks.noLinks");
    const backButton = getString("common.button.back");
    const linkMessageFormat = (linkTitle, linkUrl) => getString("ui.helpfulLinks.linkMessageFormat", { title: linkTitle, url: linkUrl });
    const genericFormErrorMsg = getString("common.error.genericForm");

    const form = new ActionFormData();
    form.title(title);
    form.body(body);

    const helpLinksArray = config.helpLinks;

    if (!Array.isArray(helpLinksArray) || helpLinksArray.length === 0) {
        const msgForm = new MessageFormData();
        msgForm.title(title);
        msgForm.body(noLinksMsg);
        msgForm.button1(backButton);

        try {
            await msgForm.show(player);
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        } catch (error) {
            console.error(`[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
            depPlayerUtils.debugLog(`[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
            if (logManager?.addLog) {
                logManager.addLog({ context: 'uiManager.showHelpAndLinks.noLinksForm', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
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
    form.button(backButton);

    try {
        const response = await form.show(player);

        if (response.canceled || response.selection === helpLinksArray.length) {
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
            return;
        }

        const selectedLink = helpLinksArray[response.selection];
        if (selectedLink && typeof selectedLink.url === 'string' && typeof selectedLink.title === 'string') {
            player.sendMessage(linkMessageFormat(selectedLink.title, selectedLink.url));
            await showHelpAndLinks(player, dependencies);
        } else {
            depPlayerUtils.debugLog(`[UiManager] Error: Invalid link item at index ${response.selection} in showHelpAndLinks.`, dependencies, player.nameTag);
            player.sendMessage(genericFormErrorMsg);
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        }

    } catch (error) {
        console.error(`[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showHelpAndLinks', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.playerActions.title", { targetPlayerName: targetPlayer.nameTag });
    const unfreezeButtonText = getString("ui.playerActions.button.unfreeze");
    const freezeButtonText = getString("ui.playerActions.button.freeze");
    const unmutePermanentButtonText = getString("ui.playerActions.button.unmutePermanent");
    const unmuteTimedButtonText = (time) => getString("ui.playerActions.button.unmuteTimed", { expiryDate: time });
    const muteButtonText = getString("ui.playerActions.button.mute");
    const viewFlagsButton = getString("ui.playerActions.button.viewFlags");
    const viewInventoryButton = getString("ui.playerActions.button.viewInventory");
    const teleportToButton = getString("ui.playerActions.button.teleportTo");
    const teleportHereButton = getString("ui.playerActions.button.teleportHere");
    const kickButton = getString("ui.playerActions.button.kick");
    const banButton = getString("ui.playerActions.button.ban");
    const resetFlagsButton = getString("ui.playerActions.button.resetFlags");
    const clearInventoryButton = getString("ui.playerActions.button.clearInventory");
    const backToListButton = getString("ui.playerActions.button.backToList");

    const form = new ActionFormData();
    form.title(title);

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body(getString("ui.playerActions.body", { flags: flagCount.toString(), watchedStatus: isWatched ? getString("common.boolean.yes") : getString("common.boolean.no") }));

    const frozenTag = "frozen";
    const currentFreezeButtonText = targetPlayer.hasTag(frozenTag) ? unfreezeButtonText : freezeButtonText;
    const freezeButtonIcon = targetPlayer.hasTag(frozenTag) ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = playerDataManager.getMuteInfo?.(targetPlayer, dependencies);
    const isTargetMuted = muteInfo !== null;
    let currentMuteButtonText;
    if (isTargetMuted) {
        currentMuteButtonText = muteInfo.unmuteTime === Infinity ?
            unmutePermanentButtonText :
            unmuteTimedButtonText(new Date(muteInfo.unmuteTime).toLocaleTimeString());
    } else {
        currentMuteButtonText = muteButtonText;
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button(viewFlagsButton, "textures/ui/magnifying_glass");
    form.button(viewInventoryButton, "textures/ui/chest_icon.png");
    form.button(teleportToButton, "textures/ui/portal");
    form.button(teleportHereButton, "textures/ui/arrow_down_thin");
    form.button(kickButton, "textures/ui/icon_hammer");
    form.button(currentFreezeButtonText, freezeButtonIcon);
    form.button(currentMuteButtonText, muteButtonIcon);
    form.button(banButton, "textures/ui/icon_resource_pack");
    form.button(resetFlagsButton, "textures/ui/refresh");
    form.button(clearInventoryButton, "textures/ui/icon_trash");
    form.button(backToListButton, "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const showModalAndExecute = async (commandName, titleKey, fields, argsTransform = (vals) => vals, titleParams = {}) => {
            const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });
            const modalTitle = getString(titleKey, titleParams);
            const genericFormErrorMsg = getString("common.error.genericForm");

            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage(commandNotFoundMsg(commandName));
                return false;
            }
            const modal = new ModalFormData().title(modalTitle);
            fields.forEach(field => {
                const label = getString(field.labelKey);
                const placeholder = getString(field.placeholderKey);
                if (field.type === 'textField') modal.textField(label, placeholder);
                if (field.type === 'toggle') modal.toggle(label, field.defaultValue);
            });
            try {
                const modalResponse = await modal.show(adminPlayer);
                if (modalResponse.canceled) {
                    let cancelledMsgKey = `ui.playerActions.${commandName}.cancelled`;
                    adminPlayer.sendMessage(getString(cancelledMsgKey, `§7${commandName} action cancelled.`));
                    return true;
                }
                await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
                return true;
            } catch (modalError) {
                console.error(`[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.stack || modalError}`);
                depPlayerUtils.debugLog(`[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.message}`, dependencies, adminPlayer.nameTag);
                if (logManager?.addLog) {
                     logManager.addLog({ context: `uiManager.showModalAndExecute.${commandName}`, player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: modalError.message, stack: modalError.stack }, dependencies);
                }
                adminPlayer.sendMessage(genericFormErrorMsg);
                return false;
            }
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });
        const teleportToPlayerSuccessMsg = (name) => getString("ui.playerActions.teleportTo.success", { targetPlayerName: name });
        const teleportPlayerToAdminSuccessMsg = (name) => getString("ui.playerActions.teleportHere.success", { targetPlayerName: name });
        const teleportPlayerToAdminNotifyTargetMsg = getString("ui.playerActions.teleportHere.targetNotification");
        const teleportErrorMsg = (errMsg) => getString("ui.playerActions.teleport.error", { error: errMsg });
        const clearInventorySuccessMsg = (name) => getString("ui.playerActions.clearInventory.success", { targetPlayerName: name });
        const clearInventoryFailMsg = (name) => getString("ui.playerActions.clearInventory.fail", { targetPlayerName: name });
        const invalidSelectionMsg = getString("ui.playerActions.error.invalidSelection");

        switch (response.selection) {
            case 0:
                await showDetailedFlagsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
                shouldReturnToPlayerActions = false;
                break;
            case 1:
                const invseeExec = dependencies.commandExecutionMap?.get('invsee');
                if (invseeExec) await invseeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(commandNotFoundMsg("invsee"));
                break;
            case 2:
                try {
                    adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    adminPlayer.sendMessage(teleportToPlayerSuccessMsg(targetPlayer.nameTag));
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportSelfToPlayer', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag}` }, dependencies);
                    }
                } catch (e) {
                    adminPlayer.sendMessage(teleportErrorMsg(e.message));
                    if (logManager?.addLog) {
                        logManager.addLog({ context: 'uiManager.teleportToPlayer', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
                    }
                }
                break;
            case 3:
                try {
                    targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    adminPlayer.sendMessage(teleportPlayerToAdminSuccessMsg(targetPlayer.nameTag));
                    targetPlayer.sendMessage(teleportPlayerToAdminNotifyTargetMsg);
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportPlayerToAdmin', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to them.` }, dependencies);
                    }
                } catch (e) {
                    adminPlayer.sendMessage(teleportErrorMsg(e.message));
                     if (logManager?.addLog) {
                        logManager.addLog({ context: 'uiManager.teleportPlayerHere', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
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
                else adminPlayer.sendMessage(commandNotFoundMsg("freeze"));
                break;
            case 6:
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage(commandNotFoundMsg("unmute"));
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
                else adminPlayer.sendMessage(commandNotFoundMsg("resetflags"));
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
                            adminPlayer.sendMessage(clearInventorySuccessMsg(targetPlayer.nameTag));
                            if (logManager?.addLog) {
                                logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'clearInventory', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}` }, dependencies);
                            }
                        } else {
                            adminPlayer.sendMessage(clearInventoryFailMsg(targetPlayer.nameTag));
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
                adminPlayer.sendMessage(invalidSelectionMsg);
                break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        } else if (shouldReturnToPlayerActions) {
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        }

    } catch (error) {
        depPlayerUtils.debugLog(`Error in showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showPlayerActionsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(getString("ui.playerActions.error.generic"));
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    const title = getString("ui.onlinePlayers.title", { count: onlinePlayers.length.toString() });
    const noPlayersBody = getString("ui.onlinePlayers.noPlayers");
    const body = getString("ui.onlinePlayers.body");
    const playerEntryButton = (name, flags) => getString("ui.onlinePlayers.button.playerEntry", { playerName: name, flagCount: flags.toString() });
    const backToAdminPanelButton = getString("ui.button.backToAdminPanel");
    const playerNotFoundMsg = (name) => getString("common.error.playerNotFoundOnline", { playerName: name });
    const genericErrorMsg = getString("ui.onlinePlayers.error.generic");

    const form = new ActionFormData();
    form.title(title);

    if (onlinePlayers.length === 0) {
        form.body(noPlayersBody);
    } else {
        form.body(body);
    }

    const playerMappings = onlinePlayers.map(p => {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const flagCount = targetPData?.flags?.totalFlags ?? 0;
        form.button(playerEntryButton(p.nameTag, flagCount), "textures/ui/icon_steve");
        return p.id;
    });

    form.button(backToAdminPanelButton, "textures/ui/undo");

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
            adminPlayer.sendMessage(playerNotFoundMsg("Selected Player"));
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showOnlinePlayersList', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericErrorMsg);
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
};

showAdminPanelMain = async function (player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Admin Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);

    const adminPanelTitle = getString("ui.adminPanel.title");
    const adminPanelBody = getString("ui.adminPanel.body", { playerName: player.nameTag });
    const viewPlayersButton = getString("ui.adminPanel.button.viewPlayers");
    const inspectPlayerButton = getString("ui.adminPanel.button.inspectPlayerText");
    const resetFlagsButton = getString("ui.adminPanel.button.resetFlagsText");
    const listWatchedButton = getString("ui.adminPanel.button.listWatched");
    const serverManagementButton = getString("ui.adminPanel.button.serverManagement");
    const editConfigButton = getString("ui.adminPanel.button.editConfig");
    const closeButton = getString("common.button.close");
    const genericErrorMsg = getString("ui.adminPanel.error.generic");

    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player, dependencies);

    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title(adminPanelTitle);
            form.body(adminPanelBody);
            form.button(viewPlayersButton, "textures/ui/icon_multiplayer");
            form.button(inspectPlayerButton, "textures/ui/spyglass");
            form.button(resetFlagsButton, "textures/ui/refresh");
            form.button(listWatchedButton, "textures/ui/magnifying_glass");
            form.button(serverManagementButton, "textures/ui/icon_graph");

            let closeButtonIndex = 5;
            if (userPermLevel === permissionLevels.owner) {
                form.button(editConfigButton, "textures/ui/gear");
                closeButtonIndex = 6;
            }
            form.button(closeButton, "textures/ui/cancel");

            const response = await form.show(player);
            if (response.canceled || response.selection === closeButtonIndex) {
                depPlayerUtils.debugLog(`Admin Panel Main cancelled or closed by ${player.nameTag}.`, dependencies, player.nameTag);
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
        depPlayerUtils.debugLog(`Error in showAdminPanelMain for ${player.nameTag}: ${error.stack || error}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showAdminPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(genericErrorMsg);
    }
};

async function showNormalUserPanelMain(player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);

    const normalPanelTitle = getString("ui.normalPanel.title");
    const normalPanelBody = getString("ui.normalPanel.body", { playerName: player.nameTag });
    const myStatsButton = getString("ui.normalPanel.button.myStats");
    const serverRulesButton = getString("ui.normalPanel.button.serverRules");
    const helpLinksButton = getString("ui.normalPanel.button.helpLinks");
    const closeButton = getString("common.button.close");
    const genericFormErrorMsg = getString("common.error.genericForm");

    const form = new ActionFormData();
    form.title(normalPanelTitle);
    form.body(normalPanelBody);
    form.button(myStatsButton, "textures/ui/icon_multiplayer");
    form.button(serverRulesButton, "textures/ui/book_glyph");
    form.button(helpLinksButton, "textures/ui/lightbulb_idea");
    form.button(closeButton, "textures/ui/cancel");

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === 3) { return; }
        switch (response.selection) {
            case 0: await showMyStats(player, dependencies); break;
            case 1: await showServerRules(player, dependencies); break;
            case 2: await showHelpAndLinks(player, dependencies); break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showNormalUserPanelMain for ${player.nameTag}: ${error.stack || error}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showNormalUserPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        player.sendMessage(genericFormErrorMsg);
    }
}

export { showAdminPanelMain };

showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, reportManager, worldBorderManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const notApplicable = getString("common.value.notApplicable");
    const title = getString("ui.systemInfo.title");
    const acVersionText = getString("ui.systemInfo.entry.acVersion", { version: dependencies.config.acVersion || notApplicable });
    const mcVersionText = getString("ui.systemInfo.entry.mcVersion", { version: mc.game.version });
    const serverTimeText = getString("ui.systemInfo.entry.serverTime", { time: new Date().toLocaleTimeString() });
    const currentTickLabel = getString("ui.systemInfo.label.currentTick");
    const worldTimeLabel = getString("ui.systemInfo.label.worldTime");
    const onlinePlayersText = (online, max) => getString("ui.systemInfo.entry.onlinePlayers", { onlinePlayers: online.toString(), maxPlayers: max.toString() });
    const totalPlayerDataText = (count) => getString("ui.systemInfo.entry.totalPlayerData", { count: count.toString() });
    const watchedPlayersText = (count) => getString("ui.systemInfo.entry.watchedPlayers", { count: count.toString() });
    const mutedPersistentText = (count) => getString("ui.systemInfo.entry.mutedPersistent", { count: count.toString() });
    const bannedPersistentText = (count) => getString("ui.systemInfo.entry.bannedPersistent", { count: count.toString() });
    const activeBordersText = (count) => getString("ui.systemInfo.entry.activeWorldBorders", { count: count.toString() });
    const logEntriesText = (count) => getString("ui.systemInfo.entry.logManagerEntries", { count: count.toString() });
    const reportEntriesText = (count) => getString("ui.systemInfo.entry.reportManagerEntries", { count: count.toString() });
    const backButtonText = getString("ui.systemInfo.button.backToServerMgmt");

    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = playerDataManager.getAllPlayerDataEntries ? playerDataManager.getAllPlayerDataEntries().length : notApplicable;
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
    const logCount = logManager?.getLogs ? logManager.getLogs().length : notApplicable;
    const reportCount = reportManager?.getReports ? reportManager.getReports().length : notApplicable;

    const form = new MessageFormData()
        .title(title)
        .body(
            `${acVersionText}\n` +
            `${mcVersionText}\n` +
            `${serverTimeText}\n` +
            `${currentTickLabel}§r §e${mc.system.currentTick}\n` +
            `${worldTimeLabel}§r §e${mc.world.getTime()}\n` +
            `${onlinePlayersText(onlinePlayers.length, mc.world.maxPlayers)}\n` +
            `${totalPlayerDataText(pDataEntries)}\n` +
            `${watchedPlayersText(watchedPlayersCount)}\n` +
            `${mutedPersistentText(mutedPersistentCount)}\n` +
            `${bannedPersistentText(bannedPersistentCount)}\n` +
            `${activeBordersText(activeBordersCount)}\n` +
            `${logEntriesText(logCount)}\n` +
            `${reportEntriesText(reportCount)}`
        )
        .button1(backButtonText);
    try {
        await form.show(adminPlayer);
    } catch (error) {
        console.error(`[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showSystemInfo', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const ownerOnlyError = getString("ui.configEditor.error.ownerOnly");
    const title = getString("ui.configEditor.title");
    const body = getString("ui.configEditor.body");
    const objectPlaceholder = getString("ui.configEditor.button.objectPlaceholder");
    const buttonFormat = (key, type, value) => getString("ui.configEditor.button.format", { key, type, value });
    const buttonFormatTruncated = (key, type, value) => getString("ui.configEditor.button.formatTruncated", { key, type, value });
    const backButtonText = getString("ui.configEditor.button.backToAdminPanel");
    const nonArrayObjectError = (key) => getString("ui.configEditor.error.nonArrayObject", { key });
    const invalidSelectionError = getString("ui.configEditor.error.invalidSelection");
    const genericError = getString("ui.configEditor.error.generic");

    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) !== permissionLevels.owner) {
        adminPlayer.sendMessage(ownerOnlyError);
        await showAdminPanelMain(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        return;
    }

    const form = new ActionFormData();
    form.title(title);
    form.body(body);

    const configKeysToDisplay = Object.keys(currentEditableConfig);
    const keyDetailsMapping = [];

    for (const key of configKeysToDisplay) {
        const displayValueFromRuntime = currentRuntimeConfig[key];
        const valueType = typeof displayValueFromRuntime;
        let displayValueString = String(displayValueFromRuntime);

        if (valueType === 'object' && Array.isArray(displayValueFromRuntime)) {
            displayValueString = JSON.stringify(displayValueFromRuntime);
        } else if (valueType === 'object') {
            displayValueString = objectPlaceholder;
        }

        const buttonLabel = displayValueString.length > 30 ?
            buttonFormatTruncated(key, valueType, displayValueString.substring(0, 27)) :
            buttonFormat(key, valueType, displayValueString);
        form.button(buttonLabel);
        keyDetailsMapping.push({ name: key, type: typeof currentEditableConfig[key], value: displayValueFromRuntime });
    }
    form.button(backButtonText, "textures/ui/undo");

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
                adminPlayer.sendMessage(nonArrayObjectError(selectedKeyDetail.name));
                await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
            } else {
                await showEditSingleConfigValueForm(adminPlayer, selectedKeyDetail.name, selectedKeyDetail.type, selectedKeyDetail.value, dependencies);
            }
        } else {
            adminPlayer.sendMessage(invalidSelectionError);
            await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditConfigForm: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showEditConfigForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericError);
        await showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
    }
};

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.configEditor.valueInput.title", { keyName });
    const booleanLabel = getString("ui.configEditor.valueInput.boolean.label", { keyName });
    const stringLabel = getString("ui.configEditor.valueInput.string.label", { keyName });
    const stringPlaceholder = getString("ui.configEditor.valueInput.string.placeholder");
    const numberLabel = getString("ui.configEditor.valueInput.number.label", { keyName });
    const numberPlaceholder = getString("ui.configEditor.valueInput.number.placeholder");
    const arrayLabel = getString("ui.configEditor.valueInput.array.label", { keyName });
    const arrayPlaceholder = getString("ui.configEditor.valueInput.array.placeholder");
    const nonArrayObjectEditError = getString("ui.configEditor.error.nonArrayObjectEdit", { keyName });
    const typeUnknownError = getString("ui.configEditor.valueInput.error.typeUnknown", { type: keyType, keyName });
    const notANumberError = getString("ui.configEditor.valueInput.error.notANumber");
    const notAnArrayError = getString("ui.configEditor.valueInput.error.notAnArray");
    const jsonFormatError = (errMsg) => getString("ui.configEditor.valueInput.error.jsonFormat", { error: errMsg });
    const updateFailedMsg = (kName, reason) => getString("ui.configEditor.valueInput.error.updateFailed", { keyName: kName, reason });
    const noChangeMsg = (kName) => getString("ui.configEditor.valueInput.noChange", { keyName: kName });
    const successMsg = (kName, val) => getString("ui.configEditor.valueInput.success", { keyName: kName, value: val });
    const updateFailedInternalMsg = (kName) => getString("ui.configEditor.valueInput.error.updateFailedInternal", { keyName: kName });
    const genericErrorMsg = (kName) => getString("ui.configEditor.valueInput.error.generic", { keyName: kName });

    const modalForm = new ModalFormData();
    modalForm.title(title);
    let originalValueForComparison = currentValue;

    switch (keyType) {
        case 'boolean': modalForm.toggle(booleanLabel, currentValue); break;
        case 'string': modalForm.textField(stringLabel, stringPlaceholder, String(currentValue)); break;
        case 'number': modalForm.textField(numberLabel, numberPlaceholder, String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField(arrayLabel, arrayPlaceholder, JSON.stringify(currentValue));
            } else {
                adminPlayer.sendMessage(nonArrayObjectEditError);
                await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
                return;
            }
            break;
        default:
            adminPlayer.sendMessage(typeUnknownError);
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
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = notANumberError; else newValue = numVal; break;
            case 'object':
                if (Array.isArray(currentValue)) {
                    try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = notAnArrayError; else newValue = parsedArray; }
                    catch (e) { failureReason = jsonFormatError(e.message); }
                }
                break;
        }

        if (failureReason) {
            adminPlayer.sendMessage(updateFailedMsg(keyName, failureReason));
        } else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison) {
                 adminPlayer.sendMessage(noChangeMsg(keyName));
            } else {
                const success = updateConfigValue(keyName, newValue);
                if (success) {
                    adminPlayer.sendMessage(successMsg(keyName, (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue))));
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'configUpdate', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}'` }, dependencies);
                    }
                } else {
                    adminPlayer.sendMessage(updateFailedInternalMsg(keyName));
                }
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditSingleConfigValueForm for ${keyName}: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showEditSingleConfigValueForm', player: adminPlayer?.nameTag, keyName: keyName, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericErrorMsg(keyName));
    }
    await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
}

async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });

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
                    adminPlayer.sendMessage(commandNotFoundMsg("clearchat"));
                }
            },
            dependencies
        );
    } catch (error) {
        console.error(`[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.handleClearChatAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });

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
                    adminPlayer.sendMessage(commandNotFoundMsg("lagclear"));
                }
            },
            dependencies
        );
    } catch (error) {
         console.error(`[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.handleLagClearAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager, getString } = dependencies;

    const title = getString("ui.modLogSelect.title");
    const bodyFiltered = (filter) => getString("ui.modLogSelect.body.filtered", { filterName: filter });
    const bodyAll = getString("ui.modLogSelect.body.all");
    const banUnbanButton = getString("ui.modLogSelect.button.banUnban");
    const muteUnmuteButton = getString("ui.modLogSelect.button.muteUnmute");
    const clearFilterButton = (filter) => getString("ui.modLogSelect.button.clearFilter", { filterName: filter });
    const filterByNameButton = getString("ui.modLogSelect.button.filterByName");
    const backToServerMgmtButton = getString("ui.modLogSelect.button.backToServerMgmt");
    const banUnbanLogTitle = getString("ui.logViewer.title.banUnban");
    const muteUnmuteLogTitle = getString("ui.logViewer.title.muteUnmute");
    const filterClearedMsg = getString("ui.modLogSelect.filterModal.filterCleared");
    const filterModalTitle = getString("ui.modLogSelect.filterModal.title");
    const filterModalLabel = getString("ui.modLogSelect.filterModal.textField.label");
    const filterModalPlaceholder = getString("ui.modLogSelect.filterModal.textField.placeholder");
    const filterSetMsg = (filter) => getString("ui.modLogSelect.filterModal.filterSet", { filterName: filter });
    const filterBlankMsg = getString("ui.modLogSelect.filterModal.filterBlank");
    const genericErrorMsg = getString("ui.modLogSelect.error.generic");

    const form = new ActionFormData();
    form.title(title);
    form.body(currentFilterName ? bodyFiltered(currentFilterName) : bodyAll);
    form.button(banUnbanButton, "textures/ui/icon_alert");
    form.button(muteUnmuteButton, "textures/ui/speaker_glyph_color");
    form.button(currentFilterName ? clearFilterButton(currentFilterName) : filterByNameButton, currentFilterName ? "textures/ui/cancel" : "textures/ui/magnifying_glass");
    form.button(backToServerMgmtButton, "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, banUnbanLogTitle); break;
            case 1: await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, muteUnmuteLogTitle); break;
            case 2:
                if (currentFilterName) {
                    adminPlayer.sendMessage(filterClearedMsg);
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData().title(filterModalTitle);
                    modalFilter.textField(filterModalLabel, filterModalPlaceholder);
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) { await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); return; }
                    const newFilter = modalResponse.formValues[0]?.trim();
                    adminPlayer.sendMessage(newFilter ? filterSetMsg(newFilter) : filterBlankMsg);
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                }
                break;
            case 3: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (e) {
        depPlayerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showModLogTypeSelectionForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericErrorMsg);
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;

    const titleFiltered = (logType, filterName) => getString("ui.logViewer.title.filtered", { logTypeName: logType, filterName: filterName });
    const noLogsMsg = getString("ui.logViewer.noLogs");
    const logEntryFormat = (log) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actor = log.adminName || log.playerName || 'SYSTEM';
        const target = log.targetName || '';
        const duration = log.duration ? getString("ui.actionLogs.logEntry.duration", { duration: log.duration }) : "";
        const reason = log.reason ? getString("ui.actionLogs.logEntry.reason", { reason: log.reason }) : "";
        const details = log.details ? getString("ui.actionLogs.logEntry.details", { details: log.details }) : "";
        return getString("ui.actionLogs.logEntry", { timestamp, actor, actionType: log.actionType, target, duration, reason, details }).replace(/\s+\(\s*\)/g, '');
    };
    const footerShowingLatest = (count) => getString("ui.actionLogs.footer.showingLatest", { count: count.toString() });
    const genericFormError = getString("common.error.genericForm");
    const bodyEmptyMsg = getString("ui.actionLogs.body.empty");
    const backButtonText = getString("ui.logViewer.button.backToLogSelect");

    const form = new MessageFormData();
    form.title(filterPlayerName ? titleFiltered(logTypeName, filterPlayerName) : logTypeName);

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
            bodyContent = noLogsMsg;
        } else {
            bodyContent = filteredLogs.map(log => logEntryFormat(log)).join("\n");

            const totalMatchingLogs = allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).length;
            if (totalMatchingLogs > displayLimit) {
                 bodyContent += footerShowingLatest(displayLimit);
            }
        }
    } catch (e) {
        bodyContent = genericFormError;
        depPlayerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showLogViewerForm.processing', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }

    form.body(bodyContent.trim() || bodyEmptyMsg);
    form.button1(backButtonText);
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showLogViewerForm.display', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.serverManagement.title");
    const body = getString("ui.serverManagement.body");
    const systemInfoButton = getString("ui.serverManagement.button.systemInfo");
    const clearChatButton = getString("ui.serverManagement.button.clearChat");
    const lagClearButton = getString("ui.serverManagement.button.lagClear");
    const actionLogsButton = getString("ui.serverManagement.button.actionLogs");
    const modLogsButton = getString("ui.serverManagement.button.modLogs");
    const editConfigButton = getString("ui.serverManagement.button.editConfig");
    const backToAdminPanelButton = getString("ui.serverManagement.button.backToAdminPanel");
    const genericErrorMsg = getString("ui.serverManagement.error.generic");

    const form = new ActionFormData();
    form.title(title);
    form.body(body);
    form.button(systemInfoButton, "textures/ui/icon_graph");
    form.button(clearChatButton, "textures/ui/speech_bubble_glyph_color");
    form.button(lagClearButton, "textures/ui/icon_trash");
    form.button(actionLogsButton, "textures/ui/book_writable");
    form.button(modLogsButton, "textures/ui/book_edit_default");

    let backButtonIndex = 5;
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) {
        form.button(editConfigButton, "textures/ui/gear");
        backButtonIndex = 6;
    }
    form.button(backToAdminPanelButton, "textures/ui/undo");

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
        depPlayerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showServerManagementForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericErrorMsg);
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    }
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.actionLogs.title");
    const bodyHeader = getString("ui.actionLogs.bodyHeader");
    const noLogsMsg = getString("ui.actionLogs.noLogs");
    const logEntryFormat = (log) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actor = log.adminName || log.playerName || 'SYSTEM';
        const target = log.targetName || '';
        const durationText = log.duration ? getString("ui.actionLogs.logEntry.duration", { duration: log.duration }) : "";
        const reasonText = log.reason ? getString("ui.actionLogs.logEntry.reason", { reason: log.reason }) : "";
        const detailsText = log.details ? getString("ui.actionLogs.logEntry.details", { details: log.details }) : "";
        return getString("ui.actionLogs.logEntry", { timestamp, actor, actionType: log.actionType, target, duration: durationText, reason: reasonText, details: detailsText }).replace(/\s+\(\s*\)/g, '');
    };
    const footerShowingLatest = (count) => getString("ui.actionLogs.footer.showingLatest", { count: count.toString() });
    const bodyEmptyMsg = getString("ui.actionLogs.body.empty");
    const backButtonText = getString("ui.actionLogs.button.backToServerMgmt");

    const form = new MessageFormData();
    form.title(title);

    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = bodyHeader;

    if (logs.length === 0) {
        bodyContent += noLogsMsg;
    } else {
        bodyContent += logs.map(logEntry => logEntryFormat(logEntry)).join("\n");

        if (logs.length === logsToDisplayCount && logManager.getLogs().length > logsToDisplayCount) {
            bodyContent += footerShowingLatest(logsToDisplayCount);
        }
    }
    form.body(bodyContent.trim() || bodyEmptyMsg);
    form.button1(backButtonText);
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showActionLogsForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
};

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const commandNotFoundMsg = (moduleName) => getString("common.error.commandModuleNotFound", { moduleName });
    const title = getString("ui.resetFlagsForm.title");
    const textFieldLabel = getString("ui.resetFlagsForm.textField.label");
    const textFieldPlaceholder = getString("ui.resetFlagsForm.textField.placeholder");
    const toggleLabel = getString("ui.resetFlagsForm.toggle.label");
    const cancelledMsg = getString("ui.resetFlagsForm.cancelled");
    const nameEmptyMsg = getString("ui.resetFlagsForm.error.nameEmpty");
    const genericErrorMsg = getString("ui.resetFlagsForm.error.generic");

    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage(commandNotFoundMsg("resetflags"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title(title);
    modalForm.textField(textFieldLabel, textFieldPlaceholder);
    modalForm.toggle(toggleLabel, false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) {
            adminPlayer.sendMessage(cancelledMsg);
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage(nameEmptyMsg);
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showResetFlagsForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);
        }
        adminPlayer.sendMessage(genericErrorMsg);
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const header = getString("ui.watchedPlayers.header");
    const playerEntry = (name) => getString("ui.watchedPlayers.playerEntry", { playerName: name });
    const noPlayersWatched = getString("ui.watchedPlayers.noPlayers");
    const title = getString("ui.watchedPlayers.title");
    const okButton = getString("ui.watchedPlayers.button.ok");

    let body = header;
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            body += playerEntry(p.nameTag) + "\n";
            watchedCount++;
        }
    });

    if (watchedCount === 0) {
        body = noPlayersWatched;
    }

    const form = new MessageFormData()
        .title(title)
        .body(body.trim())
        .button1(okButton);
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showWatchedPlayersList', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const title = getString("ui.detailedFlags.title", { playerName: targetPlayer.nameTag });
    const notApplicable = getString("common.value.notApplicable");
    const flagEntryText = (type, count, time) => getString("ui.detailedFlags.flagEntry", { flagName: type, count: count.toString(), lastDetectionTime: time });
    const noFlagsMsg = getString("ui.detailedFlags.noFlags");
    const backButton = getString("common.button.back");

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title(title);

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) {
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : notApplicable;
                body += flagEntryText(flagKey, flagDetail.count, lastDetectionStr) + "\n";
            }
        }
    }
    if (!body) {
        body = noFlagsMsg;
    }
    form.body(body.trim());
    form.button1(backButton);
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error showing detailed flags: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showDetailedFlagsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies);
        }
    }
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
};
