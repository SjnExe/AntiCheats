/**
 * Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { updateConfigValue } from '../config.js';
import { formatSessionDuration } from '../utils/playerUtils.js';
// editableConfigValues is imported from config.js.
// permissionLevels are accessed via the 'dependencies' object passed to functions, originating from rankManager.
import { editableConfigValues as globalEditableConfigValues } from '../config.js';

function formatDimensionName(dimensionId) {
    if (typeof dimensionId !== 'string') return 'Unknown';
    let name = dimensionId.replace('minecraft:', '');
    name = name.replace(/_/g, ' ');
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
let showNormalUserPanelMain; // Added forward declaration

async function _showConfirmationModal(adminPlayer, titleKey, bodyKey, confirmToggleLabelKey, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    const title = getString(titleKey);
    let body = getString(bodyKey, bodyParams);
    const toggleLabel = getString(confirmToggleLabelKey);
    const actionCancelledMsg = getString('ui.common.actionCancelled');
    const genericFormErrorMsg = getString('common.error.genericForm');

    const modalForm = new ModalFormData();
    modalForm.title(title);
    modalForm.body(body);
    modalForm.toggle(toggleLabel, false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[0]) {
            adminPlayer.sendMessage(actionCancelledMsg);
            depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) cancelled by ${adminPlayer.nameTag}.`, adminPlayer.nameTag, dependencies);
            return;
        }
        await onConfirmCallback();
        depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) confirmed by ${adminPlayer.nameTag}. Action executed.`, adminPlayer.nameTag, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager._showConfirmationModal', details: `TitleKey: ${titleKey}, Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}

async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] Inspect Player form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);

    const safeGetString = (key, params) => getString(key, params); // getString is expected
    const title = safeGetString('ui.inspectPlayerForm.title');
    const textFieldLabel = safeGetString('ui.inspectPlayerForm.textField.label');
    const textFieldPlaceholder = safeGetString('ui.inspectPlayerForm.textField.placeholder');
    const nameEmptyMsg = safeGetString('common.error.nameEmpty');
    const commandNotFoundMsg = (moduleName) => safeGetString('common.error.commandModuleNotFound', { moduleName });
    const genericFormErrorMsg = safeGetString('common.error.genericForm');

    const modalForm = new ModalFormData();
    modalForm.title(title);
    modalForm.textField(textFieldLabel, textFieldPlaceholder);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            depPlayerUtils.debugLog(`[UiManager] Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, adminPlayer.nameTag, dependencies);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === '') {
            adminPlayer.sendMessage(nameEmptyMsg);
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies);
            return;
        }
        const commandExecute = dependencies.commandExecutionMap.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage(commandNotFoundMsg('inspect'));
        }
    } catch (error) {
        console.error(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.message}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showInspectPlayerForm', details: `Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}

async function showMyStats(player, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, getString, config } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showMyStats for ${player.nameTag}`, player.nameTag, dependencies);
    const pData = playerDataManager.getPlayerData(player.id);
    let sessionPlaytimeFormatted = getString('common.value.notAvailable');
    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        sessionPlaytimeFormatted = formatSessionDuration(Date.now() - pData.joinTime);
    }
    const title = getString('ui.myStats.title');
    const bodyText = getString('ui.myStats.body', { playtime: sessionPlaytimeFormatted });
    const locationLabel = getString('ui.myStats.labelLocation', { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) });
    const dimensionLabel = getString('ui.myStats.labelDimension', { dimensionName: formatDimensionName(player.dimension.id) });
    const backButton = getString('common.button.back');
    const genericFormErrorMsg = getString('common.error.genericForm');
    const statsForm = new MessageFormData().title(title).body([bodyText, '', locationLabel, dimensionLabel].join('\n')).button1(backButton);
    statsForm.show(player).then(() => {
        showNormalUserPanelMain(player, dependencies);
    }).catch(error => {
        console.error(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showMyStats', details: `Error: ${error.message}` }, dependencies);
        player.sendMessage(genericFormErrorMsg);
        showNormalUserPanelMain(player, dependencies);
    });
}

async function showServerRules(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showServerRules for ${player.nameTag}`, player.nameTag, dependencies);
    const noRulesDefinedMsg = getString('ui.serverRules.noRulesDefined');
    const title = getString('ui.serverRules.title');
    const backButton = getString('common.button.back');
    const genericFormErrorMsg = getString('common.error.genericForm');
    const rules = config.serverRules;
    let rulesBody = (Array.isArray(rules) && rules.length > 0) ? rules.join('\n') : noRulesDefinedMsg;
    const rulesForm = new MessageFormData().title(title).body(rulesBody).button1(backButton);
    rulesForm.show(player).then(() => {
        showNormalUserPanelMain(player, dependencies);
    }).catch(error => {
        console.error(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showServerRules', details: `Error: ${error.message}` }, dependencies);
        player.sendMessage(genericFormErrorMsg);
        showNormalUserPanelMain(player, dependencies);
    });
}

async function showHelpLinks(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showHelpLinks for ${player.nameTag}`, player.nameTag, dependencies);
    const title = getString('ui.helpfulLinks.title');
    const body = getString('ui.helpfulLinks.body');
    const noLinksMsg = getString('ui.helpfulLinks.noLinks');
    const backButton = getString('common.button.back');
    const linkMessageFormat = (linkTitle, linkUrl) => getString('ui.helpfulLinks.linkMessageFormat', { title: linkTitle, url: linkUrl });
    const genericFormErrorMsg = getString('common.error.genericForm');
    const form = new ActionFormData().title(title).body(body);
    const helpLinksArray = config.helpLinks;

    if (!Array.isArray(helpLinksArray) || helpLinksArray.length === 0) {
        new MessageFormData().title(title).body(noLinksMsg).button1(backButton).show(player).then(() => {
            showNormalUserPanelMain(player, dependencies);
        }).catch(error => {
            console.error(`[UiManager] Error showing noLinks form in showHelpLinks for ${player.nameTag}: ${error.stack || error}`);
            depPlayerUtils.debugLog(`[UiManager] Error showing noLinks form: ${error.message}`, player.nameTag, dependencies);
            logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showHelpLinks.noLinksForm', details: `Error: ${error.message}` }, dependencies);
            showNormalUserPanelMain(player, dependencies);
        });
        return;
    }
    helpLinksArray.forEach(link => { if (link && typeof link.title === 'string') form.button(link.title); });
    form.button(backButton);

    form.show(player).then(response => {
        if (response.canceled || response.selection === helpLinksArray.length) {
            showNormalUserPanelMain(player, dependencies);
            return;
        }
        const selectedLink = helpLinksArray[response.selection];
        if (selectedLink && typeof selectedLink.url === 'string' && typeof selectedLink.title === 'string') {
            player.sendMessage(linkMessageFormat(selectedLink.title, selectedLink.url));
            showHelpLinks(player, dependencies); // Re-show after sending link
        } else {
            depPlayerUtils.debugLog(`[UiManager] Error: Invalid link item at index ${response.selection}.`, player.nameTag, dependencies);
            player.sendMessage(genericFormErrorMsg);
            showNormalUserPanelMain(player, dependencies);
        }
    }).catch(error => {
        console.error(`[UiManager] Error in showHelpLinks for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showHelpLinks: ${error.message}`, player.nameTag, dependencies);
        logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showHelpLinks', details: `Error: ${error.message}` }, dependencies);
        player.sendMessage(genericFormErrorMsg);
        showNormalUserPanelMain(player, dependencies);
    });
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const title = getString('ui.playerActions.title', { targetPlayerName: targetPlayer.nameTag });
    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    const form = new ActionFormData().title(title).body(getString('ui.playerActions.body', { flags: flagCount.toString(), watchedStatus: isWatched ? getString('common.boolean.yes') : getString('common.boolean.no') }));
    const frozenTag = 'frozen';
    const currentFreezeButtonText = targetPlayer.hasTag(frozenTag) ? getString('ui.playerActions.button.unfreeze') : getString('ui.playerActions.button.freeze');
    const freezeButtonIcon = targetPlayer.hasTag(frozenTag) ? 'textures/ui/icon_unlocked' : 'textures/ui/icon_locked';
    const muteInfo = playerDataManager.getMuteInfo(targetPlayer, dependencies);
    const isTargetMuted = muteInfo !== null;
    let currentMuteButtonText = isTargetMuted ? (muteInfo.unmuteTime === Infinity ? getString('ui.playerActions.button.unmutePermanent') : getString('ui.playerActions.button.unmuteTimed', { expiryDate: new Date(muteInfo.unmuteTime).toLocaleTimeString() })) : getString('ui.playerActions.button.mute');
    const muteButtonIcon = isTargetMuted ? 'textures/ui/speaker_off_light' : 'textures/ui/speaker_on_light';

    form.button(getString('ui.playerActions.button.viewFlags'), 'textures/ui/magnifying_glass');
    form.button(getString('ui.playerActions.button.viewInventory'), 'textures/ui/chest_icon.png');
    form.button(getString('ui.playerActions.button.teleportTo'), 'textures/ui/portal');
    form.button(getString('ui.playerActions.button.teleportHere'), 'textures/ui/arrow_down_thin');
    form.button(getString('ui.playerActions.button.kick'), 'textures/ui/icon_hammer');
    form.button(currentFreezeButtonText, freezeButtonIcon);
    form.button(currentMuteButtonText, muteButtonIcon);
    form.button(getString('ui.playerActions.button.ban'), 'textures/ui/icon_resource_pack');
    form.button(getString('ui.playerActions.button.resetFlags'), 'textures/ui/refresh');
    form.button(getString('ui.playerActions.button.clearInventory'), 'textures/ui/icon_trash');
    form.button(getString('ui.playerActions.button.backToList'), 'textures/ui/undo');

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); return; }
        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;
        const cmdExec = (cmd) => dependencies.commandExecutionMap.get(cmd);

        switch (response.selection) {
            case 0: await showDetailedFlagsForm(adminPlayer, targetPlayer, playerDataManager, dependencies); shouldReturnToPlayerActions = false; break;
            case 1: if (cmdExec('invsee')) await cmdExec('invsee')(adminPlayer, [targetPlayer.nameTag], dependencies); else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'invsee' })); break;
            case 2: try { adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension }); adminPlayer.sendMessage(getString('ui.playerActions.teleportTo.success', { targetPlayerName: targetPlayer.nameTag })); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportSelfToPlayer', targetName: targetPlayer.nameTag, details: `Admin teleported to ${targetPlayer.nameTag}` }, dependencies); } catch (e) { adminPlayer.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message })); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.teleportToPlayer', details: `Error: ${e.message}` }, dependencies); } break;
            case 3: try { targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension }); adminPlayer.sendMessage(getString('ui.playerActions.teleportHere.success', { targetPlayerName: targetPlayer.nameTag })); targetPlayer.sendMessage(getString('ui.playerActions.teleportHere.targetNotification')); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportPlayerToAdmin', targetName: targetPlayer.nameTag, details: `Admin teleported ${targetPlayer.nameTag} to them` }, dependencies); } catch (e) { adminPlayer.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message })); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.teleportPlayerToAdmin', details: `Error: ${e.message}` }, dependencies); } break;
            case 4: await _showModalAndExecuteWithTransform('kick', 'ui.playerActions.kick.title', [{ type: 'textField', labelKey: 'ui.playerActions.kick.reasonPrompt', placeholderKey: 'ui.playerActions.kick.reasonPlaceholder' }], (vals) => [targetPlayer.nameTag, vals[0]], dependencies, adminPlayer, { targetPlayerName: targetPlayer.nameTag }); shouldReturnToPlayerList = true; break;
            case 5: if (cmdExec('freeze')) await cmdExec('freeze')(adminPlayer, [targetPlayer.nameTag], dependencies); else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' })); break;
            case 6: if (isTargetMuted) { if (cmdExec('unmute')) await cmdExec('unmute')(adminPlayer, [targetPlayer.nameTag], dependencies); else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'unmute' })); } else { await _showModalAndExecuteWithTransform('mute', 'ui.playerActions.mute.title', [{ type: 'textField', labelKey: 'ui.playerActions.mute.durationPrompt', placeholderKey: 'ui.playerActions.mute.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.mute.reasonPrompt', placeholderKey: 'ui.playerActions.mute.reasonPlaceholder' }], (vals) => [targetPlayer.nameTag, vals[0], vals[1]], dependencies, adminPlayer, { targetPlayerName: targetPlayer.nameTag }); } break;
            case 7: await _showModalAndExecuteWithTransform('ban', 'ui.playerActions.ban.title', [{ type: 'textField', labelKey: 'ui.playerActions.ban.durationPrompt', placeholderKey: 'ui.playerActions.ban.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.ban.reasonPrompt', placeholderKey: 'ui.playerActions.ban.reasonPlaceholder' }], (vals) => [targetPlayer.nameTag, vals[0], vals[1]], dependencies, adminPlayer, { targetPlayerName: targetPlayer.nameTag }); shouldReturnToPlayerList = true; break;
            case 8: if (cmdExec('resetflags')) await cmdExec('resetflags')(adminPlayer, [targetPlayer.nameTag], dependencies); else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' })); break;
            case 9: await _showConfirmationModal(adminPlayer, 'ui.playerActions.clearInventory.confirmTitle', 'ui.playerActions.clearInventory.confirmBody', 'ui.playerActions.clearInventory.confirmToggle', async () => { const invComp = targetPlayer.getComponent('minecraft:inventory'); if (invComp?.container) { for (let i = 0; i < invComp.container.size; i++) invComp.container.setItem(i); adminPlayer.sendMessage(getString('ui.playerActions.clearInventory.success', { targetPlayerName: targetPlayer.nameTag })); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'clearInventory', targetName: targetPlayer.nameTag, details: `Cleared inventory for ${targetPlayer.nameTag}` }, dependencies); } else adminPlayer.sendMessage(getString('ui.playerActions.clearInventory.fail', { targetPlayerName: targetPlayer.nameTag })); }, dependencies, { targetPlayerName: targetPlayer.nameTag }); break;
            case 10: shouldReturnToPlayerList = true; shouldReturnToPlayerActions = false; break;
            default: adminPlayer.sendMessage(getString('ui.playerActions.error.invalidSelection')); break;
        }
        if (shouldReturnToPlayerList) await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        else if (shouldReturnToPlayerActions) await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showPlayerActionsForm: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showPlayerActionsForm', details: `Target: ${targetPlayer.nameTag}, Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.playerActions.error.generic'));
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

// Helper for modal execution to reduce repetition in showPlayerActionsForm
async function _showModalAndExecuteWithTransform(commandName, titleKey, fields, argsTransform, dependencies, adminPlayer, titleParams = {}) {
    const { getString, playerUtils: depPlayerUtils, logManager } = dependencies;
    const modalTitle = getString(titleKey, titleParams);
    const cmdExec = dependencies.commandExecutionMap.get(commandName);
    if (!cmdExec) {
        adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: commandName }));
        return false;
    }
    const modal = new ModalFormData().title(modalTitle);
    fields.forEach(field => {
        const label = getString(field.labelKey);
        const placeholder = getString(field.placeholderKey);
        if (field.type === 'textField') modal.textField(label, placeholder);
        if (field.type === 'toggle') modal.toggle(label, field.defaultValue || false);
    });
    try {
        const modalResponse = await modal.show(adminPlayer);
        if (modalResponse.canceled) {
            adminPlayer.sendMessage(getString(`ui.playerActions.${commandName}.cancelled`) || `§7${commandName} action cancelled.`);
            return true; // Indicate cancellation or completion of this flow part
        }
        await cmdExec(adminPlayer, argsTransform(modalResponse.formValues), dependencies);
        return true;
    } catch (modalError) {
        console.error(`[UiManager] Error in _showModalAndExecuteWithTransform (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.stack || modalError}`);
        depPlayerUtils.debugLog(`[UiManager] Error in modal for ${commandName}: ${modalError.message}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: `uiManager.modal.${commandName}`, details: `Error: ${modalError.message}` }, dependencies);
        adminPlayer.sendMessage(getString('common.error.genericForm'));
        return false; // Indicate failure
    }
}


showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const onlinePlayers = mc.world.getAllPlayers();
    const title = getString('ui.onlinePlayers.title', { count: onlinePlayers.length.toString() });
    const form = new ActionFormData().title(title).body(onlinePlayers.length === 0 ? getString('ui.onlinePlayers.noPlayers') : getString('ui.onlinePlayers.body'));
    const playerMappings = onlinePlayers.map(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        form.button(getString('ui.onlinePlayers.button.playerEntry', { playerName: p.nameTag, flagCount: (pData?.flags?.totalFlags ?? 0).toString() }), 'textures/ui/icon_steve');
        return p.id;
    });
    form.button(getString('ui.button.backToAdminPanel'), 'textures/ui/undo');
    try {
        const response = await form.show(adminPlayer);
        if (response.canceled || response.selection === playerMappings.length) {
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
            return;
        }
        const targetPlayer = mc.world.getPlayer(playerMappings[response.selection]);
        if (targetPlayer) await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        else { adminPlayer.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: 'Selected Player' })); await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies); }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showOnlinePlayersList', details: `Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.onlinePlayers.error.generic'));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
};

showAdminPanelMain = async function (player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Admin Panel Main requested by ${player.nameTag}`, player.nameTag, dependencies);
    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player, dependencies);
    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title(getString('ui.adminPanel.title')).body(getString('ui.adminPanel.body', { playerName: player.nameTag }));
            form.button(getString('ui.adminPanel.button.viewPlayers'), 'textures/ui/icon_multiplayer');
            form.button(getString('ui.adminPanel.button.inspectPlayerText'), 'textures/ui/spyglass');
            form.button(getString('ui.adminPanel.button.resetFlagsText'), 'textures/ui/refresh');
            form.button(getString('ui.adminPanel.button.listWatched'), 'textures/ui/magnifying_glass');
            form.button(getString('ui.adminPanel.button.serverManagement'), 'textures/ui/icon_graph');
            let closeButtonIndex = 5;
            if (userPermLevel === permissionLevels.owner) { form.button(getString('ui.adminPanel.button.editConfig'), 'textures/ui/gear'); closeButtonIndex = 6; }
            form.button(getString('common.button.close'), 'textures/ui/cancel');
            const response = await form.show(player);
            if (response.canceled || response.selection === closeButtonIndex) { depPlayerUtils.debugLog(`Admin Panel Main cancelled or closed.`, player.nameTag, dependencies); return; }
            switch (response.selection) {
                case 0: await showOnlinePlayersList(player, playerDataManager, dependencies); break;
                case 1: await showInspectPlayerForm(player, playerDataManager, dependencies); break;
                case 2: await showResetFlagsForm(player, playerDataManager, dependencies); break;
                case 3: await showWatchedPlayersList(player, playerDataManager, dependencies); break;
                case 4: await showServerManagementForm(player, playerDataManager, config, dependencies); break;
                case 5: if (userPermLevel === permissionLevels.owner) await showEditConfigForm(player, playerDataManager, globalEditableConfigValues, dependencies); break;
            }
        } else {
            await showNormalUserPanelMain(player, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showAdminPanelMain: ${error.stack || error}`, player.nameTag, dependencies);
        logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showAdminPanelMain', details: `Error: ${error.message}` }, dependencies);
        player.sendMessage(getString('ui.adminPanel.error.generic'));
    }
};

showNormalUserPanelMain = async function (player, dependencies) { // Standardized to pass full dependencies
    const { playerUtils: depPlayerUtils, logManager, getString, playerDataManager, config } = dependencies; // Destructure here
    depPlayerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, player.nameTag, dependencies);
    const form = new ActionFormData().title(getString('ui.normalPanel.title')).body(getString('ui.normalPanel.body', { playerName: player.nameTag }));
    form.button(getString('ui.normalPanel.button.myStats'), 'textures/ui/icon_multiplayer');
    form.button(getString('ui.normalPanel.button.serverRules'), 'textures/ui/book_glyph');
    form.button(getString('ui.normalPanel.button.helpLinks'), 'textures/ui/lightbulb_idea');
    form.button(getString('common.button.close'), 'textures/ui/cancel');
    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === 3) return;
        switch (response.selection) {
            case 0: await showMyStats(player, dependencies); break;
            case 1: await showServerRules(player, dependencies); break;
            case 2: await showHelpLinks(player, dependencies); break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showNormalUserPanelMain: ${error.stack || error}`, player.nameTag, dependencies);
        logManager.addLog({ adminName: player.nameTag, actionType: 'error', context: 'uiManager.showNormalUserPanelMain', details: `Error: ${error.message}` }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    }
}

export { showAdminPanelMain };

showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, reportManager, worldBorderManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const notApplicable = getString('common.value.notApplicable');
    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = typeof playerDataManager.getAllPlayerDataValues === 'function' ? Array.from(playerDataManager.getAllPlayerDataValues()).length : notApplicable;
    const watchedPlayersCount = onlinePlayers.filter(p => playerDataManager.getPlayerData(p.id)?.isWatched).length;
    let mutedPersistentCount = 0, bannedPersistentCount = 0;
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.muteInfo && (pData.muteInfo.unmuteTime === Infinity || pData.muteInfo.unmuteTime > Date.now())) mutedPersistentCount++;
        if (pData?.banInfo && (pData.banInfo.unbanTime === Infinity || pData.banInfo.unbanTime > Date.now())) bannedPersistentCount++;
    });
    const activeBordersCount = ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end'].filter(dim => worldBorderManager.getBorderSettings(dim, dependencies)).length; // Pass dependencies
    const logCount = logManager.getLogs().length;
    const reportCount = reportManager.getReports().length;
    const form = new MessageFormData().title(getString('ui.systemInfo.title'))
        .body(
            `${getString('ui.systemInfo.entry.acVersion', { version: dependencies.config.acVersion || notApplicable })}\n` +
            `${getString('ui.systemInfo.entry.mcVersion', { version: mc.game.version })}\n` +
            `${getString('ui.systemInfo.entry.serverTime', { time: new Date().toLocaleTimeString() })}\n` +
            `${getString('ui.systemInfo.label.currentTick')}§r §e${mc.system.currentTick}\n` +
            `${getString('ui.systemInfo.label.worldTime')}§r §e${mc.world.getTime()}\n` +
            `${getString('ui.systemInfo.entry.onlinePlayers', { onlinePlayers: onlinePlayers.length.toString(), maxPlayers: mc.world.maxPlayers.toString() })}\n` +
            `${getString('ui.systemInfo.entry.totalPlayerData', { count: pDataEntries.toString() })}\n` +
            `${getString('ui.systemInfo.entry.watchedPlayers', { count: watchedPlayersCount.toString() })}\n` +
            `${getString('ui.systemInfo.entry.mutedPersistent', { count: mutedPersistentCount.toString() })}\n` +
            `${getString('ui.systemInfo.entry.bannedPersistent', { count: bannedPersistentCount.toString() })}\n` +
            `${getString('ui.systemInfo.entry.activeWorldBorders', { count: activeBordersCount.toString() })}\n` +
            `${getString('ui.systemInfo.entry.logManagerEntries', { count: logCount.toString() })}\n` +
            `${getString('ui.systemInfo.entry.reportManagerEntries', { count: reportCount.toString() })}`
        ).button1(getString('ui.systemInfo.button.backToServerMgmt'));
    form.show(adminPlayer).catch(error => {
        console.error(`[UiManager] Error in showSystemInfo: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showSystemInfo: ${error.message}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showSystemInfo', details: `Error: ${error.message}` }, dependencies);
    }).finally(() => {
        showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies);
    });
};

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) !== permissionLevels.owner) {
        adminPlayer.sendMessage(getString('ui.configEditor.error.ownerOnly'));
        await showAdminPanelMain(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        return;
    }
    const form = new ActionFormData().title(getString('ui.configEditor.title')).body(getString('ui.configEditor.body'));
    const configKeysToDisplay = Object.keys(currentEditableConfig);
    const keyDetailsMapping = [];
    for (const key of configKeysToDisplay) {
        const displayValueFromRuntime = currentRuntimeConfig[key];
        const valueType = typeof displayValueFromRuntime;
        let displayValueString = String(displayValueFromRuntime);
        if (valueType === 'object' && Array.isArray(displayValueFromRuntime)) displayValueString = JSON.stringify(displayValueFromRuntime);
        else if (valueType === 'object') displayValueString = getString('ui.configEditor.button.objectPlaceholder');
        const buttonLabel = displayValueString.length > 30 ? getString('ui.configEditor.button.formatTruncated', { key, type: valueType, value: displayValueString.substring(0, 27) }) : getString('ui.configEditor.button.format', { key, type: valueType, value: displayValueString });
        form.button(buttonLabel);
        keyDetailsMapping.push({ name: key, type: typeof currentEditableConfig[key], value: displayValueFromRuntime });
    }
    form.button(getString('ui.configEditor.button.backToAdminPanel'), 'textures/ui/undo');
    form.show(adminPlayer).then(response => {
        if (response.canceled || response.selection === configKeysToDisplay.length) {
            showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        } else if (response.selection < configKeysToDisplay.length) {
            const selectedKeyDetail = keyDetailsMapping[response.selection];
            if (selectedKeyDetail.type === 'object' && !Array.isArray(selectedKeyDetail.value)) {
                adminPlayer.sendMessage(getString('ui.configEditor.error.nonArrayObject', { keyName: selectedKeyDetail.name }));
                showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
            } else {
                showEditSingleConfigValueForm(adminPlayer, selectedKeyDetail.name, selectedKeyDetail.type, selectedKeyDetail.value, dependencies);
            }
        } else {
            adminPlayer.sendMessage(getString('ui.configEditor.error.invalidSelection'));
            showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
        }
    }).catch(error => {
        depPlayerUtils.debugLog(`Error in showEditConfigForm: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showEditConfigForm', details: `Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.configEditor.error.generic'));
        showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
    });
};

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const modalForm = new ModalFormData().title(getString('ui.configEditor.valueInput.title', { keyName }));
    let originalValueForComparison = currentValue;
    switch (keyType) {
        case 'boolean': modalForm.toggle(getString('ui.configEditor.valueInput.boolean.label', { keyName }), currentValue); break;
        case 'string': modalForm.textField(getString('ui.configEditor.valueInput.string.label', { keyName }), getString('ui.configEditor.valueInput.string.placeholder'), String(currentValue)); break;
        case 'number': modalForm.textField(getString('ui.configEditor.valueInput.number.label', { keyName }), getString('ui.configEditor.valueInput.number.placeholder'), String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) { originalValueForComparison = JSON.stringify(currentValue); modalForm.textField(getString('ui.configEditor.valueInput.array.label', { keyName }), getString('ui.configEditor.valueInput.array.placeholder'), JSON.stringify(currentValue)); }
            else { adminPlayer.sendMessage(getString('ui.configEditor.error.nonArrayObjectEdit', { keyName })); await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies); return; }
            break;
        default: adminPlayer.sendMessage(getString('ui.configEditor.valueInput.error.typeUnknown', { type: keyType, keyName })); await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies); return;
    }
    modalForm.show(adminPlayer).then(response => {
        if (response.canceled) { showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies); return; }
        let newValue = response.formValues[0];
        let failureReason = '';
        switch (keyType) {
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = getString('ui.configEditor.valueInput.error.notANumber'); else newValue = numVal; break;
            case 'object': if (Array.isArray(currentValue)) { try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = getString('ui.configEditor.valueInput.error.notAnArray'); else newValue = parsedArray; } catch (e) { failureReason = getString('ui.configEditor.valueInput.error.jsonFormat', { error: e.message }); } } break;
        }
        if (failureReason) adminPlayer.sendMessage(getString('ui.configEditor.valueInput.error.updateFailed', { keyName, reason: failureReason }));
        else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison) adminPlayer.sendMessage(getString('ui.configEditor.valueInput.noChange', { keyName }));
            else {
                // Use updateConfigValue from dependencies.editableConfig
                const success = dependencies.editableConfig.updateConfigValue(keyName, newValue);
                if (success) { adminPlayer.sendMessage(getString('ui.configEditor.valueInput.success', { keyName, value: (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) })); logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'configUpdate', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}'` }, dependencies); }
                else adminPlayer.sendMessage(getString('ui.configEditor.valueInput.error.updateFailedInternal', { keyName }));
            }
        }
    }).catch(error => {
        depPlayerUtils.debugLog(`Error in showEditSingleConfigValueForm: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showEditSingleConfigValueForm', details: `Key: ${keyName}, Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.configEditor.valueInput.error.generic', { keyName }));
    }).finally(() => {
        showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
    });
}

async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    await _showConfirmationModal(adminPlayer, 'ui.serverManagement.clearChat.confirmTitle', 'ui.serverManagement.clearChat.confirmBody', 'ui.serverManagement.clearChat.confirmToggle', async () => {
        const clearChatExec = dependencies.commandExecutionMap.get('clearchat');
        if (clearChatExec) await clearChatExec(adminPlayer, [], dependencies);
        else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
    }, dependencies).finally(() => showServerManagementForm(adminPlayer, playerDataManager, config, dependencies));
}

async function handleLagClearAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    await _showConfirmationModal(adminPlayer, 'ui.serverManagement.lagClear.confirmTitle', 'ui.serverManagement.lagClear.confirmBody', 'ui.serverManagement.lagClear.confirmToggle', async () => {
        const lagClearExec = dependencies.commandExecutionMap.get('lagclear');
        if (lagClearExec) await lagClearExec(adminPlayer, [], dependencies);
        else adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'lagclear' }));
    }, dependencies).finally(() => showServerManagementForm(adminPlayer, playerDataManager, config, dependencies));
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    const form = new ActionFormData().title(getString('ui.modLogSelect.title')).body(currentFilterName ? getString('ui.modLogSelect.body.filtered', { filterName: currentFilterName }) : getString('ui.modLogSelect.body.all'));
    form.button(getString('ui.modLogSelect.button.banUnban'), 'textures/ui/icon_alert');
    form.button(getString('ui.modLogSelect.button.muteUnmute'), 'textures/ui/speaker_glyph_color');
    form.button(currentFilterName ? getString('ui.modLogSelect.button.clearFilter', { filterName: currentFilterName }) : getString('ui.modLogSelect.button.filterByName'), currentFilterName ? 'textures/ui/cancel' : 'textures/ui/magnifying_glass');
    form.button(getString('ui.modLogSelect.button.backToServerMgmt'), 'textures/ui/undo');
    form.show(adminPlayer).then(response => {
        if (response.canceled) { showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, getString('ui.logViewer.title.banUnban')); break;
            case 1: showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, getString('ui.logViewer.title.muteUnmute')); break;
            case 2:
                if (currentFilterName) { adminPlayer.sendMessage(getString('ui.modLogSelect.filterModal.filterCleared')); showModLogTypeSelectionForm(adminPlayer, dependencies, null); }
                else {
                    new ModalFormData().title(getString('ui.modLogSelect.filterModal.title')).textField(getString('ui.modLogSelect.filterModal.textField.label'), getString('ui.modLogSelect.filterModal.textField.placeholder')).show(adminPlayer).then(modalResponse => {
                        if (modalResponse.canceled) { showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); return; }
                        const newFilter = modalResponse.formValues[0]?.trim();
                        adminPlayer.sendMessage(newFilter ? getString('ui.modLogSelect.filterModal.filterSet', { filterName: newFilter }) : getString('ui.modLogSelect.filterModal.filterBlank'));
                        showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                    }).catch(e => { depPlayerUtils.debugLog(`Error in filter modal: ${e.stack || e}`, adminPlayer.nameTag, dependencies); showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); });
                }
                break;
            case 3: showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    }).catch(e => {
        depPlayerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showModLogTypeSelectionForm', details: `Error: ${e.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.modLogSelect.error.generic'));
        showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    });
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = 'Logs') {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    const form = new MessageFormData().title(filterPlayerName ? getString('ui.logViewer.title.filtered', { logTypeName, filterName: filterPlayerName }) : logTypeName);
    const displayLimit = 50;
    let bodyContent = '';
    try {
        const allLogs = logManager.getLogs(200);
        const filteredLogs = allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).slice(0, displayLimit);
        if (filteredLogs.length === 0) bodyContent = getString('ui.logViewer.noLogs');
        else {
            bodyContent = filteredLogs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                const actor = log.adminName || log.playerName || 'SYSTEM';
                const target = log.targetName || '';
                const duration = log.duration ? getString('ui.actionLogs.logEntry.duration', { duration: log.duration }) : '';
                const reason = log.reason ? getString('ui.actionLogs.logEntry.reason', { reason: log.reason }) : '';
                const details = log.details ? getString('ui.actionLogs.logEntry.details', { details: log.details }) : '';
                return getString('ui.actionLogs.logEntry', { timestamp, actor, actionType: log.actionType, target, duration, reason, details }).replace(/\s+\(\s*\)/g, '');
            }).join('\n');
            if (allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).length > displayLimit) {
                 bodyContent += getString('ui.actionLogs.footer.showingLatest', { count: displayLimit.toString() });
            }
        }
    } catch (e) {
        bodyContent = getString('common.error.genericForm');
        depPlayerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showLogViewerForm.processing', details: `Error: ${e.message}` }, dependencies);
    }
    form.body(bodyContent.trim() || getString('ui.actionLogs.body.empty')).button1(getString('ui.logViewer.button.backToLogSelect'));
    form.show(adminPlayer).catch(e => {
        depPlayerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showLogViewerForm.display', details: `Error: ${e.message}` }, dependencies);
    }).finally(() => showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName));
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, permissionLevels, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const form = new ActionFormData().title(getString('ui.serverManagement.title')).body(getString('ui.serverManagement.body'));
    form.button(getString('ui.serverManagement.button.systemInfo'), 'textures/ui/icon_graph');
    form.button(getString('ui.serverManagement.button.clearChat'), 'textures/ui/speech_bubble_glyph_color');
    form.button(getString('ui.serverManagement.button.lagClear'), 'textures/ui/icon_trash');
    form.button(getString('ui.serverManagement.button.actionLogs'), 'textures/ui/book_writable');
    form.button(getString('ui.serverManagement.button.modLogs'), 'textures/ui/book_edit_default');
    let backButtonIndex = 5;
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) { form.button(getString('ui.serverManagement.button.editConfig'), 'textures/ui/gear'); backButtonIndex = 6; }
    form.button(getString('ui.serverManagement.button.backToAdminPanel'), 'textures/ui/undo');
    form.show(adminPlayer).then(response => {
        if (response.canceled || response.selection === backButtonIndex) { showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: showSystemInfo(adminPlayer, config, playerDataManager, dependencies); break;
            case 1: handleClearChatAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 2: handleLagClearAction(adminPlayer, playerDataManager, config, dependencies); break;
            case 3: showActionLogsForm(adminPlayer, config, playerDataManager, dependencies); break;
            case 4: showModLogTypeSelectionForm(adminPlayer, dependencies, null); break;
            case 5: if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies); break;
        }
    }).catch(error => {
        depPlayerUtils.debugLog(`Error in showServerManagementForm: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showServerManagementForm', details: `Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.serverManagement.error.generic'));
        showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    });
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const form = new MessageFormData().title(getString('ui.actionLogs.title'));
    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = getString('ui.actionLogs.bodyHeader');
    if (logs.length === 0) bodyContent += getString('ui.actionLogs.noLogs');
    else {
        bodyContent += logs.map(logEntry => {
            const timestamp = new Date(logEntry.timestamp).toLocaleString();
            const actor = logEntry.adminName || logEntry.playerName || 'SYSTEM';
            const target = logEntry.targetName || '';
            const durationText = logEntry.duration ? getString('ui.actionLogs.logEntry.duration', { duration: logEntry.duration }) : '';
            const reasonText = logEntry.reason ? getString('ui.actionLogs.logEntry.reason', { reason: logEntry.reason }) : '';
            const detailsText = logEntry.details ? getString('ui.actionLogs.logEntry.details', { details: logEntry.details }) : '';
            return getString('ui.actionLogs.logEntry', { timestamp, actor, actionType: logEntry.actionType, target, duration: durationText, reason: reasonText, details: detailsText }).replace(/\s+\(\s*\)/g, '');
        }).join('\n');
        if (logs.length === logsToDisplayCount && logManager.getLogs().length > logsToDisplayCount) {
            bodyContent += getString('ui.actionLogs.footer.showingLatest', { count: logsToDisplayCount.toString() });
        }
    }
    form.body(bodyContent.trim() || getString('ui.actionLogs.body.empty')).button1(getString('ui.actionLogs.button.backToServerMgmt'));
    form.show(adminPlayer).catch(e => {
        depPlayerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showActionLogsForm', details: `Error: ${e.message}` }, dependencies);
    }).finally(() => showServerManagementForm(adminPlayer, config, playerDataManager, dependencies));
};

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const resetFlagsExecute = dependencies.commandExecutionMap.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }
    const modalForm = new ModalFormData().title(getString('ui.resetFlagsForm.title'));
    modalForm.textField(getString('ui.resetFlagsForm.textField.label'), getString('ui.resetFlagsForm.textField.placeholder'));
    modalForm.toggle(getString('ui.resetFlagsForm.toggle.label'), false);
    modalForm.show(adminPlayer).then(response => {
        if (response.canceled || !response.formValues[1]) adminPlayer.sendMessage(getString('ui.resetFlagsForm.cancelled'));
        else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === '') adminPlayer.sendMessage(getString('ui.resetFlagsForm.error.nameEmpty'));
            else resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        }
    }).catch(error => {
        depPlayerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showResetFlagsForm', details: `Error: ${error.message}` }, dependencies);
        adminPlayer.sendMessage(getString('ui.resetFlagsForm.error.generic'));
    }).finally(() => showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies));
};

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    let body = getString('ui.watchedPlayers.header');
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) { body += getString('ui.watchedPlayers.playerEntry', { playerName: p.nameTag }) + '\n'; watchedCount++; }
    });
    if (watchedCount === 0) body = getString('ui.watchedPlayers.noPlayers');
    const form = new MessageFormData().title(getString('ui.watchedPlayers.title')).body(body.trim()).button1(getString('ui.watchedPlayers.button.ok'));
    form.show(adminPlayer).catch(e => {
        depPlayerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showWatchedPlayersList', details: `Error: ${e.message}` }, dependencies);
    }).finally(() => showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies));
};

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies;
    depPlayerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, adminPlayer.nameTag, dependencies);
    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData().title(getString('ui.detailedFlags.title', { playerName: targetPlayer.nameTag }));
    let body = '';
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) { // Check if more than just totalFlags
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : getString('common.value.notApplicable');
                body += getString('ui.detailedFlags.flagEntry', { flagName: flagKey, count: flagDetail.count.toString(), lastDetectionTime: lastDetectionStr }) + '\n';
            }
        }
    }
    if (!body) body = getString('ui.detailedFlags.noFlags');
    form.body(body.trim()).button1(getString('common.button.back'));
    form.show(adminPlayer).catch(e => {
        depPlayerUtils.debugLog(`Error showing detailed flags: ${e.stack || e}`, adminPlayer.nameTag, dependencies);
        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'error', context: 'uiManager.showDetailedFlagsForm', details: `Target: ${targetPlayer.nameTag}, Error: ${e.message}` }, dependencies);
    }).finally(() => showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies));
};
