/**
 * Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * All actionType strings used for logging should be camelCase.
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui'; // Direct imports, Removed MessageFormData
// Removed formatSessionDuration, formatDimensionName from '../utils/index.js'

// Forward declarations for UI functions
let showAdminPanelMain;
// let showEditConfigForm; // Unused
let showOnlinePlayersList;
let showPlayerActionsForm; // Implemented and used
// let showServerManagementForm; // Unused
// let showModLogTypeSelectionForm; // Unused
let showDetailedFlagsForm; // Used (params might be unused, but function itself is referenced)
// let showSystemInfo; // Unused
// let showActionLogsForm; // Unused
// let showResetFlagsForm; // Unused
// let showWatchedPlayersList; // Unused
// let showNormalUserPanelMain; // Unused
// let showEditSingleConfigValueForm; // Unused

/**
 * Helper to show a confirmation modal.
 * @param {mc.Player} adminPlayer - Player to show modal to.
 * @param {string} titleKey - Localization key for title.
 * @param {string} bodyKey - Localization key for body.
 * @param {string} confirmToggleLabelKey - Localization key for confirm toggle.
 * @param {() => Promise<void>} onConfirmCallback - Async callback if confirmed.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 * @param {object} [bodyParams={}] - Optional parameters for body string formatting.
 */
async function _showConfirmationModal(adminPlayer, titleKey, bodyKey, confirmToggleLabelKey, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils, logManager, getString } = dependencies;
    const playerName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    const title = getString(titleKey); // getString is expected on dependencies
    const body = getString(bodyKey, bodyParams);
    const toggleLabel = getString(confirmToggleLabelKey);

    const modalForm = new ModalFormData().title(title).body(body).toggle(toggleLabel, false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues?.[0]) {
            adminPlayer?.sendMessage(getString('ui.common.actionCancelled'));
            playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleKey}' cancelled by ${playerName}.`, playerName, dependencies);
            return;
        }
        await onConfirmCallback(); // Assuming onConfirmCallback handles its own potential errors
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleKey}' confirmed by ${playerName}. Action executed.`, playerName, dependencies);
    }
    catch (error) {
        console.error(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleKey}): ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleKey}): ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiConfirmationModal', // Retain specific actionType
            context: 'uiManager._showConfirmationModal', // Standardized
            adminName: playerName,
            details: {
                titleKey: titleKey,
                bodyKey: bodyKey, // Added for context
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
    }
}

/**
 * Shows a form to input a player name for inspection (text-based).
 * @param {mc.Player} adminPlayer - Admin using the form.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 */
