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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed

    // Invented strings based on keys
    const title = titleKey.substring(titleKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim(); // "ui.common.confirmAction" -> "Confirm Action"
    let body = bodyKey.substring(bodyKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim(); // "ui.common.confirmBody" -> "Confirm Body"
    if (bodyParams) {
        for (const key in bodyParams) {
            body = body.replace(`{${key}}`, bodyParams[key]);
        }
    }
    const toggleLabel = confirmToggleLabelKey.substring(confirmToggleLabelKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim(); // "ui.common.confirmToggle" -> "Confirm Toggle"
    const actionCancelledMsg = "Action cancelled."; // Based on "ui.common.actionCancelled"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"


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
            logManager.addLog({ context: 'uiManager._showConfirmationModal', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack, titleKey: titleKey }, dependencies); // Type will be 'error'
        }
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}


async function showInspectPlayerForm(adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`[UiManager] Inspect Player form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented strings
    const title = "Inspect Player"; // Based on "ui.inspectPlayerForm.title"
    const textFieldLabel = "Player Name"; // Based on "ui.inspectPlayerForm.textField.label"
    const textFieldPlaceholder = "Enter player name"; // Based on "ui.inspectPlayerForm.textField.placeholder"
    const nameEmptyMsg = "§cName cannot be empty."; // Based on "common.error.nameEmpty"
    const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`; // Based on "common.error.commandModuleNotFound"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"

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
            logManager.addLog({ context: 'uiManager.showInspectPlayerForm', player: adminPlayer?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies);  // Type will be 'error'
        }
        adminPlayer.sendMessage(genericFormErrorMsg);
    }
}

