/**
 * @file Manages the creation and display of various UI forms (Action, Modal, Message) for administrative
 * actions and player information within the AntiCheat system.
 * All actionType strings used for logging should be camelCase.
 * @module AntiCheatsBP/scripts/core/uiManager
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui'; // Direct imports, Removed MessageFormData
// Removed formatSessionDuration, formatDimensionName from '../utils/index.js'
import { adminPanelLayout, userPanelLayout } from '../core/panelLayoutConfig.js';

// UI functions will be defined below using 'async function' for hoisting.
// No separate forward declarations needed for them.

/**
 * Helper to show a confirmation modal.
 * @param {mc.Player} adminPlayer - Player to show modal to.
 * @param {string} titleKey - Localization key for title.
 * @param {string} bodyKey - Localization key for body.
 * @param {string} confirmToggleLabelKey - Localization key for confirm toggle.
 * @param {() => Promise<void>} onConfirmCallback - Async callback if confirmed.
 * @param {import('../types.js').CommandDependencies} dependencies - Standard dependencies.
 * @param {object} [bodyParams] - Optional parameters for body string formatting.
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
    } catch (error) {
        console.error(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleKey}): ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleKey}): ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiConfirmationModal', // Retain specific actionType
            context: 'uiManager._showConfirmationModal', // Standardized
            adminName: playerName,
            details: {
                titleKey,
                bodyKey, // Added for context
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
        .title('§l§3Inspect Player§r')
        .textField('Player Name:', 'Enter exact player name');

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
        } else {
            adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'inspect' }));
        }
    } catch (error) {
        console.error(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiInspectPlayerForm', // Standardized
            context: 'uiManager.showInspectPlayerForm', // Standardized
            adminName,
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

// Ensure all other UI functions (showPlayerActionsFormForward, showOnlinePlayersListForward, etc.)
// are also updated with:
// - Consistent use of playerName = player?.nameTag ?? 'UnknownPlayer';
// - Optional chaining for all dependency sub-modules (playerUtils?, logManager?, config?, etc.)
// - Specific function names in debug/error logs.
// - Using mc.EntityComponentTypes constants for getComponent calls.
// - Awaiting asynchronous operations like form.show() and command executions.
// - Using getString for all user-facing text.
// - Robust error handling with .catch and .finally where appropriate for UI navigation.

// --- Player Actions Form (Example of applying pattern) ---

// Button indices for showPlayerActionsForm
const PLAYER_ACTIONS_BTN_VIEW_FLAGS = 0;
const PLAYER_ACTIONS_BTN_VIEW_INV = 1;
const PLAYER_ACTIONS_BTN_TP_TO = 2;
const PLAYER_ACTIONS_BTN_TP_HERE = 3;
const PLAYER_ACTIONS_BTN_KICK = 4;
const PLAYER_ACTIONS_BTN_FREEZE_TOGGLE = 5;
const PLAYER_ACTIONS_BTN_MUTE_TOGGLE = 6;
const PLAYER_ACTIONS_BTN_BAN = 7;
const PLAYER_ACTIONS_BTN_RESET_FLAGS = 8;
const PLAYER_ACTIONS_BTN_CLEAR_INV = 9;
const PLAYER_ACTIONS_BTN_BACK_TO_LIST = 10;

/**
 * Displays a form with various actions that can be taken on a specific player.
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player using the form.
 * @param {import('@minecraft/server').Player} targetPlayer - The player being targeted by the actions.
 * @param {import('../types.js').PlayerDataManagerFull} playerDataManager - The player data manager instance.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies) {
    const { config, playerUtils, logManager, getString, commandExecutionMap } = dependencies; // Removed permissionLevels
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    const targetName = targetPlayer?.nameTag ?? 'UnknownTarget'; // targetPlayer could be null if it disconnects
    playerUtils?.debugLog(`[UiManager.showPlayerActionsForm] For ${targetName} by ${adminName}`, adminName, dependencies);

    if (!targetPlayer?.isValid()) { // Ensure targetPlayer is still valid
        adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
        await showOnlinePlayersList(adminPlayer, dependencies);
        return;
    }

    const targetPData = playerDataManager?.getPlayerData(targetPlayer.id);
    const flagCount = targetPData?.flags?.totalFlags ?? 0;
    const isWatched = targetPData?.isWatched ?? false;

    const form = new ActionFormData()
        .title(`§l§6Actions for ${targetName}§r`) // Hardcoded ui.playerActions.title
        .body(`Flags: ${flagCount.toString()} | Watched: ${isWatched ? getString('common.boolean.yes') : getString('common.boolean.no')}`); // Hardcoded ui.playerActions.body (getString for common booleans remains)

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

    form.button('§bView Detailed Flags§r', 'textures/ui/magnifying_glass'); // Hardcoded ui.playerActions.button.viewFlags
    form.button('§3View Inventory§r', 'textures/ui/chest_icon.png'); // Hardcoded ui.playerActions.button.viewInventory
    form.button('§dTeleport To Player§r', 'textures/ui/portal'); // Hardcoded ui.playerActions.button.teleportTo
    form.button('§dTeleport Player Here§r', 'textures/ui/arrow_down_thin'); // Hardcoded ui.playerActions.button.teleportHere
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
        /**
         * Retrieves a command execution function from the command map.
         * @param {string} cmd - The name of the command to retrieve.
         * @returns {((player: import('@minecraft/server').Player, args: string[], dependencies: import('../types.js').Dependencies) => Promise<void>) | undefined} The command's execute function or undefined if not found.
         */
        const cmdExec = (cmd) => commandExecutionMap?.get(cmd);

        switch (response.selection) {
            case PLAYER_ACTIONS_BTN_VIEW_FLAGS: await showDetailedFlagsForm(adminPlayer, targetPlayer, dependencies); shouldReturnToPlayerActions = false; break;
            case PLAYER_ACTIONS_BTN_VIEW_INV: if (cmdExec('invsee')) {
                await cmdExec('invsee')(adminPlayer, [targetName], dependencies);
            } else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'invsee' }));
            } break;
            case PLAYER_ACTIONS_BTN_TP_TO: /* Teleport To Player */
                try {
                    if (targetPlayer?.location && targetPlayer?.dimension) {
                        await adminPlayer?.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    }
                    adminPlayer?.sendMessage(`§aTeleported to ${targetName}.`); // Hardcoded ui.playerActions.teleportTo.success
                    logManager?.addLog({ adminName, actionType: 'teleportSelfToPlayer', targetName, details: `Admin TP to ${targetName}` }, dependencies);
                } catch (e) {
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message }));
                    logManager?.addLog({
                        actionType: 'errorUiTeleportToPlayer',
                        context: 'uiManager.showPlayerActionsForm.teleportToPlayer',
                        adminName,
                        targetName,
                        details: {
                            errorMessage: e.message,
                            stack: e.stack,
                        },
                    }, dependencies);
                }
                break;
            case PLAYER_ACTIONS_BTN_TP_HERE: /* Teleport Player Here */
                try {
                    if (adminPlayer?.location && adminPlayer?.dimension) {
                        await targetPlayer?.teleport(adminPlayer.location, { dimension: adminPlayer.dimension });
                    }
                    adminPlayer?.sendMessage(`§aTeleported ${targetName} to you.`); // Hardcoded ui.playerActions.teleportHere.success
                    targetPlayer?.sendMessage('§eYou have been teleported by an admin.'); // Hardcoded ui.playerActions.teleportHere.targetNotification
                    logManager?.addLog({ adminName, actionType: 'teleportPlayerToAdmin', targetName, details: `Admin TP'd ${targetName} to self` }, dependencies);
                } catch (e) {
                    adminPlayer?.sendMessage(getString('ui.playerActions.teleport.error', { error: e.message }));
                    logManager?.addLog({
                        actionType: 'errorUiTeleportPlayerToAdmin',
                        context: 'uiManager.showPlayerActionsForm.teleportPlayerToAdmin',
                        adminName,
                        targetName,
                        details: {
                            errorMessage: e.message,
                            stack: e.stack,
                        },
                    }, dependencies);
                }
                break;
            case PLAYER_ACTIONS_BTN_KICK: /* await _showModalAndExecuteWithTransform('kick', 'ui.playerActions.kick.title', [{ type: 'textField', labelKey: 'ui.playerActions.kick.reasonPrompt', placeholderKey: 'ui.playerActions.kick.reasonPlaceholder' }], (vals) => [targetName, vals?.[0]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Kick modal temporarily disabled.'); shouldReturnToPlayerList = true; break;
            case PLAYER_ACTIONS_BTN_FREEZE_TOGGLE: if (cmdExec('freeze')) {
                await cmdExec('freeze')(adminPlayer, [targetName, 'toggle'], dependencies);
            } else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' }));
            } break; // Assume 'toggle' is default
            case PLAYER_ACTIONS_BTN_MUTE_TOGGLE: if (isTargetMuted) {
                if (cmdExec('unmute')) {
                    await cmdExec('unmute')(adminPlayer, [targetName], dependencies);
                }
            } else {
                /* await _showModalAndExecuteWithTransform('mute', 'ui.playerActions.mute.title', [{ type: 'textField', labelKey: 'ui.playerActions.mute.durationPrompt', placeholderKey: 'ui.playerActions.mute.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.mute.reasonPrompt', placeholderKey: 'ui.playerActions.mute.reasonPlaceholder' }], (vals) => [targetName, vals?.[0], vals?.[1]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Mute modal temporarily disabled.');
            } break;
            case PLAYER_ACTIONS_BTN_BAN: /* await _showModalAndExecuteWithTransform('ban', 'ui.playerActions.ban.title', [{ type: 'textField', labelKey: 'ui.playerActions.ban.durationPrompt', placeholderKey: 'ui.playerActions.ban.durationPlaceholder' }, { type: 'textField', labelKey: 'ui.playerActions.ban.reasonPrompt', placeholderKey: 'ui.playerActions.ban.reasonPlaceholder' }], (vals) => [targetName, vals?.[0], vals?.[1]], dependencies, adminPlayer, { targetPlayerName: targetName }); */ adminPlayer?.sendMessage('Ban modal temporarily disabled.'); shouldReturnToPlayerList = true; break;
            case PLAYER_ACTIONS_BTN_RESET_FLAGS: if (cmdExec('resetflags')) {
                await cmdExec('resetflags')(adminPlayer, [targetName], dependencies);
            } else {
                adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
            } break;
            case PLAYER_ACTIONS_BTN_CLEAR_INV: await _showConfirmationModal(adminPlayer, 'ui.playerActions.clearInventory.confirmTitle', 'ui.playerActions.clearInventory.confirmBody', 'ui.playerActions.clearInventory.confirmToggle', () => { // Removed async
                const invComp = targetPlayer?.getComponent(mc.EntityComponentTypes.Inventory); if (invComp?.container) {
                    for (let i = 0; i < invComp.container.size; i++) {
                        invComp.container.setItem(i);
                    } adminPlayer?.sendMessage(getString('ui.playerActions.clearInventory.success', { targetPlayerName: targetName })); logManager?.addLog({ adminName, actionType: 'clearInventory', targetName, details: `Cleared inv for ${targetName}` }, dependencies);
                } else {
                    adminPlayer?.sendMessage(getString('ui.playerActions.clearInventory.fail', { targetPlayerName: targetName }));
                }
            }, dependencies, { targetPlayerName: targetName }); break;
            case PLAYER_ACTIONS_BTN_BACK_TO_LIST: shouldReturnToPlayerList = true; shouldReturnToPlayerActions = false; break;
            default: adminPlayer?.sendMessage(getString('ui.playerActions.error.invalidSelection')); break;
        }

        if (shouldReturnToPlayerList) {
            await showOnlinePlayersList(adminPlayer, dependencies);
        } else if (shouldReturnToPlayerActions && targetPlayer?.isValid()) { // Check targetPlayer validity again
            await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
        } else if (!targetPlayer?.isValid() && shouldReturnToPlayerActions) {
            adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetName }));
            await showOnlinePlayersList(adminPlayer, dependencies);
        }
    } catch (error) {
        playerUtils?.debugLog(`[UiManager.showPlayerActionsForm] Error for ${adminName}: ${error.stack || error}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiPlayerActionsForm', // Standardized
            context: 'uiManager.showPlayerActionsForm', // Standardized
            adminName,
            targetName, // Retain as top-level field as per LogEntry
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('ui.playerActions.error.generic'));
        await showOnlinePlayersList(adminPlayer, dependencies); // Fallback
    }
}


// Assign other functions similarly ensure dependencies are passed correctly, and use optional chaining.

/**
 * Shows the main admin panel form.
 * Displays different options based on the admin's permission level.
 * @param {import('@minecraft/server').Player} player - The player (admin) viewing the panel.
 * @param {import('../types.js').PlayerDataManagerFull} playerDataManager - The player data manager instance. (Note: playerDataManager is not directly used in this refactored version but kept for signature consistency if other parts of the codebase expect it)
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showAdminPanelMain(player, playerDataManager, dependencies) { // playerDataManager kept for signature, though less used directly
    const { playerUtils, logManager, getString, permissionLevels, rankManager, config } = dependencies; // Added config
    const playerName = player?.nameTag ?? 'UnknownPlayer';
    playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Requested by ${playerName}`, playerName, dependencies);

    const userPermLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);

    // This check remains: if not admin, show normal user panel
    if (userPermLevel > permissionLevels.admin) {
        await showNormalUserPanelMain(player, dependencies); // Direct call
        return;
    }

    const form = new ActionFormData()
        .title('§l§bAntiCheat Admin Panel§r') // Hardcoded title
        .body(`Welcome, ${playerName}! Select an action:`); // Hardcoded body

    const permittedButtons = [];
    // adminPanelLayout should be imported from panelLayoutConfig.js
    for (const buttonConfig of adminPanelLayout) {
        if (userPermLevel <= buttonConfig.requiredPermLevel) {
            form.button(buttonConfig.text, buttonConfig.icon);
            permittedButtons.push(buttonConfig); // Store the config for this button
        }
    }
    form.button(getString('common.button.close'), 'textures/ui/cancel'); // Common close button

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Panel cancelled by ${playerName}. Reason: ${response.cancelationReason}`, playerName, dependencies);
            return;
        }

        const selection = response.selection;
        if (typeof selection === 'undefined') return;

        if (selection < permittedButtons.length) {
            const selectedButtonConfig = permittedButtons[selection];
            playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Selected action: ${selectedButtonConfig.id} by ${playerName}`, playerName, dependencies);

            const actionFunctions = {
                showOnlinePlayersList,
                showInspectPlayerForm,
                showResetFlagsForm,
                showWatchedPlayersList,
                showServerManagementForm,
                showEditConfigForm,
                // Potentially add other ui functions if they become part of the configurable panel
                // showMyStatsUIPanel, showServerRulesUIPanel, showHelpfulLinksUIPanel, showGeneralTipsUIPanel, etc.
                // but these are typically for the userPanelLayout.
            };

            if (selectedButtonConfig.actionType === 'functionCall' && actionFunctions[selectedButtonConfig.actionValue]) {
                // Most of these functions expect (player, dependencies)
                // showAdminPanelMain itself takes (player, playerDataManager, dependencies)
                // We ensure dependencies are passed, and individual functions can retrieve playerDataManager from it if needed.
                await actionFunctions[selectedButtonConfig.actionValue](player, dependencies);
            } else {
                playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Unknown actionValue or actionType for ${selectedButtonConfig.id}: ${selectedButtonConfig.actionValue}`, playerName, dependencies);
                player?.sendMessage(getString('common.error.genericForm'));
            }
        } else if (selection === permittedButtons.length) { // This is the "Close" button
            playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Close selected by ${playerName}.`, playerName, dependencies);
        } else {
            playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Invalid selection ${selection} by ${playerName}.`, playerName, dependencies);
        }

    } catch (error) {
        console.error(`[UiManager.showAdminPanelMain] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showAdminPanelMain] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiAdminPanelMain',
            context: 'uiManager.showAdminPanelMain',
            adminName: playerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player?.sendMessage('§cError displaying admin panel.'); // Hardcoded from previous refactor
    }
}