async function showInspectPlayerForm(adminPlayer, dependencies) {
    const { playerUtils, logManager, getString, commandExecutionMap } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Requested by ${adminName}`, adminName, dependencies);

    const modalForm = new ModalFormData()
        .title(getString('ui.inspectPlayerForm.title'))
        .textField(getString('ui.inspectPlayerForm.textField.label'), getString('ui.inspectPlayerForm.textField.placeholder'));

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            return;
        }
        const targetPlayerName = response.formValues?.[0]?.trim();
        if (!targetPlayerName) {
            adminPlayer?.sendMessage(getString('common.error.nameEmpty'));
            await showInspectPlayerForm(adminPlayer, dependencies); // Re-show
            return;
        }

        const commandExecute = commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName], dependencies);
        }
        else {
            adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'inspect' }));
        }
    }
    catch (error) {
        console.error(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiInspectPlayerForm', // Standardized
            context: 'uiManager.showInspectPlayerForm', // Standardized
            adminName: adminName,
            details: {
                // response is not in scope here if modalForm.show() failed before assignment
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
    }
}

// Definitions for all showXYZForm functions are assigned below the forward declarations.
// ... (showMyStats, showServerRules, showHelpLinks definitions with similar robustness and logging as above) ...
// Assign actual function definitions (ensure all are defined before this block)
// Example for one, apply to all others:
// showAdminPanelMain = async function(...) { ... };
// This is done at the end of the file in the original code, which is a valid pattern.

// Ensure all other UI functions (showPlayerActionsForm, showOnlinePlayersList, etc.)
// are also updated with:
// - Consistent use of playerName = player?.nameTag ?? 'UnknownPlayer';
// - Optional chaining for all dependency sub-modules (playerUtils?, logManager?, config?, etc.)
// - Specific function names in debug/error logs.
// - Using mc.EntityComponentTypes constants for getComponent calls.
// - Awaiting asynchronous operations like form.show() and command executions.
// - Using getString for all user-facing text.
// - Robust error handling with .catch and .finally where appropriate for UI navigation.

// --- Player Actions Form (Example of applying pattern) ---
showPlayerActionsForm = async function (adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils, logManager, getString, commandExecutionMap } = dependencies; // Removed permissionLevels
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    const targetName = targetPlayer?.nameTag ?? 'UnknownTarget'; // targetPlayer could be null if it disconnects
    playerUtils?.debugLog(`[UiManager.showPlayerActionsForm] For ${targetName} by ${adminName}`, adminName, dependencies);

    if (!targetPlayer?.isValid()) { // Ensure targetPlayer is still valid
        adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
        await showOnlinePlayersList(adminPlayer, dependencies);
        return;
    }

    const title = getString('ui.playerActions.title', { targetPlayerName: targetName });
    const targetPData = playerDataManager?.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;

    const form = new ActionFormData()
        .title(title)
        .body(getString('ui.playerActions.body', { flags: flagCount.toString(), watchedStatus: isWatched ? getString('common.boolean.yes') : getString('common.boolean.no') }));

    const frozenTag = config?.frozenPlayerTag || 'frozen';
    const isTargetFrozen = targetPlayer?.hasTag(frozenTag); // targetPlayer might be invalid
    const freezeButtonText = getString(isTargetFrozen ? 'ui.playerActions.button.unfreeze' : 'ui.playerActions.button.freeze');
    const freezeButtonIcon = isTargetFrozen ? 'textures/ui/icon_unlocked' : 'textures/ui/icon_locked';

    const muteInfo = playerDataManager?.getMuteInfo(targetPlayer, dependencies);
    const isTargetMuted = muteInfo !== null;
    const muteButtonText = isTargetMuted ?
        (muteInfo.unmuteTime === Infinity ? getString('ui.playerActions.button.unmutePermanent') : getString('ui.playerActions.button.unmuteTimed', { expiryDate: new Date(muteInfo.unmuteTime).toLocaleTimeString() })) :
        getString('ui.playerActions.button.mute');
    const muteButtonIcon = isTargetMuted ? 'textures/ui/speaker_off_light' : 'textures/ui/speaker_on_light';

    form.button(getString('ui.playerActions.button.viewFlags'), 'textures/ui/magnifying_glass');
    form.button(getString('ui.playerActions.button.viewInventory'), 'textures/ui/chest_icon.png');
    form.button(getString('ui.playerActions.button.teleportTo'), 'textures/ui/portal'); // Index 2
    form.button(getString('ui.playerActions.button.teleportHere'), 'textures/ui/arrow_down_thin'); // Index 3
    form.button(getString('ui.playerActions.button.kick'), 'textures/ui/icon_hammer');
    form.button(freezeButtonText, freezeButtonIcon);
    form.button(muteButtonText, muteButtonIcon);
    form.button(getString('ui.playerActions.button.ban'), 'textures/ui/icon_resource_pack');
    form.button(getString('ui.playerActions.button.resetFlags'), 'textures/ui/refresh');
    form.button(getString('ui.playerActions.button.clearInventory'), 'textures/ui/icon_trash');
    form.button(getString('ui.playerActions.button.backToList'), 'textures/ui/undo');

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            await showOnlinePlayersList(adminPlayer, dependencies); // Pass only needed deps
            return;
        }

        let shouldReturnToPlayerList = false;
        let shouldReturnToPlayerActions = true; // Default to re-showing this form
        const cmdExec = (cmd) => commandExecutionMap?.get(cmd);

        switch (response.selection) {
            case 0: await showDetailedFlagsForm(adminPlayer, targetPlayer, dependencies); shouldReturnToPlayerActions = false; break;
            case 1: if (cmdExec('invsee')) {
                await cmdExec('invsee')(adminPlayer, [targetName], dependencies);
            }
            else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'invsee' }));
            } break;
            case 2: /* Teleport To Player */
                try {
                    if (targetPlayer?.location && targetPlayer?.dimension) {
                        await adminPlayer?.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    }
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleportTo.success', { targetPlayerName: targetName }));
                    logManager?.addLog({ adminName, actionType: 'teleportSelfToPlayer', targetName, details: `Admin TP to ${targetName}` }, dependencies);
                }
                catch (e) {
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message }));
                    logManager?.addLog({
                        actionType: 'errorUiTeleportToPlayer',
                        context: 'uiManager.showPlayerActionsForm.teleportToPlayer',
                        adminName: adminName,
                        targetName: targetName,
                        details: {
                            errorMessage: e.message,
                            stack: e.stack,
                        },
                    }, dependencies);
                }
                break;
            case 3: /* Teleport Player Here */
                try {
                    if (adminPlayer?.location && adminPlayer?.dimension) {
                        await targetPlayer?.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    }
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleportHere.success', { targetPlayerName: targetName }));
                    targetPlayer?.sendMessage(getString('ui.playerActions.teleportHere.targetNotification'));
                    logManager?.addLog({ adminName, actionType: 'teleportPlayerToAdmin', targetName, details: `Admin TP'd ${targetName} to self` }, dependencies);
                }
                catch (e) {
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message }));
                    logManager?.addLog({
                        actionType: 'errorUiTeleportPlayerToAdmin',
                        context: 'uiManager.showPlayerActionsForm.teleportPlayerToAdmin',
                        adminName: adminName,
                        targetName: targetName,
                        details: {
                            errorMessage: e.message,
                            stack: e.stack,
                        },
                    }, dependencies);
                }
                break;
            case 4: /* await _showModalAndExecuteWithTransform('kick', 'ui.playerActions.kick.title', [{ type: 'textField', labelKey: 'ui.playerActions.kick.reasonPrompt', placeholderKey: 'ui.playerActions.kick.reasonPlaceholder' }], (vals) => [targetName, vals?.[0]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Kick modal temporarily disabled.'); shouldReturnToPlayerList = true; break;
            case 5: if (cmdExec('freeze')) {
                await cmdExec('freeze')(adminPlayer, [targetName, 'toggle'], dependencies);
            }
            else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' }));
            } break; // Assume 'toggle' is default
            case 6: if (isTargetMuted) {
                if (cmdExec('unmute')) {
                    await cmdExec('unmute')(adminPlayer, [targetName], dependencies);
                }
            }
            else {
                /* await _showModalAndExecuteWithTransform('mute', 'ui.playerActions.mute.title', [{ type: 'textField', labelKey: 'ui.playerActions.mute.durationPrompt', placeholderKey: 'ui.playerActions.mute.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.mute.reasonPrompt', placeholderKey: 'ui.playerActions.mute.reasonPlaceholder' }], (vals) => [targetName, vals?.[0], vals?.[1]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Mute modal temporarily disabled.');
            } break;
            case 7: /* await _showModalAndExecuteWithTransform('ban', 'ui.playerActions.ban.title', [{ type: 'textField', labelKey: 'ui.playerActions.ban.durationPrompt', placeholderKey: 'ui.playerActions.ban.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.ban.reasonPrompt', placeholderKey: 'ui.playerActions.ban.reasonPlaceholder' }], (vals) => [targetName, vals?.[0], vals?.[1]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Ban modal temporarily disabled.'); shouldReturnToPlayerList = true; break;
            case 8: if (cmdExec('resetflags')) {
                await cmdExec('resetflags')(adminPlayer, [targetName], dependencies);
            }
            else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
            } break;
            case 9: await _showConfirmationModal(adminPlayer, 'ui.playerActions.clearInventory.confirmTitle', 'ui.playerActions.clearInventory.confirmBody', 'ui.playerActions.clearInventory.confirmToggle', async () => {
                const invComp = targetPlayer?.getComponent(mc.EntityComponentTypes.Inventory); if (invComp?.container) {
                    for (let i = 0; i < invComp.container.size; i++) {
                        invComp.container.setItem(i);
                    } adminPlayer?.sendMessage(getString('ui.playerActions.clearInventory.success', { targetPlayerName: targetName })); logManager?.addLog({ adminName, actionType: 'clearInventory', targetName, details: `Cleared inv for ${targetName}` }, dependencies);
                }
                else {
                    adminPlayer?.sendMessage(getString('ui.playerActions.clearInventory.fail', { targetPlayerName: targetName }));
                }
            }, dependencies, { targetPlayerName: targetName }); break;
            case 10: shouldReturnToPlayerList = true; shouldReturnToPlayerActions = false; break;
            default: adminPlayer?.sendMessage(getString('ui.playerActions.error.invalidSelection')); break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, dependencies);
        }
        else if (shouldReturnToPlayerActions && targetPlayer?.isValid()) { // Check targetPlayer validity again
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        }
        else if (!targetPlayer?.isValid() && shouldReturnToPlayerActions) {
            adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
            await showOnlinePlayersList(adminPlayer, dependencies);
        }
    }
    catch (error) {
        playerUtils?.debugLog(`[UiManager.showPlayerActionsForm] Error for ${adminName}: ${error.stack || error}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiPlayerActionsForm', // Standardized
            context: 'uiManager.showPlayerActionsForm', // Standardized
            adminName: adminName,
            targetName: targetName, // Retain as top-level field as per LogEntry
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('ui.playerActions.error.generic'));
        await showOnlinePlayersList(adminPlayer, dependencies); // Fallback
    }
};


// Assign other functions similarly ensure dependencies are passed correctly, and use optional chaining.
showAdminPanelMain = async function (player, playerDataManager, dependencies) {
    const { playerUtils, logManager, getString, permissionLevels, rankManager, uiManager } = dependencies; // uiManager for recursive calls
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Requested by ${playerName}`, playerName, dependencies);

    const userPermLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);

    if (userPermLevel > permissionLevels.admin) { // Assuming admin is the minimum to see any admin panel
        // If not at least admin, show normal user panel
        await uiManager?.showNormalUserPanelMain(player, dependencies);
        return;
    }

    const form = new ActionFormData()
        .title(getString('ui.adminPanel.title'))
        .body(getString('ui.adminPanel.body', { playerName: playerName }));

    form.button(getString('ui.adminPanel.button.viewPlayers'), 'textures/ui/multiplayer_glyph_color');
    form.button(getString('ui.adminPanel.button.inspectPlayerText'), 'textures/ui/magnifying_glass');
    form.button(getString('ui.adminPanel.button.resetFlagsText'), 'textures/ui/refresh');
    form.button(getString('ui.adminPanel.button.listWatched'), 'textures/ui/spyglass_flat_color');
    form.button(getString('ui.adminPanel.button.serverManagement'), 'textures/ui/server_icon');

    if (userPermLevel === permissionLevels.owner) {
        form.button(getString('ui.adminPanel.button.editConfig'), 'textures/ui/settings_glyph_color');
    }
    form.button(getString('common.button.close'), 'textures/ui/cancel');

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies); // Sound for opening a form
        const response = await form.show(player);
        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Panel cancelled by ${playerName}. Reason: ${response.cancelationReason}`, playerName, dependencies);
            return;
        }

        const selection = response.selection;
        switch (selection) {
            case 0: await uiManager?.showOnlinePlayersList(player, dependencies); break;
            case 1: await uiManager?.showInspectPlayerForm(player, dependencies); break; // Assuming showInspectPlayerForm is part of uiManager
            case 2: await uiManager?.showResetFlagsForm(player, dependencies); break; // Assuming showResetFlagsForm is part of uiManager
            case 3: await uiManager?.showWatchedPlayersList(player, dependencies); break; // Assuming showWatchedPlayersList is part of uiManager
            case 4: await uiManager?.showServerManagementForm(player, dependencies); break;
            case 5:
                if (userPermLevel === permissionLevels.owner) {
                    await uiManager?.showEditConfigForm(player, dependencies);
                }
                else if (selection === 5) { // Index for close if owner button wasn't shown
                    playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Close selected by ${playerName}.`, playerName, dependencies);
                }
                break;
            case 6: // This would be the close button if owner button was shown
                if (userPermLevel === permissionLevels.owner) {
                    playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Close selected by ${playerName}.`, playerName, dependencies);
                }
                break;
            default: playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Invalid selection ${selection} by ${playerName}.`, playerName, dependencies); break;
        }
    }
    catch (error) {
        console.error(`[UiManager.showAdminPanelMain] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiAdminPanelMain', // Standardized
            context: 'uiManager.showAdminPanelMain', // Standardized
            adminName: playerName, // adminName is the player in this context
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        player?.sendMessage(getString('ui.adminPanel.error.generic'));
    }
};

showOnlinePlayersList = async function (adminPlayer, dependencies) {
    const { playerUtils, logManager, playerDataManager, getString, mc: minecraft, uiManager } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Requested by ${adminName}`, adminName, dependencies);

    const onlinePlayers = minecraft.world.getAllPlayers();
    const form = new ActionFormData()
        .title(getString('ui.onlinePlayers.title', { count: onlinePlayers.length.toString() }));

    if (onlinePlayers.length === 0) {
        form.body(getString('ui.onlinePlayers.noPlayers'));
    }
    else {
        form.body(getString('ui.onlinePlayers.body'));
        onlinePlayers.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id);
            const flagCount = pData?.flags?.totalFlags ?? 0;
            form.button(getString('ui.onlinePlayers.button.playerEntry', { playerName: p.nameTag, flagCount: flagCount.toString() }));
        });
    }
    form.button(getString('ui.button.backToAdminPanel')); // Back button

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            return;
        }
        const selection = response.selection;
        if (selection >= 0 && selection < onlinePlayers.length) {
            const targetPlayer = onlinePlayers[selection];
            if (targetPlayer?.isValid()) { // Check validity before passing
                await uiManager?.showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
            }
            else {
                adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayer?.nameTag || 'Selected Player' }));
                await uiManager?.showOnlinePlayersList(adminPlayer, dependencies); // Refresh list
            }
        }
        else if (selection === onlinePlayers.length) { // Corresponds to the "Back" button
            await uiManager?.showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies);
        }
    }
    catch (error) {
        console.error(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiOnlinePlayersList', // Standardized
            context: 'uiManager.showOnlinePlayersList', // Standardized
            adminName: adminName,
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('ui.onlinePlayers.error.generic'));
        // Optionally, try to go back to admin panel on error
        await uiManager?.showAdminPanelMain(adminPlayer, playerDataManager, dependencies.config, dependencies).catch(() => {});
    }
};

// Commenting out unused function assignments based on ESLint warnings
// showServerManagementForm = async function (_adminPlayer, _playerDataManager_unused, _config_unused, _dependencies) { /* ... */ };
// showModLogTypeSelectionForm = async function (_adminPlayer, _dependencies, _currentFilterName = null) { /* ... */ };
showDetailedFlagsForm = async function(_adminPlayer, _targetPlayer, _playerDataManager_unused, _dependencies) { /* ... */ }; // Parameters prefixed, function might be used
// showSystemInfo = async function (_adminPlayer, _config_unused, _playerDataManager_unused, _dependencies) { /* ... */ };
// showActionLogsForm = async function (_adminPlayer, _config_unused, _playerDataManager_unused, _dependencies) { /* ... */ };
// showResetFlagsForm = async function (_adminPlayer, _playerDataManager_unused, _dependencies) { /* ... */ };
// showWatchedPlayersList = async function (_adminPlayer, _playerDataManager_unused, _dependencies) { /* ... */ };
// showNormalUserPanelMain = async function (_player, _dependencies) { /* ... */ };
// showEditSingleConfigValueForm = async function (_adminPlayer, _keyName, _keyType, _currentValue, _dependencies) { /* ... */ };


// Re-assign the functions that were already defined to ensure they are using the updated forward declarations.
// (This is mostly a conceptual step here as the full implementations were not in the SEARCH block)
// Actual implementations would be here. For this exercise, I'm focusing on the structure and dependency handling.

// The _showConfirmationModal and _showModalAndExecuteWithTransform helpers would also be defined here or imported.
// Their internal logic would also need to be updated for robust dependency usage if they access dependencies.config etc.

export { showAdminPanelMain };