async function showMyStats(player, dependencies) {
    const { playerDataManager, playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`[UiManager] showMyStats for ${player.nameTag}`, dependencies, player.nameTag);

    const pData = playerDataManager.getPlayerData(player.id);
    // Invented string
    let sessionPlaytimeFormatted = "N/A"; // Based on "common.value.notAvailable"

    if (pData && typeof pData.joinTime === 'number' && pData.joinTime > 0) {
        const durationMs = Date.now() - pData.joinTime;
        sessionPlaytimeFormatted = formatSessionDuration(durationMs);
    }

    // Invented strings
    const title = "My Stats"; // Based on "ui.myStats.title"
    const bodyText = (playtime) => `Session Playtime: ${playtime}`; // Based on "ui.myStats.body"
    const locationLabel = (x, y, z) => `Location: X:${x}, Y:${y}, Z:${z}`; // Based on "ui.myStats.labelLocation"
    const dimensionLabel = (dimName) => `Dimension: ${dimName}`; // Based on "ui.myStats.labelDimension"
    const backButton = "Back"; // Based on "common.button.back"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"

    const statsForm = new MessageFormData();
    statsForm.title(title);

    const location = player.location;
    const locX = Math.floor(location.x);
    const locY = Math.floor(location.y);
    const locZ = Math.floor(location.z);
    const dimensionId = player.dimension.id;
    const friendlyDimensionName = formatDimensionName(dimensionId);

    let bodyLines = [];
    bodyLines.push(bodyText(sessionPlaytimeFormatted));
    bodyLines.push("");
    bodyLines.push(locationLabel(locX, locY, locZ));
    bodyLines.push(dimensionLabel(friendlyDimensionName));

    statsForm.body(bodyLines.join('\n'));
    statsForm.button1(backButton);

    try {
        await statsForm.show(player);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    } catch (error) {
        console.error(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.stack || error}`);
        depPlayerUtils.debugLog(`[UiManager] Error in showMyStats for ${player.nameTag}: ${error.message}`, dependencies, player.nameTag);
        if (logManager?.addLog) {
            logManager.addLog({ context: 'uiManager.showMyStats', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, dependencies.playerDataManager, dependencies.config, dependencies);
    }
}

async function showServerRules(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`[UiManager] showServerRules for ${player.nameTag}`, dependencies, player.nameTag);

    // Invented strings
    const noRulesDefinedMsg = "No server rules are currently defined."; // Based on "ui.serverRules.noRulesDefined"
    const title = "Server Rules"; // Based on "ui.serverRules.title"
    const backButton = "Back"; // Based on "common.button.back"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"

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
            logManager.addLog({ context: 'uiManager.showServerRules', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

async function showHelpAndLinks(player, dependencies) {
    const { config, playerUtils: depPlayerUtils, playerDataManager, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`[UiManager] showHelpAndLinks for ${player.nameTag}`, dependencies, player.nameTag);

    // Invented strings
    const title = "Helpful Links"; // Based on "ui.helpfulLinks.title"
    const body = "Select a link to view its URL:"; // Based on "ui.helpfulLinks.body"
    const noLinksMsg = "No helpful links are currently configured."; // Based on "ui.helpfulLinks.noLinks"
    const backButton = "Back"; // Based on "common.button.back"
    const linkMessageFormat = (linkTitle, linkUrl) => `§e${linkTitle}: §b${linkUrl}`; // Based on "ui.helpfulLinks.linkMessageFormat"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"

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
            logManager.addLog({ context: 'uiManager.showHelpAndLinks', player: player?.nameTag, errorMessage: error.message, stack: error.stack }, dependencies); // Type will be 'error'
        }
        player.sendMessage(genericFormErrorMsg);
        await showNormalUserPanelMain(player, playerDataManager, config, dependencies);
    }
}

showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies; // getString removed
    depPlayerUtils.debugLog(`[UiManager] showPlayerActionsForm for ${targetPlayer.nameTag} by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented strings
    const title = (targetName) => `Player Actions: ${targetName}`; // Based on "ui.playerActions.title"
    const body = (flags, watched) => `Flags: ${flags}\nWatched: ${watched ? 'Yes' : 'No'}`; // Based on "ui.playerActions.body"
    const unfreezeButtonText = "Unfreeze Player"; // Based on "ui.playerActions.button.unfreeze"
    const freezeButtonText = "Freeze Player"; // Based on "ui.playerActions.button.freeze"
    const unmutePermanentButtonText = "Unmute (Permanent)"; // Based on "ui.playerActions.button.unmutePermanent"
    const unmuteTimedButtonText = (time) => `Unmute (Expires: ${time})`; // Based on "ui.playerActions.button.unmuteTimed"
    const muteButtonText = "Mute Player"; // Based on "ui.playerActions.button.mute"
    const viewFlagsButton = "View Flags"; // Based on "ui.playerActions.button.viewFlags"
    const viewInventoryButton = "View Inventory"; // Based on "ui.playerActions.button.viewInventory"
    const teleportToButton = "Teleport To Player"; // Based on "ui.playerActions.button.teleportTo"
    const teleportHereButton = "Teleport Player Here"; // Based on "ui.playerActions.button.teleportHere"
    const kickButton = "Kick Player"; // Based on "ui.playerActions.button.kick"
    const banButton = "Ban Player"; // Based on "ui.playerActions.button.ban"
    const resetFlagsButton = "Reset Flags"; // Based on "ui.playerActions.button.resetFlags"
    const clearInventoryButton = "Clear Inventory"; // Based on "ui.playerActions.button.clearInventory"
    const backToListButton = "Back to Player List"; // Based on "ui.playerActions.button.backToList"


    const form = new ActionFormData();
    form.title(title(targetPlayer.nameTag));

    const targetPData = playerDataManager.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;
    form.body(body(flagCount, isWatched));

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
            // logManager is already in scope from the outer function
            // Invented strings for this inner function
            const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`;
            let modalTitle = titleKey.substring(titleKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim();
            if (titleParams) {
                for (const key in titleParams) {
                    modalTitle = modalTitle.replace(`{${key}}`, titleParams[key]);
                }
            }
            const genericFormErrorMsg = "An error occurred while displaying this form.";

            const cmdExec = dependencies.commandExecutionMap?.get(commandName);
            if (!cmdExec) {
                adminPlayer.sendMessage(commandNotFoundMsg(commandName));
                return false;
            }
            const modal = new ModalFormData().title(modalTitle);
            fields.forEach(field => {
                // Invent strings for field labels and placeholders
                const label = field.labelKey.substring(field.labelKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim();
                const placeholder = field.placeholderKey.substring(field.placeholderKey.lastIndexOf('.') + 1).replace(/([A-Z])/g, ' $1').trim();
                if (field.type === 'textField') modal.textField(label, placeholder);
                if (field.type === 'toggle') modal.toggle(label, field.defaultValue);
            });
            try {
                const modalResponse = await modal.show(adminPlayer);
                if (modalResponse.canceled) {
                    let cancelledMsg = `${commandName} action cancelled.`; // Generic cancellation
                    if (commandName === 'kick') cancelledMsg = "Kick action cancelled."; // Based on "ui.playerActions.kick.cancelled"
                    else if (commandName === 'ban') cancelledMsg = "Ban action cancelled."; // Based on "ui.playerActions.ban.cancelled"
                    else if (commandName === 'mute') cancelledMsg = "Mute action cancelled."; // Based on "ui.playerActions.mute.cancelled"

                    adminPlayer.sendMessage(cancelledMsg);
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
                adminPlayer.sendMessage(genericFormErrorMsg);
                return false; // Error occurred
            }
        };

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true;

        // Invented strings for messages within the switch cases
        const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`;
        const teleportToPlayerSuccessMsg = (name) => `§aTeleported to ${name}.`;
        const teleportPlayerToAdminSuccessMsg = (name) => `§aTeleported ${name} to you.`;
        const teleportPlayerToAdminNotifyTargetMsg = "§aYou have been teleported.";
        const teleportErrorMsg = (errMsg) => `§cTeleport error: ${errMsg}`;
        const clearInventorySuccessMsg = (name) => `§aCleared ${name}'s inventory.`;
        const clearInventoryFailMsg = (name) => `§cFailed to clear ${name}'s inventory.`;
        const invalidSelectionMsg = "§cInvalid selection.";


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
            case 4: // Kick
                await showModalAndExecute('kick', "ui.playerActions.kick.title", // Title key will be converted by showModalAndExecute
                    [{ type: 'textField', labelKey: "ui.playerActions.kick.reasonPrompt", placeholderKey: "ui.playerActions.kick.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1]], // playerName, reason
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 5: // Freeze
                const freezeExec = dependencies.commandExecutionMap?.get('freeze');
                if (freezeExec) await freezeExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(commandNotFoundMsg("freeze"));
                break;
            case 6: // Mute/Unmute
                if (isTargetMuted) {
                    const unmuteExec = dependencies.commandExecutionMap?.get('unmute');
                    if (unmuteExec) await unmuteExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                    else adminPlayer.sendMessage(commandNotFoundMsg("unmute"));
                } else {
                    await showModalAndExecute('mute', "ui.playerActions.mute.title",
                        [{ type: 'textField', labelKey: "ui.playerActions.mute.durationPrompt", placeholderKey: "ui.playerActions.mute.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.mute.reasonPrompt", placeholderKey: "ui.playerActions.mute.reasonPlaceholder" }],
                        (vals) => [vals[0], vals[1], vals[2]], // playerName, duration, reason
                        { targetPlayerName: targetPlayer.nameTag }
                    );
                }
                break;
            case 7: // Ban
                await showModalAndExecute('ban', "ui.playerActions.ban.title",
                    [{ type: 'textField', labelKey: "ui.playerActions.ban.durationPrompt", placeholderKey: "ui.playerActions.ban.durationPlaceholder" }, { type: 'textField', labelKey: "ui.playerActions.ban.reasonPrompt", placeholderKey: "ui.playerActions.ban.reasonPlaceholder" }],
                    (vals) => [vals[0], vals[1], vals[2]], // playerName, duration, reason
                    { targetPlayerName: targetPlayer.nameTag }
                );
                shouldReturnToPlayerList = true;
                break;
            case 8: // Reset Flags
                const resetFlagsExec = dependencies.commandExecutionMap?.get('resetflags');
                if (resetFlagsExec) await resetFlagsExec(adminPlayer, [targetPlayer.nameTag], dependencies);
                else adminPlayer.sendMessage(commandNotFoundMsg("resetflags"));
                break;
            case 9: // Clear Inventory
                await _showConfirmationModal(
                    adminPlayer,
                    "ui.playerActions.clearInventory.confirmTitle", // Will be "Clear Inventory Confirm Title"
                    "ui.playerActions.clearInventory.confirmBody",   // Will be "Clear Inventory Confirm Body"
                    "ui.playerActions.clearInventory.confirmToggle", // Will be "Clear Inventory Confirm Toggle"
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
            case 10: // Back to Player List
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
        adminPlayer.sendMessage("An error occurred in Player Actions form."); // Based on "ui.playerActions.error.generic"
        await showOnlinePlayersList(adminPlayer, playerDataManager, dependencies);
    }
};

showOnlinePlayersList = async function (adminPlayer, playerDataManager, dependencies) {
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: showOnlinePlayersList requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);
    const onlinePlayers = mc.world.getAllPlayers();

    // Invented Strings
    const title = (count) => `Online Players (${count})`; // Based on "ui.onlinePlayers.title"
    const noPlayersBody = "No players online."; // Based on "ui.onlinePlayers.noPlayers"
    const body = "Select a player to manage:"; // Based on "ui.onlinePlayers.body"
    const playerEntryButton = (name, flags) => `${name} (Flags: ${flags})`; // Based on "ui.onlinePlayers.button.playerEntry"
    const backToAdminPanelButton = "Back to Admin Panel"; // Based on "ui.button.backToAdminPanel"
    const playerNotFoundMsg = (name) => `§cPlayer '${name}' not found or is not online.`; // Based on "common.error.playerNotFoundOnline"
    const genericErrorMsg = "An error occurred in Online Players list."; // Based on "ui.onlinePlayers.error.generic"


    const form = new ActionFormData();
    form.title(title(onlinePlayers.length));

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
    const { playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Admin Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);

    // Invented Strings
    const adminPanelTitle = "AntiCheat Admin Panel"; // Based on "ui.adminPanel.title"
    const adminPanelBody = (name) => `Welcome, ${name}. Select an action:`; // Based on "ui.adminPanel.body"
    const viewPlayersButton = "View Online Players"; // Based on "ui.adminPanel.button.viewPlayers"
    const inspectPlayerButton = "Inspect Player (Text)"; // Based on "ui.adminPanel.button.inspectPlayerText"
    const resetFlagsButton = "Reset Player Flags (Text)"; // Based on "ui.adminPanel.button.resetFlagsText"
    const listWatchedButton = "List Watched Players"; // Based on "ui.adminPanel.button.listWatched"
    const serverManagementButton = "Server Management"; // Based on "ui.adminPanel.button.serverManagement"
    const editConfigButton = "Edit System Config (Owner)"; // Based on "ui.adminPanel.button.editConfig"
    const closeButton = "Close"; // Based on "common.button.close"
    const genericErrorMsg = "An error occurred opening the admin panel."; // Based on "ui.adminPanel.error.generic"

    const form = new ActionFormData();
    const userPermLevel = depPlayerUtils.getPlayerPermissionLevel(player, dependencies);

    try {
        if (userPermLevel <= permissionLevels.admin) {
            form.title(adminPanelTitle);
            form.body(adminPanelBody(player.nameTag));
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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Normal User Panel Main requested by ${player.nameTag}`, dependencies, player.nameTag);

    // Invented Strings
    const normalPanelTitle = "User Panel"; // Based on "ui.normalPanel.title"
    const normalPanelBody = (name) => `Welcome, ${name}!`; // Based on "ui.normalPanel.body"
    const myStatsButton = "My Stats"; // Based on "ui.normalPanel.button.myStats"
    const serverRulesButton = "Server Rules"; // Based on "ui.normalPanel.button.serverRules"
    const helpLinksButton = "Helpful Links"; // Based on "ui.normalPanel.button.helpLinks"
    const closeButton = "Close"; // Based on "common.button.close"
    const genericFormErrorMsg = "An error occurred while displaying this form."; // Based on "common.error.genericForm"


    const form = new ActionFormData();
    form.title(normalPanelTitle);
    form.body(normalPanelBody(player.nameTag));
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
    const { playerUtils: depPlayerUtils, logManager, reportManager, worldBorderManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: System Info requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const notApplicable = "N/A"; // Based on "common.value.notApplicable"
    const title = "System Information"; // Based on "ui.systemInfo.title"
    const acVersionText = (ver) => `AntiCheat Version: ${ver}`; // Based on "ui.systemInfo.entry.acVersion"
    const mcVersionText = (ver) => `Minecraft Version: ${ver}`; // Based on "ui.systemInfo.entry.mcVersion"
    const serverTimeText = (time) => `Server Time: ${time}`; // Based on "ui.systemInfo.entry.serverTime"
    const currentTickLabel = "Current Server Tick:"; // Based on "ui.systemInfo.label.currentTick"
    const worldTimeLabel = "World Time (ticks):"; // Based on "ui.systemInfo.label.worldTime"
    const onlinePlayersText = (online, max) => `Online Players: ${online}/${max}`; // Based on "ui.systemInfo.entry.onlinePlayers"
    const totalPlayerDataText = (count) => `Total Player Data Entries: ${count}`; // Based on "ui.systemInfo.entry.totalPlayerData"
    const watchedPlayersText = (count) => `Watched Players (Online): ${count}`; // Based on "ui.systemInfo.entry.watchedPlayers"
    const mutedPersistentText = (count) => `Persistent Mutes (Online): ${count}`; // Based on "ui.systemInfo.entry.mutedPersistent"
    const bannedPersistentText = (count) => `Persistent Bans (Online): ${count}`; // Based on "ui.systemInfo.entry.bannedPersistent"
    const activeBordersText = (count) => `Active World Borders: ${count}`; // Based on "ui.systemInfo.entry.activeWorldBorders"
    const logEntriesText = (count) => `Log Manager Entries: ${count}`; // Based on "ui.systemInfo.entry.logManagerEntries"
    const reportEntriesText = (count) => `Report Manager Entries: ${count}`; // Based on "ui.systemInfo.entry.reportManagerEntries"
    const backButtonText = "Back to Server Management"; // Based on "ui.systemInfo.button.backToServerMgmt"

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
            `${acVersionText(dependencies.config.acVersion || "N/A")}\n` +
            `${mcVersionText(mc.game.version)}\n` +
            `${serverTimeText(new Date().toLocaleTimeString())}\n` +
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
    // currentEditableConfig is globalEditableConfigValues passed from showAdminPanelMain
    const { playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig, permissionLevels } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Edit Config Form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const ownerOnlyError = "§cOnly the server owner can edit the configuration."; // Based on "ui.configEditor.error.ownerOnly"
    const title = "Edit Configuration"; // Based on "ui.configEditor.title"
    const body = "Select a configuration value to edit. Current values are shown."; // Based on "ui.configEditor.body"
    const objectPlaceholder = "[Object - Click to Edit Array]"; // Based on "ui.configEditor.button.objectPlaceholder"
    const buttonFormat = (key, type, value) => `${key} (${type}): ${value}`; // Based on "ui.configEditor.button.format"
    const buttonFormatTruncated = (key, type, value) => `${key} (${type}): ${value}...`; // Based on "ui.configEditor.button.formatTruncated"
    const backButtonText = "Back to Server Management"; // Based on "ui.configEditor.button.backToAdminPanel" (assuming it goes to server mgmt)
    const nonArrayObjectError = (key) => `§cCannot edit non-array object '${key}' via this UI.`; // Based on "ui.configEditor.error.nonArrayObject"
    const invalidSelectionError = "§cInvalid selection."; // Based on "ui.configEditor.error.invalidSelection"
    const genericError = "§cAn error occurred while editing the configuration."; // Based on "ui.configEditor.error.generic"

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
    // currentValue is now from dependencies.config, passed by showEditConfigForm
    const { playerDataManager, playerUtils: depPlayerUtils, logManager, config: currentRuntimeConfig } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: showEditSingleConfigValueForm for key ${keyName} (type: ${keyType}) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const title = (kName) => `Edit Value: ${kName}`; // Based on "ui.configEditor.valueInput.title"
    const booleanLabel = (kName) => `Set ${kName} (true/false):`; // Based on "ui.configEditor.valueInput.boolean.label"
    const stringLabel = (kName) => `New value for ${kName} (string):`; // Based on "ui.configEditor.valueInput.string.label"
    const stringPlaceholder = "Enter string value"; // Based on "ui.configEditor.valueInput.string.placeholder"
    const numberLabel = (kName) => `New value for ${kName} (number):`; // Based on "ui.configEditor.valueInput.number.label"
    const numberPlaceholder = "Enter numeric value"; // Based on "ui.configEditor.valueInput.number.placeholder"
    const arrayLabel = (kName) => `New value for ${kName} (JSON array, e.g., ["a","b"]):`; // Based on "ui.configEditor.valueInput.array.label"
    const arrayPlaceholder = `Enter JSON array, e.g. ["item1", "item2"] or [1, 2, 3]`; // Based on "ui.configEditor.valueInput.array.placeholder"
    const nonArrayObjectEditError = (kName) => `§cCannot edit complex object '${kName}' directly. Arrays of simple types are supported.`; // Based on "ui.configEditor.error.nonArrayObjectEdit"
    const typeUnknownError = (type, kName) => `§cUnknown configuration type '${type}' for key '${kName}'. Cannot edit.`; // Based on "ui.configEditor.valueInput.error.typeUnknown"
    const notANumberError = "Invalid input: Not a number."; // Based on "ui.configEditor.valueInput.error.notANumber"
    const notAnArrayError = "Invalid input: Not a valid JSON array."; // Based on "ui.configEditor.valueInput.error.notAnArray"
    const jsonFormatError = (errMsg) => `Invalid JSON array format: ${errMsg}`; // Based on "ui.configEditor.valueInput.error.jsonFormat"
    const updateFailedMsg = (kName, reason) => `§cUpdate for '${kName}' failed: ${reason}`; // Based on "ui.configEditor.valueInput.error.updateFailed"
    const noChangeMsg = (kName) => `§eNo change made to '${kName}'. Value is the same.`; // Based on "ui.configEditor.valueInput.noChange"
    const successMsg = (kName, val) => `§aSuccessfully updated '${kName}' to: ${val}`; // Based on "ui.configEditor.valueInput.success"
    const updateFailedInternalMsg = (kName) => `§cInternal error updating '${kName}'. Check console.`; // Based on "ui.configEditor.valueInput.error.updateFailedInternal"
    const genericErrorMsg = (kName) => `§cAn error occurred while editing '${kName}'.`; // Based on "ui.configEditor.valueInput.error.generic"


    const modalForm = new ModalFormData();
    modalForm.title(title(keyName));
    let originalValueForComparison = currentValue;

    switch (keyType) {
        case 'boolean': modalForm.toggle(booleanLabel(keyName), currentValue); break;
        case 'string': modalForm.textField(stringLabel(keyName), stringPlaceholder, String(currentValue)); break;
        case 'number': modalForm.textField(numberLabel(keyName), numberPlaceholder, String(currentValue)); break;
        case 'object':
            if (Array.isArray(currentValue)) {
                originalValueForComparison = JSON.stringify(currentValue);
                modalForm.textField(arrayLabel(keyName), arrayPlaceholder, JSON.stringify(currentValue));
            } else {
                adminPlayer.sendMessage(nonArrayObjectEditError(keyName));
                await showEditConfigForm(adminPlayer, playerDataManager, globalEditableConfigValues, dependencies);
                return;
            }
            break;
        default:
            adminPlayer.sendMessage(typeUnknownError(keyType, keyName));
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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Clear Chat Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented string for command not found
    const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`;

    try {
        await _showConfirmationModal(
            adminPlayer,
            "ui.serverManagement.clearChat.confirmTitle", // Title will be "Clear Chat Confirm Title"
            "ui.serverManagement.clearChat.confirmBody",   // Body will be "Clear Chat Confirm Body"
            "ui.serverManagement.clearChat.confirmToggle", // Toggle will be "Clear Chat Confirm Toggle"
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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Lag Clear Action requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented string for command not found
    const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`;

    try {
        await _showConfirmationModal(
            adminPlayer,
            "ui.serverManagement.lagClear.confirmTitle", // Title will be "Lag Clear Confirm Title"
            "ui.serverManagement.lagClear.confirmBody",   // Body will be "Lag Clear Confirm Body"
            "ui.serverManagement.lagClear.confirmToggle", // Toggle will be "Lag Clear Confirm Toggle"
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
    const { playerDataManager, config, playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed

    // Invented Strings
    const title = "Moderation Log Type Selection"; // Based on "ui.modLogSelect.title"
    const bodyFiltered = (filter) => `Currently filtering by: ${filter}. Select log type or clear filter.`; // Based on "ui.modLogSelect.body.filtered"
    const bodyAll = "Select a log type to view, or filter by player name."; // Based on "ui.modLogSelect.body.all"
    const banUnbanButton = "Ban/Unban Logs"; // Based on "ui.modLogSelect.button.banUnban"
    const muteUnmuteButton = "Mute/Unmute Logs"; // Based on "ui.modLogSelect.button.muteUnmute"
    const clearFilterButton = (filter) => `Clear Filter: ${filter}`; // Based on "ui.modLogSelect.button.clearFilter"
    const filterByNameButton = "Filter by Player Name"; // Based on "ui.modLogSelect.button.filterByName"
    const backToServerMgmtButton = "Back to Server Management"; // Based on "ui.modLogSelect.button.backToServerMgmt"
    const banUnbanLogTitle = "Ban/Unban Logs"; // Based on "ui.logViewer.title.banUnban"
    const muteUnmuteLogTitle = "Mute/Unmute Logs"; // Based on "ui.logViewer.title.muteUnmute"
    const filterClearedMsg = "§aFilter cleared. Showing all relevant logs."; // Based on "ui.modLogSelect.filterModal.filterCleared"
    const filterModalTitle = "Filter Logs by Player Name"; // Based on "ui.modLogSelect.filterModal.title"
    const filterModalLabel = "Player Name:"; // Based on "ui.modLogSelect.filterModal.textField.label"
    const filterModalPlaceholder = "Enter player name (case-insensitive)"; // Based on "ui.modLogSelect.filterModal.textField.placeholder"
    const filterSetMsg = (filter) => `§aFilter set to: ${filter}`; // Based on "ui.modLogSelect.filterModal.filterSet"
    const filterBlankMsg = "§eFilter not set (blank input). Showing all relevant logs."; // Based on "ui.modLogSelect.filterModal.filterBlank"
    const genericErrorMsg = "§cAn error occurred in log selection."; // Based on "ui.modLogSelect.error.generic"

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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed

    // Invented Strings
    const titleFiltered = (logType, filterName) => `${logType} (Filtered by: ${filterName})`; // Based on "ui.logViewer.title.filtered"
    const noLogsMsg = "No logs found matching your criteria."; // Based on "ui.logViewer.noLogs"
    const logEntryFormat = (log) => { // Based on "ui.actionLogs.logEntry" and its sub-keys
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actor = log.adminName || log.playerName || 'SYSTEM';
        const target = log.targetName || '';
        const duration = log.duration ? ` (Duration: ${log.duration})` : "";
        const reason = log.reason ? ` (Reason: ${log.reason})` : "";
        const details = log.details ? ` (Details: ${log.details})` : "";
        return `[${timestamp}] ${actor} -> ${log.actionType} ${target}${duration}${reason}${details}`.replace(/\s+\(\s*\)/g, '');
    };
    const footerShowingLatest = (count) => `\n(Showing latest ${count} logs. More may exist.)`; // Based on "ui.actionLogs.footer.showingLatest"
    const genericFormError = "An error occurred while retrieving logs."; // Based on "common.error.genericForm"
    const bodyEmptyMsg = "No logs to display."; // Based on "ui.actionLogs.body.empty"
    const backButtonText = "Back to Log Selection"; // Based on "ui.logViewer.button.backToLogSelect"

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
    const { playerUtils: depPlayerUtils, logManager, permissionLevels } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: showServerManagementForm requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const title = "Server Management"; // Based on "ui.serverManagement.title"
    const body = "Manage server settings and view information."; // Based on "ui.serverManagement.body"
    const systemInfoButton = "System Information"; // Based on "ui.serverManagement.button.systemInfo"
    const clearChatButton = "Clear Global Chat"; // Based on "ui.serverManagement.button.clearChat"
    const lagClearButton = "Clear Ground Items (Lag Clear)"; // Based on "ui.serverManagement.button.lagClear"
    const actionLogsButton = "View All Action Logs"; // Based on "ui.serverManagement.button.actionLogs"
    const modLogsButton = "View Moderation Logs (Ban/Mute)"; // Based on "ui.serverManagement.button.modLogs"
    const editConfigButton = "Edit System Config (Owner)"; // Based on "ui.serverManagement.button.editConfig"
    const backToAdminPanelButton = "Back to Admin Panel"; // Based on "ui.serverManagement.button.backToAdminPanel"
    const genericErrorMsg = "§cAn error occurred in Server Management."; // Based on "ui.serverManagement.error.generic"

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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Action Logs (All) requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const title = "All Action Logs"; // Based on "ui.actionLogs.title"
    const bodyHeader = "Displaying recent server actions:\n"; // Based on "ui.actionLogs.bodyHeader"
    const noLogsMsg = "No action logs found."; // Based on "ui.actionLogs.noLogs"
    const logEntryFormat = (log) => { // Based on "ui.actionLogs.logEntry" and its sub-keys
        const timestamp = new Date(log.timestamp).toLocaleString();
        const actor = log.adminName || log.playerName || 'SYSTEM';
        const target = log.targetName || '';
        // Invented prefixes/suffixes for duration, reason, details
        const durationText = log.duration ? ` (Duration: ${log.duration})` : "";
        const reasonText = log.reason ? ` (Reason: ${log.reason})` : "";
        const detailsText = log.details ? ` (Details: ${log.details})` : "";
        return `[${timestamp}] ${actor} -> ${log.actionType} ${target}${durationText}${reasonText}${detailsText}`.replace(/\s+\(\s*\)/g, '');
    };
    const footerShowingLatest = (count) => `\n(Showing latest ${count} logs. More may exist.)`; // Based on "ui.actionLogs.footer.showingLatest"
    const bodyEmptyMsg = "No logs to display."; // Based on "ui.actionLogs.body.empty"
    const backButtonText = "Back to Server Management"; // Based on "ui.actionLogs.button.backToServerMgmt"

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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Reset Flags form requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const commandNotFoundMsg = (moduleName) => `§cError: Command module '${moduleName}' not found or failed to load.`;
    const title = "Reset Player Flags"; // Based on "ui.resetFlagsForm.title"
    const textFieldLabel = "Player Name:"; // Based on "ui.resetFlagsForm.textField.label"
    const textFieldPlaceholder = "Enter player name to reset flags"; // Based on "ui.resetFlagsForm.textField.placeholder"
    const toggleLabel = "Confirm Reset Flags"; // Based on "ui.resetFlagsForm.toggle.label"
    const cancelledMsg = "Reset flags action cancelled."; // Based on "ui.resetFlagsForm.cancelled"
    const nameEmptyMsg = "§cPlayer name cannot be empty."; // Based on "ui.resetFlagsForm.error.nameEmpty"
    const genericErrorMsg = "§cAn error occurred while resetting flags."; // Based on "ui.resetFlagsForm.error.generic"

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
        if (response.canceled || !response.formValues[1]) { // Assuming toggle is index 1
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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Watched Players list requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const header = "Currently Watched Players:\n"; // Based on "ui.watchedPlayers.header"
    const playerEntry = (name) => `- ${name}`; // Based on "ui.watchedPlayers.playerEntry"
    const noPlayersWatched = "No players are currently being watched."; // Based on "ui.watchedPlayers.noPlayers"
    const title = "Watched Players List"; // Based on "ui.watchedPlayers.title"
    const okButton = "OK"; // Based on "ui.watchedPlayers.button.ok"

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
    const { playerUtils: depPlayerUtils, logManager } = dependencies; // getString removed
    depPlayerUtils.debugLog(`UI: Detailed flags for ${targetPlayer.nameTag} requested by ${adminPlayer.nameTag}`, dependencies, adminPlayer.nameTag);

    // Invented Strings
    const title = (name) => `Detailed Flags for ${name}`; // Based on "ui.detailedFlags.title"
    const notApplicable = "N/A"; // Based on "common.value.notApplicable"
    const flagEntryText = (type, count, time) => `- ${type}: ${count} (Last: ${time})`; // Based on "ui.detailedFlags.flagEntry"
    const noFlagsMsg = "No specific flags recorded for this player."; // Based on "ui.detailedFlags.noFlags"
    const backButton = "Back"; // Based on "common.button.back"

    const pData = playerDataManager.getPlayerData(targetPlayer.id);
    const form = new MessageFormData();
    form.title(title(targetPlayer.nameTag));

    let body = "";
    if (pData && pData.flags && Object.keys(pData.flags).length > 1) { // Greater than 1 to exclude 'totalFlags' if it's the only one
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