/**
 * Shows a form listing all currently online players.
 * Allows selecting a player to view further actions.
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player viewing the list.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showOnlinePlayersList(adminPlayer, dependencies) {
    const { playerUtils, logManager, playerDataManager, getString, mc: minecraft } = dependencies; // Removed uiManager
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Requested by ${adminName}`, adminName, dependencies);

    const onlinePlayers = minecraft.world.getAllPlayers();
    const form = new ActionFormData()
        .title(`§l§bOnline Players (${onlinePlayers.length})§r`);

    if (onlinePlayers.length === 0) {
        form.body('No players are currently online.');
    } else {
        form.body('Select a player to manage:');
        onlinePlayers.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id);
            const flagCount = pData?.flags?.totalFlags ?? 0;
            form.button(`${p.nameTag} §7(Flags: ${flagCount})§r`);
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
                await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
            } else {
                adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayer?.nameTag || 'Selected Player' }));
                await showOnlinePlayersList(adminPlayer, dependencies); // Refresh list
            }
        } else if (selection === onlinePlayers.length) { // Corresponds to the "Back" button
            await showAdminPanelMain(adminPlayer, playerDataManager, dependencies); // Pass full dependencies
        }
    } catch (error) {
        console.error(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiOnlinePlayersList', // Standardized
            context: 'uiManager.showOnlinePlayersList', // Standardized
            adminName,
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage('§cError displaying online players list.');
        // Optionally, try to go back to admin panel on error
        await showAdminPanelMain(adminPlayer, playerDataManager, dependencies).catch((e) => {
            console.warn(`[UiManager.showOnlinePlayersList] Error in fallback showAdminPanelMain: ${e}`);
        }); // Pass full dependencies
    }
}

// Commenting out unused function assignments based on ESLint warnings
// async function showServerManagementForm (_adminPlayer, _playerDataManager_unused, _config_unused, _dependencies) { /* ... */ };
// async function showModLogTypeSelectionForm (_adminPlayer, _dependencies, _currentFilterName = null) { /* ... */ };
/**
 * Shows a form displaying detailed flags for a specific target player. (Currently a stub)
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player viewing the flags.
 * @param {import('@minecraft/server').Player} targetPlayer - The player whose flags are being viewed.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showDetailedFlagsForm (adminPlayer, targetPlayer, dependencies) {
    const { playerUtils, getString, playerDataManager } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    const targetName = targetPlayer?.nameTag ?? 'UnknownTarget';
    playerUtils?.debugLog(`[UiManager.showDetailedFlagsForm] Stub for ${targetName} by ${adminName}`, adminName, dependencies);
    adminPlayer?.sendMessage(getString('common.error.notImplemented', { featureName: 'Detailed Flags View' }));
    await showPlayerActionsForm(adminPlayer, targetPlayer, playerDataManager, dependencies);
}

/**
 * Shows a form for resetting flags for a player. (Currently a stub)
 * @param {import('@minecraft/server').Player} player - The admin player initiating the action.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showResetFlagsForm(player, dependencies) {
    const { playerUtils, getString, playerDataManager } = dependencies;
    playerUtils?.debugLog(`[UiManager.showResetFlagsForm] Stub called by ${player?.nameTag}`, player?.nameTag, dependencies);
    player?.sendMessage(getString('common.error.notImplemented', { featureName: 'Reset Flags Form' }));
    await showAdminPanelMain(player, playerDataManager, dependencies);
}

/**
 * Shows a list of watched players. (Currently a stub)
 * @param {import('@minecraft/server').Player} player - The admin player viewing the list.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showWatchedPlayersList(player, dependencies) {
    const { playerUtils, getString, playerDataManager } = dependencies;
    playerUtils?.debugLog(`[UiManager.showWatchedPlayersList] Stub called by ${player?.nameTag}`, player?.nameTag, dependencies);
    player?.sendMessage(getString('common.error.notImplemented', { featureName: 'Watched Players List' }));
    await showAdminPanelMain(player, playerDataManager, dependencies);
}

/**
 * Shows a server management form. (Currently a stub)
 * @param {import('@minecraft/server').Player} player - The admin player using the form.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showServerManagementForm(player, dependencies) {
    const { playerUtils, getString, playerDataManager } = dependencies;
    playerUtils?.debugLog(`[UiManager.showServerManagementForm] Stub called by ${player?.nameTag}`, player?.nameTag, dependencies);
    player?.sendMessage(getString('common.error.notImplemented', { featureName: 'Server Management Form' }));
    await showAdminPanelMain(player, playerDataManager, dependencies);
}

/**
 * Shows a form for editing configuration values. (Currently a stub)
 * @param {import('@minecraft/server').Player} player - The admin player (owner) using the form.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showEditConfigForm(player, dependencies) {
    const { playerUtils, getString, playerDataManager } = dependencies;
    playerUtils?.debugLog(`[UiManager.showEditConfigForm] Stub called by ${player?.nameTag}`, player?.nameTag, dependencies);
    player?.sendMessage(getString('common.error.notImplemented', { featureName: 'Edit Config Form' }));
    await showAdminPanelMain(player, playerDataManager, dependencies);
}

/**
 * Shows the main panel for normal users. (Currently a stub)
 * @param {import('@minecraft/server').Player} player - The player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
// Placeholder for other UI functions that will be defined in later steps
async function showMyStatsUIPanel(player, dependencies) {
    const { playerUtils, logManager, playerDataManager, getString, mc } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    playerUtils?.debugLog(`[UiManager.showMyStatsUIPanel] Requested by ${playerName}`, playerName, dependencies);

    const pData = playerDataManager?.getPlayerData(player.id);
    const totalFlags = pData?.flags?.totalFlags ?? 0;

    let bodyText = '';
    if (totalFlags === 0) {
        bodyText = 'You currently have no flags!\n\n'; // Hardcoded from uinfo.myStats.noFlags
    } else {
        // Could list flags here if desired, for now, just a summary
        bodyText = `You have a total of ${totalFlags} flag(s).\nDetailed flag information can be shown here.\n\n`;
    }

    const location = player.location;
    // Ensure playerUtils.formatDimensionName is available or implement a simple version if not part of dependencies.playerUtils directly
    const dimensionName = dependencies.playerUtils?.formatDimensionName ? dependencies.playerUtils.formatDimensionName(player.dimension.id) : player.dimension.id.replace('minecraft:', '').replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');


    bodyText += `Location: X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)}\n`; // Hardcoded from ui.myStats.labelLocation
    bodyText += `Dimension: ${dimensionName}`; // Hardcoded from ui.myStats.labelDimension

    const form = new ActionFormData()
        .title('§l§bYour Stats§r') // Hardcoded from ui.myStats.title
        .body(bodyText);

    form.button(getString('common.button.back'), 'textures/ui/undo'); // Back to NormalUserPanel

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled || response.selection === 0) { // 0 is Back button
            await showNormalUserPanelMain(player, dependencies);
            return;
        }
        // No other buttons expected here for now
    } catch (error) {
        console.error(`[UiManager.showMyStatsUIPanel] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showMyStatsUIPanel] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiMyStatsPanel',
            context: 'uiManager.showMyStatsUIPanel',
            adminName: playerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player?.sendMessage(getString('common.error.genericForm'));
        await showNormalUserPanelMain(player, dependencies); // Attempt to go back on error
    }
}
async function showServerRulesUIPanel(player, dependencies) {
    const { playerUtils, logManager, config, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    playerUtils?.debugLog(`[UiManager.showServerRulesUIPanel] Requested by ${playerName}`, playerName, dependencies);

    const serverRules = config?.serverRules ?? [];
    let bodyText;

    if (serverRules.length === 0) {
        bodyText = 'No server rules have been defined by the admin yet.'; // Hardcoded from ui.serverRules.noRulesDefined
    } else {
        bodyText = serverRules.join('\n'); // Display each rule on a new line
    }

    const form = new ActionFormData()
        .title('§l§eServer Rules§r') // Hardcoded from ui.serverRules.title
        .body(bodyText);

    form.button(getString('common.button.back'), 'textures/ui/undo'); // Back to NormalUserPanel

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled || response.selection === 0) { // 0 is Back button
            await showNormalUserPanelMain(player, dependencies);
            return;
        }
    } catch (error) {
        console.error(`[UiManager.showServerRulesUIPanel] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showServerRulesUIPanel] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiServerRulesPanel',
            context: 'uiManager.showServerRulesUIPanel',
            adminName: playerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player?.sendMessage(getString('common.error.genericForm'));
        await showNormalUserPanelMain(player, dependencies); // Attempt to go back on error
    }
}
async function showHelpfulLinksUIPanel(player, dependencies) {
    const { playerUtils, logManager, config, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    playerUtils?.debugLog(`[UiManager.showHelpfulLinksUIPanel] Requested by ${playerName}`, playerName, dependencies);

    const helpfulLinks = config?.helpfulLinks ?? []; // Expected format: [{ title: string, url: string }]

    const form = new ActionFormData()
        .title('§l§9Helpful Links§r'); // Hardcoded from ui.helpfulLinks.title

    if (helpfulLinks.length === 0) {
        form.body('No helpful links have been configured by the admin.'); // Hardcoded from ui.helpfulLinks.noLinks
    } else {
        form.body('Select a link to view it in chat:'); // Hardcoded from ui.helpfulLinks.body
        helpfulLinks.forEach(link => {
            if (link && typeof link.title === 'string' && typeof link.url === 'string') {
                form.button(link.title); // Using link title as button text
            }
        });
    }

    form.button(getString('common.button.back'), 'textures/ui/undo'); // Back button is the last one

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            await showNormalUserPanelMain(player, dependencies);
            return;
        }

        const selection = response.selection;
        const backButtonIndex = helpfulLinks.length; // Index of the back button

        if (selection === backButtonIndex) {
            await showNormalUserPanelMain(player, dependencies);
            return;
        }

        if (selection >= 0 && selection < helpfulLinks.length) {
            const selectedLink = helpfulLinks[selection];
            if (selectedLink) {
                // Hardcoded from ui.helpfulLinks.linkMessageFormat: "§e{title}: §9§n{url}§r (Copy and paste into your browser)"
                player.sendMessage(`§e${selectedLink.title}: §9§n${selectedLink.url}§r (Copy and paste into your browser)`);
                // Re-show this panel after displaying a link
                await showHelpfulLinksUIPanel(player, dependencies);
            }
        } else {
             playerUtils?.debugLog(`[UiManager.showHelpfulLinksUIPanel] Invalid selection ${selection} by ${playerName}.`, playerName, dependencies);
             await showNormalUserPanelMain(player, dependencies); // Go back to main panel on unexpected selection
        }

    } catch (error) {
        console.error(`[UiManager.showHelpfulLinksUIPanel] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showHelpfulLinksUIPanel] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiHelpfulLinksPanel',
            context: 'uiManager.showHelpfulLinksUIPanel',
            adminName: playerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player?.sendMessage(getString('common.error.genericForm'));
        await showNormalUserPanelMain(player, dependencies); // Attempt to go back on error
    }
}
async function showGeneralTipsUIPanel(player, dependencies) {
    const { playerUtils, logManager, config, getString } = dependencies;
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    playerUtils?.debugLog(`[UiManager.showGeneralTipsUIPanel] Requested by ${playerName}`, playerName, dependencies);

    const generalTips = config?.generalTips ?? []; // Expected format: string[]

    let bodyText;
    if (generalTips.length === 0) {
        bodyText = 'No general tips available at the moment.'; // Hardcoded from ui.generalTips.noTips
    } else {
        bodyText = generalTips.join('\n\n---\n\n'); // Display each tip separated by a horizontal rule
    }

    const form = new ActionFormData()
        .title('General Tips') // Hardcoded from ui.generalTips.title
        .body(bodyText);

    form.button(getString('common.button.back'), 'textures/ui/undo'); // Back to NormalUserPanel

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled || response.selection === 0) { // 0 is Back button
            await showNormalUserPanelMain(player, dependencies);
            return;
        }
    } catch (error) {
        console.error(`[UiManager.showGeneralTipsUIPanel] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showGeneralTipsUIPanel] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiGeneralTipsPanel',
            context: 'uiManager.showGeneralTipsUIPanel',
            adminName: playerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player?.sendMessage(getString('common.error.genericForm'));
        await showNormalUserPanelMain(player, dependencies); // Attempt to go back on error
    }
}

async function showNormalUserPanelMain(player, dependencies) {
    const { playerUtils, logManager, getString, permissionLevels, rankManager } = dependencies; // Added rankManager, permissionLevels
    const playerName = player?.nameTag ?? 'UnknownPlayer';

    playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Requested by ${playerName}`, playerName, dependencies);

    const userPermLevel = rankManager?.getPlayerPermissionLevel(player, dependencies);

    const form = new ActionFormData()
        .title('Player Information Panel') // Title remains hardcoded as per previous step
        .body(`Welcome, ${playerName}! Select an option:`); // Body remains hardcoded

    const permittedButtons = [];
    // userPanelLayout should be imported from panelLayoutConfig.js
    for (const buttonConfig of userPanelLayout) {
        if (userPermLevel <= buttonConfig.requiredPermLevel) { // Check permission
            form.button(buttonConfig.text, buttonConfig.icon);
            permittedButtons.push(buttonConfig);
        }
    }
    form.button(getString('common.button.close'), 'textures/ui/cancel'); // Common close button

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled || typeof response.selection === 'undefined') {
            playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Panel cancelled by ${playerName}. Reason: ${response.cancelationReason}`, playerName, dependencies);
            return;
        }

        const selection = response.selection;

        if (selection < permittedButtons.length) {
            const selectedButtonConfig = permittedButtons[selection];
            playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Selected action: ${selectedButtonConfig.id} by ${playerName}`, playerName, dependencies);

            const actionFunctions = {
                showMyStatsUIPanel,
                showServerRulesUIPanel,
                showHelpfulLinksUIPanel,
                showGeneralTipsUIPanel,
            };

            if (selectedButtonConfig.actionType === 'functionCall' && actionFunctions[selectedButtonConfig.actionValue]) {
                await actionFunctions[selectedButtonConfig.actionValue](player, dependencies);
            } else {
                playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Unknown actionValue or actionType for ${selectedButtonConfig.id}: ${selectedButtonConfig.actionValue}`, playerName, dependencies);
                player?.sendMessage(getString('common.error.genericForm'));
            }
        } else if (selection === permittedButtons.length) { // This is the "Close" button
            playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Close selected by ${playerName}.`, playerName, dependencies);
        } else {
            playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Invalid selection ${selection} by ${playerName}.`, playerName, dependencies);
            player?.sendMessage(getString('common.error.genericForm'));
        }
    } catch (error) {
        console.error(`[UiManager.showNormalUserPanelMain] Error for ${playerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showNormalUserPanelMain] Error for ${playerName}: ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiNormalUserPanelMain',
            context: 'uiManager.showNormalUserPanelMain',
            adminName: playerName,
            details: {
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        player?.sendMessage(getString('common.error.genericForm'));
    }
}

// TODO: Define or remove these other potentially unused/stubbed functions if they cause lint errors:
// async function showSystemInfo (_adminPlayer, _dependencies) { /* ... */ };
// async function showActionLogsForm (_adminPlayer, _dependencies) { /* ... */ };
// async function showModLogTypeSelectionForm (_adminPlayer, _dependencies) { /* ... */ };
// async function showEditSingleConfigValueForm (_adminPlayer, _keyName, _keyType, _currentValue, _dependencies) { /* ... */ };
// async function showSystemInfo (_adminPlayer, _config_unused, _playerDataManager_unused, _dependencies) { /* ... */ };
// async function showActionLogsForm (_adminPlayer, _config_unused, _playerDataManager_unused, _dependencies) { /* ... */ };
// async function showModLogTypeSelectionForm (_adminPlayer, _dependencies, _currentFilterName = null) { /* ... */ };
// async function showEditSingleConfigValueForm (_adminPlayer, _keyName, _keyType, _currentValue, _dependencies) { /* ... */ };

/**
 *
 */
export { showAdminPanelMain, showNormalUserPanelMain };
