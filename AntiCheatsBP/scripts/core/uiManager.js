/**
 * @file AntiCheatsBP/scripts/core/uiManager.js
 * @description Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * @version 1.1.1
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
// permissionLevels, getString will be from dependencies.
// updateConfigValue remains a direct import.
import { updateConfigValue } from '../config.js'; // editableConfigValues also from config.js if needed by showEditConfigForm's logic for what's editable
import { formatSessionDuration } from '../utils/playerUtils.js';
import { permissionLevels as importedPermissionLevels, editableConfigValues as globalEditableConfigValues } from '../config.js'; // For showEditConfigForm editable keys, and permissionLevels access

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
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies;

    const modalForm = new ModalFormData();
    modalForm.title(getString(titleKey));
    modalForm.body(getString(bodyKey, bodyParams));
    modalForm.toggle(getString(confirmToggleLabelKey), false);

    try {
        const response = await modalForm.show(adminPlayer);

        if (response.canceled || !response.formValues[0]) {
            adminPlayer.sendMessage(getString("ui.common.actionCancelled"));
            depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) cancelled by ${adminPlayer.nameTag}.`, dependencies, adminPlayer.nameTag);
            return;
        }

        await onConfirmCallback();
        depPlayerUtils.debugLog(`[UiManager] Confirmation modal (title: ${titleKey}) confirmed by ${adminPlayer.nameTag}. Action executed.`, dependencies, adminPlayer.nameTag);

    } catch (error) {
        console.error(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in _showConfirmationModal (title: ${titleKey}) for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager._showConfirmationModal', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack, titleKey: titleKey }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("common.error.genericForm"));
    }
}


async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] Inspect Player form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.inspectPlayerForm.title"));
    modalForm.textField(getString("ui.inspectPlayerForm.textField.label"), getString("ui.inspectPlayerForm.textField.placeholder"));

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            depPlayerUtils.debugLog(`[UiManager] Inspect Player (Text) form cancelled by ${adminPlayer.nameTag}. Reason: ${response.cancelationReason}`, dependencies, adminPlayer.nameTag);
            return;
        }
        const targetPlayerName = response.formValues[0];
        if (!targetPlayerName || targetPlayerName.trim() === "") {
            adminPlayer.sendMessage(getString("common.error.nameEmpty"));
            await showInspectPlayerForm(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const commandExecute = dependencies.commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
        } else {
            adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "inspect" }));
        }
    } catch (error) {
        console.error(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showInspectPlayerForm for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showInspectPlayerForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);  // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("common.error.genericForm"));
    }
}

async function showMyStats(player, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, getString, logManager } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showMyStats for ${player.nameTag}`, dependencies, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);
    let sessionPlaytimeFormatted = getString("common.value.notAvailable");

    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        const durationMs = Date.now() - pData.joinTime;
        sessionPlaytimeFormatted = formatSessionDuration(durationMs);
    }

    const statsForm = new MessageFormData();
    statsForm.title(getString("ui.myStats.title"));

    const location = player.location;
    const locX = Math.floor(location.x);
    const locY = Math.floor(location.y);
    const locZ = Math.floor(location.z);
    const dimensionId = player.dimension.id;
    const friendlyDimensionName = formatDimensionName(dimensionId);

    let bodyLines = [];
    bodyLines.push(getString("ui.myStats.body", { sessionPlaytime: sessionPlaytimeFormatted }));
    bodyLines.push("");
    bodyLines.push(getString("ui.myStats.labelLocation", { x: locX, y: locY, z: locZ }));
    bodyLines.push(getString("ui.myStats.labelDimension", { dimensionName: friendlyDimensionName }));

    statsForm.body(bodyLines.join('\n'));
    statsForm.button1(getString("common.button.back"));

    try {
        await statsForm.show(player);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showMyStats', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(getString("common.error.genericForm")); // Corrected from adminPlayer
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    }
}

async function showServerRules(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, getString, logManager } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showServerRules for ${player.nameTag}`, dependencies, player.nameTag);

    const rules = config.serverRules;
    let rulesBody = "";

    if (Array.isArray(rules) && rules.length > 0) {
        rulesBody = rules.join("\n");
    } else {
        rulesBody = getString("ui.serverRules.noRulesDefined");
    }

    const rulesForm = new MessageFormData();
    rulesForm.title(getString("ui.serverRules.title"));
    rulesForm.body(rulesBody);
    rulesForm.button1(getString("common.button.back"));

    try {
        await rulesForm.show(player);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showServerRules for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showServerRules', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(getString("common.error.genericForm")); // Corrected from adminPlayer
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

async function showHelpAndLinks(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, getString, logManager } = dependencies;
    depPlayerUtils.debugLog(`[UiManager] showHelpAndLinks for ${player.nameTag}`, dependencies, player.nameTag);

    const form = new ActionFormData();
    form.title(getString("ui.helpfulLinks.title"));
    form.body(getString("ui.helpfulLinks.body"));

    const helpLinksArray = config.helpLinks;

    if (!Array.isArray(helpLinksArray) || helpLinksArray.length === 0) {
        const msgForm = new MessageFormData();
        msgForm.title(getString("ui.helpfulLinks.title"));
        msgForm.body(getString("ui.helpfulLinks.noLinks"));
        msgForm.button1(getString("common.button.back")); // Corrected key

        try {
            await msgForm.show(player);
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        } catch (error) {
            console.error(`[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
            depPlayerUtils.debugLog(`[UiManager] Error showing noLinks form in showHelpAndLinks for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
            if (logManager?.addLog) { // Added logManager
                logManager.addLog({ context: 'uiManager.showHelpAndLinks.noLinksForm', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
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
    form.button(getString("common.button.back")); // Corrected key

    try {
        const response = await form.show(player);

        if (response.canceled || response.selection === helpLinksArray.length) {
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
            return;
        }

        const selectedLink = helpLinksArray[response.selection];
        if (selectedLink && typeof selectedLink.url === 'string' && typeof selectedLink.title === 'string') {
            player.sendMessage(getString("ui.helpfulLinks.linkMessageFormat", { title: selectedLink.title, url: selectedLink.url }));
            await showHelpAndLinks(player, dependencies);
        } else {
            depPlayerUtils.debugLog(`[UiManager] Error: Invalid link item at index ${response.selection} in showHelpAndLinks.`, dependencies, player.nameTag);
            player.sendMessage(getString("common.error.genericForm"));
            await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
        }

    } catch (error) {
        console.error(`[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showHelpAndLinks for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showHelpAndLinks', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(getString("common.error.genericForm"));
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager, getString, permissionLevels } = dependencies; // logManager already here
    depPlayerUtils.debugLog(`[UiManager] showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const form = new ActionFormData();
    form.title(getString("ui.playerActions.title", { targetPlayerName: targetPlayer.nameTag }));

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body(getString("ui.playerActions.body", { flagCount: flagCount, isWatched: isWatched }));

    const frozenTag = "frozen";
    const isTargetFrozen = targetPlayer.hasTag(frozenTag);
    const freezeButtonText = getString(isTargetFrozen ? "ui.playerActions.button.unfreeze" : "ui.playerActions.button.freeze");
    const freezeButtonIcon = isTargetFrozen ? "textures/ui/icon_unlocked" : "textures/ui/icon_locked";

    const muteInfo = playerDataManager.getMuteInfo?.(targetPlayer, dependencies);
    const isTargetMuted = muteInfo !== null;
    let muteButtonText;
    if (isTargetMuted) {
        muteButtonText = muteInfo.unmuteTime === Infinity ?
            getString("ui.playerActions.button.unmutePermanent") :
            getString("ui.playerActions.button.unmuteTimed", { time: new Date(muteInfo.unmuteTime).toLocaleTimeString() });
    } else {
        muteButtonText = getString("ui.playerActions.button.mute");
    }
    const muteButtonIcon = isTargetMuted ? "textures/ui/speaker_off_light" : "textures/ui/speaker_on_light";

    form.button(getString("ui.playerActions.button.viewFlags"), "textures/ui/magnifying_glass");
    form.button(getString("ui.playerActions.button.viewInventory"), "textures/ui/chest_icon.png");
    form.button(getString("ui.playerActions.button.teleportTo"), "textures/ui/portal");
    form.button(getString("ui.playerActions.button.teleportHere"), "textures/ui/arrow_down_thin");
    form.button(getString("ui.playerActions.button.kick"), "textures/ui/icon_hammer");
    form.button(freezeButtonText, freezeButtonIcon);
    form.button(muteButtonText, muteButtonIcon);
    form.button(getString("ui.playerActions.button.ban"), "textures/ui/icon_resource_pack");
    form.button(getString("ui.playerActions.button.resetFlags"), "textures/ui/refresh");
    form.button(getString("ui.playerActions.button.clearInventory"), "textures/ui/icon_trash");
    form.button(getString("ui.playerActions.button.backToList"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
            return;
        }

        const showModalAndExecute = async (commandName, titleKey, fields, argsTransform = (vals) => vals, titleParams = {}) => {
            // logManager is already in scope from the outer function
            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: commandName }));
                return false;
            }
            const modal = new ModalFormData().title(getString(titleKey, titleParams));
            fields.forEach(field => {
                if (field.type === 'textField') modal.textField(getString(field.labelKey), getString(field.placeholderKey));
                if (field.type === 'toggle') modal.toggle(getString(field.labelKey), field.defaultValue);
            });
            try {
                const modalResponse = await modal.show(adminPlayer);
                if (modalResponse.canceled) {
                    let cancelledKey = `ui.playerActions.${commandName}.cancelled`;
                    if (commandName === 'kick') cancelledKey = "ui.playerActions.kick.cancelled";
                    else if (commandName === 'ban') cancelledKey = "ui.playerActions.ban.cancelled";
                    else if (commandName === 'mute') cancelledKey = "ui.playerActions.mute.cancelled";

                    adminPlayer.sendMessage(getString(cancelledKey));
                    return true; // Still true as the sequence was user-cancelled, not an error
                }
                await cmdExec(adminPlayer, argsTransform([targetPlayer.nameTag, ...modalResponse.formValues]), dependencies);
                return true;
            } catch (modalError) {
                console.error(`[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.stack || modalError}`);
                depPlayerUtils.debugLog(`[UiManager] Error in showModalAndExecute (command: ${commandName}) for ${adminPlayer.nameTag}: ${modalError.message}`, dependencies, adminPlayer.nameTag);
                if (logManager?.addLog) {
                     logManager.addLog({ context: `uiManager.showModalAndExecute.${commandName}`, player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: modalError.message, stack: modalError.stack }, dependencies); // Type will be 'error'
                }
                adminPlayer.sendMessage(getString("common.error.genericForm"));
                return false; // Error occurred
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
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "invsee" }));
                break;
            case 2:
                try {
                    adminPlayer.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.toPlayerSuccess", { targetPlayerName: targetPlayer.nameTag }));
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportSelfToPlayer', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported to ${targetPlayer.nameTag}` }, dependencies); // Type will be 'info'
                    }
                } catch (e) {
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.error", { errorMessage: e.message }));
                    if (logManager?.addLog) {
                        logManager.addLog({ context: 'uiManager.teleportToPlayer', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
                    }
                }
                break;
            case 3:
                try {
                    targetPlayer.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.playerToAdminSuccess", { targetPlayerName: targetPlayer.nameTag }));
                    targetPlayer.sendMessage(getString("ui.playerActions.teleport.playerToAdminNotifyTarget"));
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'teleportPlayerToAdmin', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} teleported ${targetPlayer.nameTag} to them.` }, dependencies); // Type will be 'info'
                    }
                } catch (e) {
                    adminPlayer.sendMessage(getString("ui.playerActions.teleport.error", { errorMessage: e.message }));
                     if (logManager?.addLog) {
                        logManager.addLog({ context: 'uiManager.teleportPlayerHere', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
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
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "freeze" }));
                break;
            case 6:
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "unmute" }));
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
                else adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "resetflags" }));
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
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.success", { targetPlayerName: targetPlayer.nameTag }));
                            if (logManager?.addLog) { // logManager was depLogManager before
                                logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'clearInventory', targetName: targetPlayer.nameTag, details: `Admin ${adminPlayer.nameTag} cleared inventory for ${targetPlayer.nameTag}` }, dependencies); // Type will be 'info'
                            }
                        } else {
                            adminPlayer.sendMessage(getString("ui.playerActions.clearInventory.fail", { targetPlayerName: targetPlayer.nameTag }));
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
                adminPlayer.sendMessage(getString("ui.adminPanel.error.invalidSelection"));
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
            logManager.addLog({ context: 'uiManager.showPlayerActionsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.playerActions.error.generic"));
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString and logManager
    depPlayerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    const form = new ActionFormData();
    form.title(getString("ui.onlinePlayers.title", { playerCount: onlinePlayers.length }));

    if (onlinePlayers.length === 0) {
        form.body(getString("ui.onlinePlayers.noPlayers"));
    } else {
        form.body(getString("ui.onlinePlayers.body"));
    }

    const playerMappings = onlinePlayers.map(p => {
        const targetPData = playerDataManager.getPlayerData(p.id);
        const flagCount = targetPData?.flags?.totalFlags ?? 0;
        form.button(getString("ui.onlinePlayers.button.playerEntry", { playerName: p.nameTag, flagCount: flagCount }), "textures/ui/icon_steve");
        return p.id;
    });

    form.button(getString("ui.button.backToAdminPanel"), "textures/ui/undo");

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
            adminPlayer.sendMessage(getString("common.error.playerNotFoundOnline", { playerName: "Selected Player" }));
            await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showOnlinePlayersList: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showOnlinePlayersList', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.onlinePlayers.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
    }
};

showAdminPanelMain = async function (player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager, permissionLevels } = dependencies; // Added getString, logManager, permissionLevels
    depPlayerUtils.debugLog(`UI: Admin Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);
    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player, dependencies); // Added dependencies

    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title(getString("ui.adminPanel.title"));
            form.body(getString("ui.adminPanel.body", { playerName: player.nameTag }));
            form.button(getString("ui.adminPanel.button.viewPlayers"), "textures/ui/icon_multiplayer");
            form.button(getString("ui.adminPanel.button.inspectPlayerText"), "textures/ui/spyglass");
            form.button(getString("ui.adminPanel.button.resetFlagsText"), "textures/ui/refresh");
            form.button(getString("ui.adminPanel.button.listWatched"), "textures/ui/magnifying_glass");
            form.button(getString("ui.adminPanel.button.serverManagement"), "textures/ui/icon_graph");

            let closeButtonIndex = 5;
            if (userPermLevel === permissionLevels.owner) {
                form.button(getString("ui.adminPanel.button.editConfig"), "textures/ui/gear");
                closeButtonIndex = 6;
            }
            form.button(getString("common.button.close"), "textures/ui/cancel");

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
                        // Pass globalEditableConfigValues for the list of keys, but dependencies.config for current values
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
            logManager.addLog({ context: 'uiManager.showAdminPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(getString("ui.adminPanel.error.generic"));
    }
};

async function showNormalUserPanelMain(player, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.normalPanel.title"));
    form.body(getString("ui.normalPanel.body", { playerName: player.nameTag }));
    form.button(getString("ui.normalPanel.button.myStats"), "textures/ui/icon_multiplayer");
    form.button(getString("ui.normalPanel.button.serverRules"), "textures/ui/book_glyph");
    form.button(getString("ui.normalPanel.button.helpLinks"), "textures/ui/lightbulb_idea");
    form.button(getString("common.button.close"), "textures/ui/cancel");

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
            logManager.addLog({ context: 'uiManager.showNormalUserPanelMain', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(getString("common.error.genericForm"));
    }
}

export { showAdminPanelMain };

showSystemInfo = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, reportManager, getString, worldBorderManager } = dependencies;
    depPlayerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    const onlinePlayers = mc.world.getAllPlayers();
    const pDataEntries = playerDataManager.getAllPlayerDataEntries ? playerDataManager.getAllPlayerDataEntries().length : getString("common.value.notApplicable");
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
    const logCount = logManager?.getLogs ? logManager.getLogs().length : getString("common.value.notApplicable");
    const reportCount = reportManager?.getReports ? reportManager.getReports().length : getString("common.value.notApplicable");

    const form = new MessageFormData()
        .title(getString("ui.systemInfo.title"))
        .body(
            `${getString("ui.systemInfo.entry.acVersion", { version: dependencies.config.acVersion || "N/A" })}\n` + // Use dependencies.config
            `${getString("ui.systemInfo.entry.mcVersion", { version: mc.game.version })}\n` +
            `${getString("ui.systemInfo.entry.serverTime", { time: new Date().toLocaleTimeString() })}\n` +
            `${getString("ui.systemInfo.label.currentTick")}§r §e${mc.system.currentTick}\n` +
            `${getString("ui.systemInfo.label.worldTime")}§r §e${mc.world.getTime()}\n` +
            `${getString("ui.systemInfo.entry.onlinePlayers", { onlineCount: onlinePlayers.length, maxCount: mc.world.maxPlayers })}\n` +
            `${getString("ui.systemInfo.entry.totalPlayerData", { count: pDataEntries })}\n` +
            `${getString("ui.systemInfo.entry.watchedPlayers", { count: watchedPlayersCount })}\n` +
            `${getString("ui.systemInfo.entry.mutedPersistent", { count: mutedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.bannedPersistent", { count: bannedPersistentCount })}\n` +
            `${getString("ui.systemInfo.entry.activeWorldBorders", { count: activeBordersCount })}\n` +
            `${getString("ui.systemInfo.entry.logManagerEntries", { count: logCount })}\n` +
            `${getString("ui.systemInfo.entry.reportManagerEntries", { count: reportCount })}`
        )
        .button1(getString("ui.systemInfo.button.backToServerMgmt"));
    try {
        await form.show(adminPlayer);
    } catch (error) {
        console.error(`[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showSystemInfo for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showSystemInfo', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, dependencies.config, dependencies); // Use dependencies.config
};

showEditConfigForm = async function (adminPlayer, playerDataManager, currentEditableConfig, dependencies) {
    // currentEditableConfig is globalEditableConfigValues passed from showAdminPanelMain
    const { playerUtils: depPlayerUtils, getString, logManager, config: currentRuntimeConfig, permissionLevels } = dependencies;
    depPlayerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) !== permissionLevels.owner) { // Pass dependencies
        adminPlayer.sendMessage(getString("ui.configEditor.error.ownerOnly"));
        await showAdminPanelMain(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
        return;
    }

    const form = new ActionFormData();
    form.title(getString("ui.configEditor.title"));
    form.body(getString("ui.configEditor.body"));

    const configKeysToDisplay = Object.keys(currentEditableConfig); // These are the keys the owner *can* edit
    const keyDetailsMapping = [];

    for (const key of configKeysToDisplay) {
        const displayValueFromRuntime = currentRuntimeConfig[key]; // Get current value from runtime config (dependencies.config)
        const valueType = typeof displayValueFromRuntime;
        let displayValueString = String(displayValueFromRuntime);

        if (valueType === 'object' && Array.isArray(displayValueFromRuntime)) {
            displayValueString = JSON.stringify(displayValueFromRuntime);
        } else if (valueType === 'object') {
            displayValueString = getString("ui.configEditor.button.objectPlaceholder");
        }

        const buttonLabel = displayValueString.length > 30 ?
            getString("ui.configEditor.button.formatTruncated", { key: key, type: valueType, value: displayValueString.substring(0, 27) }) :
            getString("ui.configEditor.button.format", { key: key, type: valueType, value: displayValueString });
        form.button(buttonLabel);
        keyDetailsMapping.push({ name: key, type: typeof currentEditableConfig[key], value: displayValueFromRuntime }); // Store runtime value for editing
    }
    form.button(getString("ui.configEditor.button.backToAdminPanel"), "textures/ui/undo");

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
                adminPlayer.sendMessage(getString("ui.configEditor.error.nonArrayObject", { keyName: selectedKeyDetail.name }));
                await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
            } else {
                // Pass the current runtime value for editing
                await showEditSingleConfigValueForm(adminPlayer, selectedKeyDetail.name, selectedKeyDetail.type, selectedKeyDetail.value, dependencies);
            }
        } else {
            adminPlayer.sendMessage(getString("ui.configEditor.error.invalidSelection"));
            await showEditConfigForm(adminPlayer, playerDataManager, currentEditableConfig, dependencies);
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditConfigForm: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showEditConfigForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.configEditor.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, currentRuntimeConfig, dependencies);
    }
};

async function showEditSingleConfigValueForm(adminPlayer, keyName, keyType, currentValue, dependencies) {
    // currentValue is now from dependencies.config, passed by showEditConfigForm
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, getString, config: currentRuntimeConfig } = dependencies;
    depPlayerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const modalForm = new ModalFormData();
    modalForm.title(getString("ui.configEditor.valueInput.title", { keyName: keyName }));
    let originalValueForComparison = currentValue; // This is the runtime value

    switch (keyType) {
        case 'boolean': modalForm.toggle(getString("ui.configEditor.valueInput.boolean.label", { keyName: keyName }), currentValue); break;
        case 'string': modalForm.textField(getString("ui.configEditor.valueInput.string.label", { keyName: keyName }), getString("ui.configEditor.valueInput.string.placeholder"), String(currentValue)); break;
        case 'number': modalForm.textField(getString("ui.configEditor.valueInput.number.label", { keyName: keyName }), getString("ui.configEditor.valueInput.number.placeholder"), String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField(getString("ui.configEditor.valueInput.array.label", { keyName: keyName }), getString("ui.configEditor.valueInput.array.placeholder"), JSON.stringify(currentValue));
            } else {
                adminPlayer.sendMessage(getString("ui.configEditor.error.nonArrayObjectEdit", { keyName: keyName }));
                await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies); // Back to main edit form
                return;
            }
            break;
        default:
            adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.typeUnknown", { type: keyType, keyName: keyName }));
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
            case 'number': const numVal = Number(newValue); if (isNaN(numVal)) failureReason = getString("ui.configEditor.valueInput.error.notANumber"); else newValue = numVal; break;
            case 'object':
                if (Array.isArray(currentValue)) {
                    try { const parsedArray = JSON.parse(newValue); if (!Array.isArray(parsedArray)) failureReason = getString("ui.configEditor.valueInput.error.notAnArray"); else newValue = parsedArray; }
                    catch (e) { failureReason = getString("ui.configEditor.valueInput.error.jsonFormat", { errorMessage: e.message }); }
                }
                break;
        }

        if (failureReason) {
            adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailed", { keyName: keyName, failureReason: failureReason }));
        } else {
            const valueToCompare = (keyType === 'object' && Array.isArray(newValue)) ? JSON.stringify(newValue) : newValue;
            if (valueToCompare === originalValueForComparison) {
                 adminPlayer.sendMessage(getString("ui.configEditor.valueInput.noChange", { keyName: keyName }));
            } else {
                // updateConfigValue modifies the global editableConfigValues, which is then reflected in dependencies.config by config.js's design
                const success = updateConfigValue(keyName, newValue);
                if (success) {
                    adminPlayer.sendMessage(getString("ui.configEditor.valueInput.success", { keyName: keyName, newValue: (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) }));
                    if (logManager?.addLog) {
                        logManager.addLog({ adminName: adminPlayer.nameTag, actionType: 'configUpdate', targetName: keyName, details: `Value changed from '${originalValueForComparison}' to '${typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}'` }, dependencies); // Type will be 'info'
                    }
                } else {
                    adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.updateFailedInternal", { keyName: keyName }));
                }
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showEditSingleConfigValueForm for ${keyName}: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showEditSingleConfigValueForm', player: adminPlayer?.nameTag, keyName: keyName, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.configEditor.valueInput.error.generic", { keyName: keyName }));
    }
    await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
}


async function handleClearChatAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

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
                    adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "clearchat" }));
                }
            },
            dependencies
        );
    } catch (error) {
        console.error(`[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in handleClearChatAction for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.handleClearChatAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

async function handleLagClearAction(adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

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
                    adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "lagclear" }));
                }
            },
            dependencies
        );
    } catch (error) {
         console.error(`[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in handleLagClearAction for ${adminPlayer.nameTag}: ${error.message}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.handleLagClearAction', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
    }
    await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
}

showModLogTypeSelectionForm = async function (adminPlayer, dependencies, currentFilterName = null) {
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager, getString } = dependencies; // Added getString, logManager
    const form = new ActionFormData();
    form.title(getString("ui.modLogSelect.title"));
    form.body(currentFilterName ? getString("ui.modLogSelect.body.filtered", { filterName: currentFilterName }) : getString("ui.modLogSelect.body.all"));
    form.button(getString("ui.modLogSelect.button.banUnban"), "textures/ui/icon_alert");
    form.button(getString("ui.modLogSelect.button.muteUnmute"), "textures/ui/speaker_glyph_color");
    form.button(currentFilterName ? getString("ui.modLogSelect.button.clearFilter", { filterName: currentFilterName }) : getString("ui.modLogSelect.button.filterByName"), currentFilterName ? "textures/ui/cancel" : "textures/ui/magnifying_glass");
    form.button(getString("ui.modLogSelect.button.backToServerMgmt"), "textures/ui/undo");

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) { await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); return; }
        switch (response.selection) {
            case 0: await showLogViewerForm(adminPlayer, dependencies, ['ban', 'unban'], currentFilterName, getString("ui.logViewer.title.banUnban")); break;
            case 1: await showLogViewerForm(adminPlayer, dependencies, ['mute', 'unmute'], currentFilterName, getString("ui.logViewer.title.muteUnmute")); break;
            case 2:
                if (currentFilterName) {
                    adminPlayer.sendMessage(getString("ui.modLogSelect.filterModal.filterCleared"));
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, null);
                } else {
                    const modalFilter = new ModalFormData().title(getString("ui.modLogSelect.filterModal.title"));
                    modalFilter.textField(getString("ui.modLogSelect.filterModal.textField.label"), getString("ui.modLogSelect.filterModal.textField.placeholder"));
                    const modalResponse = await modalFilter.show(adminPlayer);
                    if (modalResponse.canceled) { await showModLogTypeSelectionForm(adminPlayer, dependencies, currentFilterName); return; }
                    const newFilter = modalResponse.formValues[0]?.trim();
                    adminPlayer.sendMessage(newFilter ? getString("ui.modLogSelect.filterModal.filterSet", { filterName: newFilter }) : getString("ui.modLogSelect.filterModal.filterBlank"));
                    await showModLogTypeSelectionForm(adminPlayer, dependencies, newFilter || null);
                }
                break;
            case 3: await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies); break;
        }
    } catch (e) {
        depPlayerUtils.debugLog(`Error in showModLogTypeSelectionForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showModLogTypeSelectionForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.modLogSelect.error.generic"));
        await showServerManagementForm(adminPlayer, playerDataManager, config, dependencies);
    }
};

async function showLogViewerForm(adminPlayer, dependencies, logActionTypesArray, filterPlayerName = null, logTypeName = "Logs") {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies; // Added getString, logManager
    const form = new MessageFormData();
    form.title(filterPlayerName ? getString("ui.logViewer.title.filtered", { logTypeName: logTypeName, filterName: filterPlayerName }) : logTypeName);

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
            bodyContent = getString("ui.logViewer.noLogs");
        } else {
            bodyContent = filteredLogs.map(log => {
                const timestampStr = new Date(log.timestamp).toLocaleString();
                return getString("ui.actionLogs.logEntry", {
                    timestamp: timestampStr,
                    adminNameOrPlayer: log.adminName || log.playerName || 'SYSTEM',
                    actionType: log.actionType,
                    targetNameOrEmpty: log.targetName || '',
                    duration: log.duration ? `${getString("ui.actionLogs.logEntry.durationPrefix")}${log.duration}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    reason: log.reason ? `${getString("ui.actionLogs.logEntry.reasonPrefix")}${log.reason}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                    details: log.details ? `${getString("ui.actionLogs.logEntry.detailsPrefix")}${log.details}${getString("ui.actionLogs.logEntry.suffix")}` : ""
                }).replace(/\s+\(\s*\)/g, '');
            }).join("\n");

            const totalMatchingLogs = allLogs.filter(logEntry => logActionTypesArray.includes(logEntry.actionType) && (!filterPlayerName || ((logEntry.targetName && logEntry.targetName.toLowerCase().includes(filterPlayerName.toLowerCase())) || (logEntry.adminName && logEntry.adminName.toLowerCase().includes(filterPlayerName.toLowerCase()))))).length;
            if (totalMatchingLogs > displayLimit) {
                 bodyContent += "\n" + getString("ui.actionLogs.footer.showingLatest", { count: displayLimit });
            }
        }
    } catch (e) {
        bodyContent = getString("common.error.genericForm");
        depPlayerUtils.debugLog(`Error in showLogViewerForm log processing: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) { // Ensure logManager is used here
            logManager.addLog({ context: 'uiManager.showLogViewerForm.processing', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
    }

    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty"));
    form.button1(getString("ui.logViewer.button.backToLogSelect"));
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error displaying LogViewerForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showLogViewerForm.display', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
    }
    await showModLogTypeSelectionForm(adminPlayer, dependencies, filterPlayerName);
}

showServerManagementForm = async function (adminPlayer, playerDataManager, config, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager, permissionLevels } = dependencies; // Added getString, logManager, permissionLevels
    depPlayerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const form = new ActionFormData();
    form.title(getString("ui.serverManagement.title"));
    form.body(getString("ui.serverManagement.body"));
    form.button(getString("ui.serverManagement.button.systemInfo"), "textures/ui/icon_graph");
    form.button(getString("ui.serverManagement.button.clearChat"), "textures/ui/speech_bubble_glyph_color");
    form.button(getString("ui.serverManagement.button.lagClear"), "textures/ui/icon_trash");
    form.button(getString("ui.serverManagement.button.actionLogs"), "textures/ui/book_writable");
    form.button(getString("ui.serverManagement.button.modLogs"), "textures/ui/book_edit_default");

    let backButtonIndex = 5;
    if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) { // Pass dependencies
        form.button(getString("ui.serverManagement.button.editConfig"), "textures/ui/gear");
        backButtonIndex = 6;
    }
    form.button(getString("ui.serverManagement.button.backToAdminPanel"), "textures/ui/undo");

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
                if (depPlayerUtils.getPlayerPermissionLevel(adminPlayer, dependencies) === permissionLevels.owner) { // Pass dependencies
                    await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
                }
                break;
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showServerManagementForm for ${adminPlayer.nameTag}: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showServerManagementForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.serverManagement.error.generic"));
        await showAdminPanelMain(adminPlayer, playerDataManager, config, dependencies);
    }
};

showActionLogsForm = async function (adminPlayer, config, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager, getString } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const form = new MessageFormData();
    form.title(getString("ui.actionLogs.title"));

    const logsToDisplayCount = 50;
    const logs = logManager.getLogs(logsToDisplayCount);
    let bodyContent = getString("ui.actionLogs.bodyHeader") + "\n";

    if (logs.length === 0) {
        bodyContent += getString("ui.actionLogs.noLogs");
    } else {
        bodyContent += logs.map(logEntry => {
            const timestampStr = new Date(logEntry.timestamp).toLocaleString();
            return getString("ui.actionLogs.logEntry", {
                timestamp: timestampStr,
                adminNameOrPlayer: logEntry.adminName || logEntry.playerName || 'SYSTEM',
                actionType: logEntry.actionType,
                targetNameOrEmpty: logEntry.targetName || '',
                duration: logEntry.duration ? `${getString("ui.actionLogs.logEntry.durationPrefix")}${logEntry.duration}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                reason: logEntry.reason ? `${getString("ui.actionLogs.logEntry.reasonPrefix")}${logEntry.reason}${getString("ui.actionLogs.logEntry.suffix")}` : "",
                details: logEntry.details ? `${getString("ui.actionLogs.logEntry.detailsPrefix")}${logEntry.details}${getString("ui.actionLogs.logEntry.suffix")}` : ""
            }).replace(/\s+\(\s*\)/g, '');
        }).join("\n");

        if (logs.length === logsToDisplayCount && logManager.getLogs().length > logsToDisplayCount) {
            bodyContent += "\n" + getString("ui.actionLogs.footer.showingLatest", { count: logsToDisplayCount });
        }
    }
    form.body(bodyContent.trim() || getString("ui.actionLogs.body.empty"));
    form.button1(getString("ui.actionLogs.button.backToServerMgmt"));
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error in showActionLogsForm: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) { // Ensure logManager is used here
            logManager.addLog({ context: 'uiManager.showActionLogsForm', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
    }
    await showServerManagementForm(adminPlayer, config, playerDataManager, dependencies);
};

showResetFlagsForm = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const resetFlagsExecute = dependencies.commandExecutionMap?.get('resetflags');
    if (!resetFlagsExecute) {
        adminPlayer.sendMessage(getString("common.error.commandModuleNotFound", { moduleName: "resetflags" }));
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        return;
    }

    const modalForm = new ModalFormData().title(getString("ui.resetFlagsForm.title"));
    modalForm.textField(getString("ui.resetFlagsForm.textField.label"), getString("ui.resetFlagsForm.textField.placeholder"));
    modalForm.toggle(getString("ui.resetFlagsForm.toggle.label"), false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues[1]) {
            adminPlayer.sendMessage(getString("ui.resetFlagsForm.cancelled"));
        } else {
            const targetPlayerName = response.formValues[0];
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.nameEmpty"));
            } else {
                await resetFlagsExecute(adminPlayer, [targetPlayerName.trim()], dependencies);
            }
        }
    } catch (error) {
        depPlayerUtils.debugLog(`Error in showResetFlagsForm: ${error.stack || error}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showResetFlagsForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(getString("ui.resetFlagsForm.error.generic"));
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showWatchedPlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    let body = getString("ui.watchedPlayers.header") + "\n";
    let watchedCount = 0;
    mc.world.getAllPlayers().forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            body += getString("ui.watchedPlayers.playerEntry", { playerName: p.nameTag }) + "\n";
            watchedCount++;
        }
    });

    if (watchedCount === 0) {
        body = getString("ui.watchedPlayers.noPlayers");
    }

    const form = new MessageFormData()
        .title(getString("ui.watchedPlayers.title"))
        .body(body.trim())
        .button1(getString("ui.watchedPlayers.button.ok"));
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error showing watched players list: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) { // Ensure logManager is used here
            logManager.addLog({ context: 'uiManager.showWatchedPlayersList', player: adminPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
    }
    await showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
};

showDetailedFlagsForm = async function(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, getString, logManager } = dependencies; // Added getString, logManager
    depPlayerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title(getString("ui.detailedFlags.title", { targetPlayerName: targetPlayer.nameTag }));

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) {
        for (const flagKey in pData.flags) {
            if (flagKey !== 'totalFlags' && pData.flags[flagKey].count > 0) {
                const flagDetail = pData.flags[flagKey];
                const lastDetectionStr = flagDetail.lastDetectionTime ? new Date(flagDetail.lastDetectionTime).toLocaleString() : getString("common.value.notApplicable");
                body += getString("ui.detailedFlags.flagEntry", { flagType: flagKey, count: flagDetail.count, timestamp: lastDetectionStr }) + "\n";
            }
        }
    }
    if (!body) {
        body = getString("ui.detailedFlags.noFlags");
    }
    form.body(body.trim());
    form.button1(getString("common.button.back"));
    try {
        await form.show(adminPlayer);
    } catch (e) {
        depPlayerUtils.debugLog(`Error showing detailed flags: ${e.stack || e}`, dependencies, adminPlayer.nameTag);
        if (logManager?.addLog) { // Ensure logManager is used here
            logManager.addLog({ context: 'uiManager.showDetailedFlagsForm', player: adminPlayer?.nameTag, targetPlayer: targetPlayer?.nameTag, errorMessage: e.message, stack: e.stack }, dependencies); // Type will be 'error'
        }
    }
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
};
