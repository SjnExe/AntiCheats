/**
 * @file Manages the display of dynamic, hierarchical UI panels and modal forms.
 * Core functionality revolves around the generic `showPanel` function, which renders
 * UI structures defined in `../core/panelLayoutConfig.js`. It also handles
 * player-specific navigation stacks for hierarchical panel traversal.
 * @module AntiCheatsBP/scripts/core/uiManager
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui'; // Direct imports, Removed MessageFormData
// Removed formatSessionDuration, formatDimensionName from '../utils/index.js'
import { panelDefinitions } from '../core/panelLayoutConfig.js'; // Replaced old imports

// --- Player Navigation Stack Management ---
/**
 * Stores navigation stacks for each player.
 * Key: Player ID (string)
 * Value: Array of objects, where each object is { panelId: string, context: object }
 * @type {Map<string, Array<{panelId: string, context: object}>>}
 */
const playerNavigationStacks = new Map();

/**
 * Pushes a panel state onto the player's navigation stack.
 * Avoids pushing identical consecutive states.
 * @param {string} playerId The ID of the player.
 * @param {string} panelId The ID of the panel being recorded in the stack.
 * @param {object} context The context associated with this panel state.
 */
function pushToPlayerNavStack(playerId, panelId, context) {
    if (!playerNavigationStacks.has(playerId)) {
        playerNavigationStacks.set(playerId, []);
    }
    const stack = playerNavigationStacks.get(playerId);
    // Avoid pushing the same panel consecutively if context is identical
    const currentTop = stack.length > 0 ? stack[stack.length - 1] : null;
    if (!currentTop || currentTop.panelId !== panelId || JSON.stringify(currentTop.context) !== JSON.stringify(context)) {
        stack.push({ panelId, context: { ...context } }); // Store a copy of context
    }
}

/**
 * Pops the top panel state from the player's navigation stack.
 * @param {string} playerId The ID of the player.
 * @returns {{ panelId: string, context: object } | null} The popped panel state or null if stack is empty.
 */
function popFromPlayerNavStack(playerId) {
    if (!playerNavigationStacks.has(playerId)) {
        return null;
    }
    const stack = playerNavigationStacks.get(playerId);
    return stack.pop() || null; // .pop() returns undefined for empty array, ensure null
}

/**
 * Clears the navigation stack for a specific player.
 * @param {string} playerId The ID of the player.
 */
function clearPlayerNavStack(playerId) {
    if (playerNavigationStacks.has(playerId)) {
        playerNavigationStacks.set(playerId, []);
    }
}

/**
 * Checks if the player's navigation stack is effectively empty (or has only one item, meaning current view is top).
 * This helps determine if a "Back" button should go to a previous panel or if "Exit" is more appropriate.
 * @param {string} playerId The ID of the player.
 * @returns {boolean} True if the stack implies no logical "back" operation.
 */
function isNavStackAtRoot(playerId) {
    if (!playerNavigationStacks.has(playerId)) {
        return true;
    }
    // If stack has 0 or 1 item, we are at a root or the first opened panel.
    return playerNavigationStacks.get(playerId).length <= 1;
}

/**
 * Gets the current (top) panel state from the player's navigation stack without popping it.
 * @param {string} playerId The ID of the player.
 * @returns {{ panelId: string, context: object } | null} The current panel state or null if stack is empty.
 */
function getCurrentTopOfNavStack(playerId) {
    if (!playerNavigationStacks.has(playerId)) {
        return null;
    }
    const stack = playerNavigationStacks.get(playerId);
    if (stack.length === 0) {
        return null;
    }
    return stack[stack.length - 1];
}
// --- End Player Navigation Stack Management ---

/**
 * Shows a modal form to get a player name and confirm resetting their flags.
 * After user interaction (submit, cancel, or error), it navigates back to the calling panel.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player initiating the action.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object, potentially passed from the calling panel. Not directly used for form fields but for consistent signature.
 */
async function showResetFlagsFormImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.nameTag;

    playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    const modalForm = new ModalFormData()
        .title("§l§eReset Player Flags§r")
        .textField("Player Name to Reset Flags For:", "Enter exact player name")
        .toggle("§cConfirm Resetting All Flags", false);

    try {
        const response = await modalForm.show(player);
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };

        if (response.canceled) {
            player.sendMessage("§7Flag reset action cancelled.");
        } else {
            const [targetPlayerName, confirmed] = response.formValues;

            if (!targetPlayerName || targetPlayerName.trim() === "") {
                player.sendMessage(getString('common.error.nameEmpty'));
                // Re-show this form by calling self via UI_ACTION_FUNCTIONS to keep nav stack clean if it was called from a panel item
                // However, showResetFlagsForm is often a direct function call from an admin panel item.
                // For simplicity, if called again, it would just show the modal again without complex stack mgmt here.
                // await UI_ACTION_FUNCTIONS.showResetFlagsForm(player, dependencies, context); // This would be recursive if not careful
                // Instead, let's assume this function is a leaf. If input is bad, it just ends. User can retry.
                // Or, more robustly, re-show THIS modal:
                await showResetFlagsFormImpl(player, dependencies, context);
                return;
            }
            if (!confirmed) {
                player.sendMessage("§eFlag reset not confirmed. Action cancelled.");
            } else {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName.trim()], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            }
        }
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {});
    } catch (error) {
        console.error(`[UiManager.showResetFlagsFormImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiResetFlagsForm', context: 'uiManager.showResetFlagsFormImpl', adminName: adminPlayerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {});
    }
}

/**
 * Displays a list of currently watched online players in a modal.
 * After the modal is dismissed (OK button), it navigates back to the calling panel.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player viewing the list.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object from the calling panel. Not directly used for modal content but for consistent signature and return navigation.
 */
async function showWatchedPlayersListImpl(player, dependencies, context) {
    const { playerUtils, getString, playerDataManager, mc, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    let messageBody = "§gCurrently watched players (online):\n§r";
    const onlinePlayers = mc.world.getAllPlayers();
    const watchedOnline = [];
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            watchedOnline.push(p.nameTag);
        }
    });

    if (watchedOnline.length === 0) {
        messageBody += "No players are currently being watched or online.";
    } else {
        messageBody += watchedOnline.map(name => `- ${name}`).join("\n");
    }

    const modal = new ModalFormData()
        .title("§l§bWatched Players§r")
        .content(messageBody);
    modal.button1(getString('common.button.ok'));

    try {
        await modal.show(player);
    } catch (error) {
        console.error(`[UiManager.showWatchedPlayersListImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiWatchedPlayersList', context: 'uiManager.showWatchedPlayersListImpl', adminName: adminPlayerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    }
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
    if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'playerManagementPanel', dependencies, {});
}

/**
 * Lists some example editable config keys in an ActionForm.
 * Allows selection of a key, then calls `showEditSingleConfigValueFormImpl` to edit it.
 * Navigates back to the calling panel (configEditingRootPanel) upon cancellation or completion of sub-forms.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object from the calling panel (e.g., configEditingRootPanel).
 */
async function showConfigCategoriesListImpl(player, dependencies, context) {
    const { playerUtils, config, getString, logManager } = dependencies;
    playerUtils.debugLog(`[UiManager.showConfigCategoriesListImpl] Called by ${player.nameTag}`, player.nameTag, dependencies);

    const form = new ActionFormData().title("Edit Configuration Key");

    const editableConfigItems = [
        { keyName: 'enableFlyCheck', description: 'Enable Fly Check', type: 'boolean' },
        { keyName: 'maxCpsThreshold', description: 'Max CPS Threshold', type: 'number' },
        { keyName: 'welcomeMessage', description: 'Welcome Message (string)', type: 'string' },
        { keyName: 'tpaRequestTimeoutSeconds', description: 'TPA Timeout (seconds)', type: 'number'},
        { keyName: 'acGlobalNotificationsDefaultOn', description: 'AC Notifications Default On', type: 'boolean'}
    ];

    const actualEditableKeys = [];
    editableConfigItems.forEach(item => {
        if (Object.prototype.hasOwnProperty.call(config, item.keyName)) {
            form.button(`${item.description}\n§7(${item.keyName}): §f${config[item.keyName]}`);
            actualEditableKeys.push(item);
        }
    });

    const callingPanelState = getCurrentTopOfNavStack(player.id); // This should be configEditingRootPanel
    form.button(getString('common.button.back'), 'textures/ui/undo');
    const backButtonIndex = actualEditableKeys.length;

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === undefined) {
            if (callingPanelState && callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(player, 'configEditingRootPanel', dependencies, {});
            return;
        }
        if (response.selection === backButtonIndex) {
            if (callingPanelState && callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(player, 'configEditingRootPanel', dependencies, {});
            return;
        }

        const selectedKeyConfig = actualEditableKeys[response.selection];
        if (selectedKeyConfig) {
            // Pass the ID of the panel that called *this* list, so the edit form can return here.
            const editFormContext = {
                keyName: selectedKeyConfig.keyName,
                keyType: selectedKeyConfig.type,
                currentValue: config[selectedKeyConfig.keyName],
                parentPanelForEdit: callingPanelState ? callingPanelState.panelId : 'configEditingRootPanel', // Panel to return to after editing
                parentContextForEdit: callingPanelState ? callingPanelState.context : {}
            };
            // We are not using openPanel here, but a direct function call that shows a modal.
            // For "Back" from the modal (if it had one) or after completion, it needs to know where to return.
            // The function showEditSingleConfigValueFormImpl will handle its own UI and then call showConfigCategoriesListImpl to refresh.
            await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, editFormContext);
        }
    } catch (e) {
        console.error(`[UiManager.showConfigCategoriesListImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        if (callingPanelState && callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'configEditingRootPanel', dependencies, {});
    }
}

/**
 * Shows a modal form to edit a single configuration value.
 * After edit attempt (success, error, or cancellation), it calls `showConfigCategoriesListImpl`
 * to refresh the list of configuration keys.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object. Must provide:
 * @param {string} context.keyName - The configuration key to edit.
 * @param {'string'|'number'|'boolean'} context.keyType - The type of the configuration key.
 * @param {any} context.currentValue - The current value of the key (used for placeholder/default).
 * @param {string} context.parentPanelForEdit - The panelId of the list panel (e.g., 'configCategoriesList' or its host panel).
 * @param {object} context.parentContextForEdit - The context of the list panel, to allow returning to it correctly.
 */
async function showEditSingleConfigValueFormImpl(player, dependencies, context) {
    const { playerUtils, config, getString, logManager } = dependencies;
    const { keyName, keyType, currentValue, parentPanelForEdit, parentContextForEdit } = context;

    playerUtils.debugLog(`[UiManager.showEditSingleConfigValueFormImpl] Editing ${keyName} for ${player.nameTag}`, player.nameTag, dependencies);

    if (!keyName || typeof keyType === 'undefined') { // currentValue can be null/false
        player.sendMessage("§cConfiguration key details missing for edit form.");
        if (parentPanelForEdit) await showPanel(player, parentPanelForEdit, dependencies, parentContextForEdit);
        return;
    }

    const modal = new ModalFormData().title(`Edit: ${keyName} (${keyType})`);
    let originalValue = config[keyName];

    switch (keyType) {
        case 'boolean':
            modal.toggle(`New value for ${keyName}:`, typeof originalValue === 'boolean' ? originalValue : false);
            break;
        case 'number':
            modal.textField(`New value for ${keyName} (number):`, typeof originalValue === 'number' ? originalValue.toString() : "0", typeof originalValue === 'number' ? originalValue.toString() : "0");
            break;
        case 'string':
            modal.textField(`New value for ${keyName} (string):`, typeof originalValue === 'string' ? originalValue : "", typeof originalValue === 'string' ? originalValue : "");
            break;
        default:
            player.sendMessage(`§cUnsupported config type "${keyType}" for UI editing of key "${keyName}".`);
            if (parentPanelForEdit) await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit); // Re-call the list
            return;
    }

    try {
        const response = await modal.show(player);
        if (response.canceled) {
            // Re-show the list of config keys
            await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
            return;
        }

        let newValue = response.formValues[0];
        let updateSuccess = false;
        let parseError = false;

        switch (keyType) {
            case 'boolean':
                config[keyName] = !!newValue;
                updateSuccess = true;
                break;
            case 'number':
                const numVal = parseFloat(newValue);
                if (!isNaN(numVal)) {
                    config[keyName] = numVal;
                    updateSuccess = true;
                } else {
                    player.sendMessage("§cInvalid number entered. Value not changed.");
                    parseError = true;
                }
                break;
            case 'string':
                config[keyName] = String(newValue);
                updateSuccess = true;
                break;
        }

        if (updateSuccess) {
            player.sendMessage(`§aConfig "${keyName}" updated to: ${config[keyName]}`);
            logManager?.addLog({ adminName: player.nameTag, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
        }

        // After edit attempt, always go back to the list of config keys
        // This will show the updated value.
        await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);

    } catch (e) {
        console.error(`[UiManager.showEditSingleConfigValueFormImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
    }
}


/**
 * Handles the confirmation (via modal) and execution of clearing global chat.
 * Navigates back to the calling panel (typically serverManagementPanel) afterwards.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel.
 */
async function confirmClearChatImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.confirmClearChatImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    await _showConfirmationModal(
        player,
        "§l§cConfirm Clear Chat§r",
        "Are you sure you want to clear the global chat for all players?",
        "§cConfirm Clear Chat",
        async () => {
            const clearChatCommand = commandExecutionMap?.get('clearchat');
            if (clearChatCommand) {
                await clearChatCommand(player, [], dependencies);
            } else {
                player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
            }
        },
        dependencies
    );
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'serverManagementPanel', dependencies, {});
}

/**
 * Handles the confirmation (via modal) and execution of clearing ground items/entities (lag clear).
 * Navigates back to the calling panel (typically serverManagementPanel) afterwards.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel.
 */
async function confirmLagClearImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.confirmLagClearImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    await _showConfirmationModal(
        player,
        "§l§cConfirm Lag Clear§r",
        "Are you sure you want to clear all ground items and non-player/non-persistent entities? This may cause lag temporarily.",
        "§cConfirm Lag Clear",
        async () => {
            const lagClearCommand = commandExecutionMap?.get('lagclear');
            if (lagClearCommand) {
                await lagClearCommand(player, [], dependencies);
            } else {
                player.sendMessage("§eNo 'lagclear' command configured. Performing basic item clear as fallback.");
                try {
                    await player.runCommandAsync("kill @e[type=item]");
                    player.sendMessage("§aGround items cleared.");
                } catch (e) {
                    player.sendMessage("§cBasic item clear failed: " + e.message);
                    console.error("[UiManager.confirmLagClearImpl] Basic item clear failed: " + e);
                }
            }
        },
        dependencies
    );
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'serverManagementPanel', dependencies, {});
}

/**
 * Shows a modal form to get a player name and confirm resetting their flags.
 * Executes the resetflags command.
 * @async
 */
async function showResetFlagsFormImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.nameTag;

    playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    const modalForm = new ModalFormData()
        .title("§l§eReset Player Flags§r")
        .textField("Player Name to Reset Flags For:", "Enter exact player name")
        .toggle("§cConfirm Resetting All Flags", false);

    try {
        const response = await modalForm.show(player);
        // Determine calling panel before potential async operations alter stack
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };

        if (response.canceled) {
            player.sendMessage("§7Flag reset action cancelled.");
        } else {
            const [targetPlayerName, confirmed] = response.formValues;

            if (!targetPlayerName || targetPlayerName.trim() === "") {
                player.sendMessage(getString('common.error.nameEmpty'));
                await UI_ACTION_FUNCTIONS.showResetFlagsForm(player, dependencies, context);
                return;
            }
            if (!confirmed) {
                player.sendMessage("§eFlag reset not confirmed. Action cancelled.");
            } else {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName.trim()], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            }
        }
        // Always return to the calling panel after the modal interaction
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {}); // Fallback
    } catch (error) {
        console.error(`[UiManager.showResetFlagsFormImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiResetFlagsForm', context: 'uiManager.showResetFlagsFormImpl', adminName: adminPlayerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {});
    }
}

/**
 * Displays a list of currently watched online players in a modal.
 * @async
 */
async function showWatchedPlayersListImpl(player, dependencies, context) {
    const { playerUtils, getString, playerDataManager, mc, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    let messageBody = "§gCurrently watched players (online):\n§r";
    const onlinePlayers = mc.world.getAllPlayers();
    const watchedOnline = [];
    onlinePlayers.forEach(p => {
        const pData = playerDataManager.getPlayerData(p.id);
        if (pData?.isWatched) {
            watchedOnline.push(p.nameTag);
        }
    });

    if (watchedOnline.length === 0) {
        messageBody += "No players are currently being watched or online.";
    } else {
        messageBody += watchedOnline.map(name => `- ${name}`).join("\n");
    }

    const modal = new ModalFormData()
        .title("§l§bWatched Players§r")
        .content(messageBody);
    modal.button1(getString('common.button.ok'));

    try {
        await modal.show(player);
    } catch (error) {
        console.error(`[UiManager.showWatchedPlayersListImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiWatchedPlayersList', context: 'uiManager.showWatchedPlayersListImpl', adminName: adminPlayerName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    }
    // After modal, return to the calling panel.
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
    if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'playerManagementPanel', dependencies, {});
}

/**
 * Displays all action logs (up to a limit) in a modal.
 * Navigates back to the calling panel (typically serverManagementPanel) after the modal is dismissed.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel.
 */
async function displayActionLogsModalImpl(player, dependencies, context) {
    const { playerUtils, logManager, getString } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.displayActionLogsModalImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

    let logText = "§g--- All Action Logs ---\n§r";
    const logs = logManager.getLogs ? logManager.getLogs() : [];

    if (!logs || logs.length === 0) {
        logText += "No action logs found.";
    } else {
        const maxLogsToShow = 50; // Configurable?
        const startIndex = Math.max(0, logs.length - maxLogsToShow);
        for (let i = startIndex; i < logs.length; i++) {
            const log = logs[i];
            if (!log) continue;
            const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
            let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
            if (log.targetName) entry += ` §b-> ${log.targetName}`;

            let detailsString = '';
            if (log.details) {
                if (typeof log.details === 'string') {
                    detailsString = log.details;
                } else if (typeof log.details === 'object') {
                    const detailParts = [];
                    if (log.details.reason) detailParts.push(`Reason: ${log.details.reason}`);
                    if (log.details.durationDisplay) detailParts.push(`Duration: ${log.details.durationDisplay}`);
                    for(const key in log.details) { // Avoid redundant common details
                        if (key !== 'reason' && key !== 'durationDisplay' && !['rawErrorStack', 'stack', 'errorCode', 'message'].includes(key) && Object.prototype.hasOwnProperty.call(log.details, key)) {
                            detailParts.push(`${key}: ${log.details[key]}`);
                        }
                    }
                    detailsString = detailParts.join(', ');
                }
            }
            if (detailsString) entry += ` §7(${detailsString})§r`;
            logText += entry + "\n";
        }
        if (logs.length > maxLogsToShow) {
            logText += `\n§o(Showing latest ${maxLogsToShow} of ${logs.length} entries. More may exist.)§r`;
        }
    }

    const modal = new ModalFormData()
        .title("§l§3Action Logs (All)§r")
        .content(logText.trim());
    modal.button1(getString('common.button.ok'));

    try {
        await modal.show(player);
    } catch (error) {
        console.error(`[UiManager.displayActionLogsModalImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.displayActionLogsModalImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiActionLogsModal', context: 'uiManager.displayActionLogsModalImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    } finally {
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {});
    }
}

/**
 * Shows a modal to get a player name for filtering moderation logs.
 * Upon submission, it navigates to the `logViewerPanel` with the filter name in the context.
 * If cancelled, it returns to the calling panel (typically modLogSelectionPanel).
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel, may contain existing `playerNameFilter`.
 */
async function showModLogFilterModalImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showModLogFilterModalImpl] Requested by ${adminPlayerName}, current context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);

    const modal = new ModalFormData()
        .title("Filter Logs by Player")
        .textField("Player Name (leave blank to clear filter):", "Enter player name", context.playerNameFilter || "");

    try {
        const response = await modal.show(player);
        if (response.canceled) {
            const callingPanelState = getCurrentTopOfNavStack(player.id);
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            } else { await showPanel(player, 'modLogSelectionPanel', dependencies, {}); }
            return;
        }

        const [playerNameInput] = response.formValues;
        const newPlayerNameFilter = playerNameInput?.trim() || null;

        let feedbackMessage = newPlayerNameFilter ? `Log filter set to player: ${newPlayerNameFilter}.` : "Log player filter cleared.";
        player.sendMessage(feedbackMessage);

        const nextContext = { ...context, playerNameFilter: newPlayerNameFilter, currentPage: 1 };

        // This function is called from modLogSelectionPanel. After getting filter, go to logViewerPanel.
        // showPanel will handle pushing 'modLogSelectionPanel' to stack.
        await showPanel(player, 'logViewerPanel', dependencies, nextContext);

    } catch (error) {
        console.error(`[UiManager.showModLogFilterModalImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showModLogFilterModalImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiModLogFilterModal', context: 'uiManager.showModLogFilterModalImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'modLogSelectionPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'modLogSelectionPanel', dependencies, {});
    }
}

/**
 * Displays a page of specific (filtered) logs in a modal (currently).
 * This function expects `logTypeFilter`, `logTypeName`, and optionally `playerNameFilter` and `currentPage` in its context.
 * After the modal is dismissed, it navigates back to the `logViewerPanel` with the same context,
 * allowing `logViewerPanel` to potentially offer pagination or further actions.
 * @async
 * @param {import('@minecraft/server').Player} player - The admin player.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object. Expected properties:
 * @param {string[]} [context.logTypeFilter=[]] - Array of log action types to filter by.
 * @param {string} [context.logTypeName='Selected'] - Display name for the type of logs being viewed.
 * @param {string|null} [context.playerNameFilter=null] - Optional player name to filter logs by.
 * @param {number} [context.currentPage=1] - Current page number for pagination.
 */
async function displaySpecificLogsPageImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils.debugLog(`[UiManager.displaySpecificLogsPageImpl] For ${adminPlayerName}, Context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);

    const { logTypeFilter = [], logTypeName = 'Selected', playerNameFilter = null, currentPage = 1 } = context;
    const logsPerPage = 5; // Make this configurable?

    let message = `§g--- ${logTypeName} Logs ${playerNameFilter ? `for ${playerNameFilter}` : ''} (Page ${currentPage}) ---\n§r`;

    const filteredLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, playerNameFilter) : [];

    if (!filteredLogs || filteredLogs.length === 0) {
        message += `No ${logTypeName.toLowerCase()} logs found${playerNameFilter ? ` for ${playerNameFilter}` : ''}.`;
    } else {
        const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);

        if (currentPage > totalPages && totalPages > 0) {
             message += `Invalid page. Max pages: ${totalPages}.`;
        } else {
            for (let i = startIndex; i < endIndex; i++) {
                const log = filteredLogs[i];
                 if (!log) continue;
                const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
                let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
                if (log.targetName) entry += ` §b-> ${log.targetName}`;
                // Simplified details for this view
                let detailsString = '';
                 if(log.details?.reason) detailsString += `Reason: ${log.details.reason}`;
                 if(log.details?.durationDisplay) detailsString += `${detailsString ? ', ' : ''}Duration: ${log.details.durationDisplay}`;
                if (detailsString) entry += ` §7(${detailsString})§r`;
                message += entry + "\n";
            }
            message += `\n§oPage ${currentPage}/${totalPages}. Total: ${filteredLogs.length}§r`;
        }
    }

    // This should ideally be an ActionFormData with "Next Page", "Prev Page" buttons
    // For now, a simple modal display of the current page.
    const modal = new ModalFormData().title(`${logTypeName} Logs`).content(message.trim());
    modal.button1(getString('common.button.ok')); // In a real scenario, this would be "Back" or part of a more complex form.

    try {
        await modal.show(player);
    } catch (error) {
        // ... error handling ...
         player.sendMessage(getString('common.error.genericForm'));
    } finally {
        // Return to the logViewerPanel, allowing it to decide next steps (e.g. show pagination buttons)
        // The context for logViewerPanel should include these filters and page.
        await showPanel(player, 'logViewerPanel', dependencies, context);
    }
}


/**
 * Generic function to display a panel based on its definition from `panelLayoutConfig.js`.
 * Handles dynamic button generation, permission filtering, item sorting, title/text interpolation,
 * 'Back'/'Exit' button logic, navigation stack management, and action dispatching.
 * Also manages navigation to a dedicated error panel (`errorDisplayPanel`) if errors occur during panel processing.
 * @async
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {string} panelId The ID of the panel to display (must be a key in `panelDefinitions`).
 * @param {import('../types.js').Dependencies} dependencies Standard command dependencies.
 * @param {object} [currentContext={}] Optional context object for the panel.
 *        This context is used for:
 *        - Interpolating placeholders in panel titles and button texts (e.g., `{playerName}`).
 *        - Passed to `actionType: 'functionCall'` functions.
 *        - Passed to `actionType: 'openPanel'` sub-panels, potentially filtered by `actionContextVars`.
 *        - For `errorDisplayPanel`, may contain `errorMessage`, `originalPanelId`, `previousPanelIdOnError`, `previousContextOnError`.
 */
async function showPanel(player, panelId, dependencies, currentContext = {}) {
    const { playerUtils, logManager, getString, permissionLevels, rankManager } = dependencies;
    const viewingPlayerName = player.nameTag; // For logging

    playerUtils?.debugLog(`[UiManager.showPanel] Player: ${viewingPlayerName}, PanelID: ${panelId}, Context: ${JSON.stringify(currentContext)}`, viewingPlayerName, dependencies);

    const panelDefinition = panelDefinitions[panelId];

    if (!panelDefinition) {
        console.error(`[UiManager.showPanel] Error: Panel definition for panelId "${panelId}" not found.`);
        logManager?.addLog({
            actionType: 'errorUiMissingPanelDef',
            context: 'uiManager.showPanel',
            adminName: viewingPlayerName,
            details: { panelId, context: currentContext, errorMessage: `Panel definition for "${panelId}" not found.` },
        }, dependencies);
        // Don't show generic error message yet, try to show the error panel
        // If error panel itself is missing, then it's a bigger issue.
        if (panelId !== 'errorDisplayPanel' && panelDefinitions['errorDisplayPanel']) {
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `Panel definition for "${panelId}" is missing. Please report this.`,
                originalPanelId: panelId, // For context, if needed by error panel logic
                originalContext: currentContext,
                previousPanelIdOnError: null // No real "previous" if the target panel def is missing
            });
        } else {
            player.sendMessage(getString('common.error.criticalUiError')); // Critical if error panel itself fails
            clearPlayerNavStack(player.id);
        }
        return;
    }

    // Interpolate title
    let panelTitle = panelDefinition.title;
    for (const key in currentContext) {
        if (Object.prototype.hasOwnProperty.call(currentContext, key)) {
            panelTitle = panelTitle.replace(new RegExp(`{${key}}`, 'g'), String(currentContext[key]));
        }
    }

    const form = new ActionFormData().title(panelTitle);

    const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    const permittedItems = panelDefinition.items
        .filter(item => userPermLevel <= item.requiredPermLevel)
        .sort((a, b) => a.sortId - b.sortId);

    permittedItems.forEach(item => {
        let buttonText = item.text;
        for (const key in currentContext) {
            if (Object.prototype.hasOwnProperty.call(currentContext, key)) {
                buttonText = buttonText.replace(new RegExp(`{${key}}`, 'g'), String(currentContext[key]));
            }
        }
        form.button(buttonText, item.icon);
    });

    // Back/Exit button logic
    let atRootLevel = isNavStackAtRoot(player.id) || !panelDefinition.parentPanelId;
    // Special handling for errorDisplayPanel: its "Back" should not clear stack if there's something to go back to.
    // It's effectively always a "go back to previous valid state" rather than an "exit".
    if (panelId === 'errorDisplayPanel') {
        const stack = playerNavigationStacks.get(player.id) || [];
        // If error panel is shown and stack has 1 (the error panel state itself) or 0 items, it's an exit.
        // If it has more (e.g. [goodPanel, errorPanelState]), back should go to goodPanel.
        atRootLevel = stack.length <= 1;
    }

    const backExitButtonText = atRootLevel ? getString('common.button.close') : getString('common.button.back');
    const backExitButtonIcon = atRootLevel ? 'textures/ui/cancel' : 'textures/ui/undo';

    // Only add the back/exit button if it's not the error panel *and* the error panel has no specific items defined for interaction.
    // Or if it *is* the error panel, it should always have a back/exit button.
    // The error panel itself might have specific items like "Retry" in the future.
    // For now, error panel always gets a back/exit. Other panels get it if they are not empty or special.
    if (panelId === 'errorDisplayPanel' || permittedItems.length > 0 || panelDefinition.items.length === 0) { // ensure back button even if items are filtered out
        form.button(backExitButtonText, backExitButtonIcon);
    }
    const backExitButtonIndex = permittedItems.length; // This button is added last (if it was added)


    // If the panel is the errorDisplayPanel, use the errorMessage from context for the body.
    if (panelId === 'errorDisplayPanel' && currentContext.errorMessage) {
        form.body(String(currentContext.errorMessage));
    } else if (permittedItems.length === 0 && panelDefinition.items.length > 0) {
        // If items were defined but all got filtered out by permissions
        form.body(getString('ui.common.noPermissionForPanelItems'));
    } else if (permittedItems.length === 0 && !form.buttonCount > 0) { // No items and no back button yet
        form.body(getString('ui.common.noOptionsAvailable'));
    }


    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId} cancelled by ${viewingPlayerName}. Reason: ${response.cancelationReason}`, viewingPlayerName, dependencies);
            // If a top-level panel is cancelled, clear its history.
            if (atRootLevel) {
                clearPlayerNavStack(player.id);
            }
            return;
        }

        const selection = response.selection;
        if (typeof selection === 'undefined') return;

        if (selection < permittedItems.length) { // A dynamic item was selected
            const selectedItemConfig = permittedItems[selection];
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Player ${viewingPlayerName} selected item: ${selectedItemConfig.id}`, viewingPlayerName, dependencies);

            if (selectedItemConfig.actionType === 'openPanel') {
                let nextContext = { ...currentContext, ...(selectedItemConfig.initialContext || {}) };
                if (selectedItemConfig.actionContextVars && selectedItemConfig.actionContextVars.length > 0) {
                    const extractedContext = {};
                    selectedItemConfig.actionContextVars.forEach(varName => {
                        if (currentContext[varName] !== undefined) {
                            extractedContext[varName] = currentContext[varName];
                        }
                    });
                    nextContext = { ...nextContext, ...extractedContext };
                }

                pushToPlayerNavStack(player.id, panelId, currentContext);
                await showPanel(player, selectedItemConfig.actionValue, dependencies, nextContext);

            } else if (selectedItemConfig.actionType === 'functionCall') {
                const funcToCall = UI_ACTION_FUNCTIONS[selectedItemConfig.actionValue];
                if (funcToCall && typeof funcToCall === 'function') {
                    let functionContext = { ...currentContext, ...(selectedItemConfig.initialContext || {}) };
                    await funcToCall(player, dependencies, functionContext);
                } else {
                    playerUtils?.debugLog(`[UiManager.showPanel] Misconfigured functionCall for item ${selectedItemConfig.id} in panel ${panelId}. Function "${selectedItemConfig.actionValue}" not found in UI_ACTION_FUNCTIONS.`, viewingPlayerName, dependencies);
                    player.sendMessage(getString('common.error.genericForm'));
                    await showPanel(player, panelId, dependencies, currentContext);
                }
            } else {
                playerUtils?.debugLog(`[UiManager.showPanel] Unknown actionType "${selectedItemConfig.actionType}" for item ${selectedItemConfig.id} in panel ${panelId}.`, viewingPlayerName, dependencies);
                await showPanel(player, panelId, dependencies, currentContext);
            }
        } else if (selection === backExitButtonIndex) {
            if (atRootLevel) {
                playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId} (top-level) exited by ${viewingPlayerName}.`, viewingPlayerName, dependencies);
                clearPlayerNavStack(player.id);
            } else {
                const previousPanelState = popFromPlayerNavStack(player.id);
                if (previousPanelState) {
                    playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Player ${viewingPlayerName} selected Back. Navigating to ${previousPanelState.panelId}.`, viewingPlayerName, dependencies);
                    await showPanel(player, previousPanelState.panelId, dependencies, previousPanelState.context);
                } else {
                    playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Player ${viewingPlayerName} selected Back, but nav stack was empty. Clearing stack.`, viewingPlayerName, dependencies);
                    clearPlayerNavStack(player.id);
                }
            }
        } else {
            playerUtils?.debugLog(`[UiManager.showPanel] Invalid selection ${selection} in panel ${panelId} by ${viewingPlayerName}.`, viewingPlayerName, dependencies);
        }

    } catch (error) {
        console.error(`[UiManager.showPanel] Error processing panel ${panelId} for ${viewingPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showPanel] Error processing panel ${panelId} for ${viewingPlayerName}: ${error.message}`, viewingPlayerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiGenericPanelShow',
            context: `uiManager.showPanel.${panelId}`,
            adminName: viewingPlayerName,
            details: { panelId, context: currentContext, errorMessage: error.message, stack: error.stack },
        }, dependencies);
        player.sendMessage(getString('common.error.genericForm')); // Fallback message

        // Try to determine the panel state *before* the one that caused the error.
        const navStack = playerNavigationStacks.get(player.id) || [];
        let previousValidPanelState = null;
        if (navStack.length > 0) { // Current (failed) panel might be on stack
            // If the current panelId that failed is on top, pop it to get to the one before.
            const topOfStack = navStack[navStack.length - 1];
            if (topOfStack.panelId === panelId) {
                popFromPlayerNavStack(player.id); // Remove the failed panel state
                if (navStack.length > 0) { // Check if stack is not empty after pop
                    previousValidPanelState = navStack[navStack.length - 1];
                }
            } else {
                // This case is tricky: error happened, but current panelId isn't top of stack.
                // This could be an error within a modal (functionCall) that didn't push itself.
                // The top of stack IS the panel that should be returned to.
                previousValidPanelState = topOfStack;
            }
        }

        if (panelId !== 'errorDisplayPanel' && panelDefinitions['errorDisplayPanel']) {
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `An error occurred while processing panel "${panelId}".\nDetails: ${error.message}`,
                originalPanelId: panelId,
                originalContext: currentContext,
                // Pass the ID and context of the panel to return to if "Back" is pressed on error panel
                previousPanelIdOnError: previousValidPanelState ? previousValidPanelState.panelId : null,
                previousContextOnError: previousValidPanelState ? previousValidPanelState.context : null
            });
        } else { // Critical error (e.g., error panel itself is broken or not defined)
            player.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id); // Clear stack to prevent loops
        }
    }
}

const UI_ACTION_FUNCTIONS = {
    // --- User Panel Leaf Functions (Modals) ---
    /**
     * Displays player stats in a modal.
     * @param {import('@minecraft/server').Player} player - The player viewing their stats.
     * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
     * @param {object} context - The context for this panel.
     */
    showMyStatsPageContent: async (player, dependencies, context) => {
        const { playerUtils, playerDataManager, getString } = dependencies;
        playerUtils.debugLog(`Action: showMyStatsPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const pData = playerDataManager.getPlayerData(player.id);
        const totalFlags = pData?.flags?.totalFlags ?? 0;
        let bodyText = totalFlags === 0 ? 'You currently have no flags!' : `You have ${totalFlags} flags.`;
        const location = player.location;
        const dimensionName = playerUtils.formatDimensionName(player.dimension.id);
        bodyText += `\nLocation: X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)} in ${dimensionName}`;
        const modal = new ModalFormData().title('§l§bYour Stats§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    /**
     * Displays server rules in a modal.
     * @param {import('@minecraft/server').Player} player - The player viewing the rules.
     * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
     * @param {object} context - The context for this panel.
     */
    showServerRulesPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showServerRulesPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const serverRules = config?.serverRules ?? [];
        let bodyText = serverRules.length === 0 ? 'No server rules have been defined by the admin yet.' : serverRules.join('\n');
        const modal = new ModalFormData().title('§l§eServer Rules§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    /**
     * Displays helpful links in a modal.
     * @param {import('@minecraft/server').Player} player - The player viewing the links.
     * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
     * @param {object} context - The context for this panel.
     */
    showHelpfulLinksPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showHelpfulLinksPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const helpfulLinks = config?.helpfulLinks ?? [];
        let linksBody = "";
        if (helpfulLinks.length === 0) {
            linksBody = 'No helpful links configured.';
        } else {
            linksBody = helpfulLinks.map(l => `§e${l.title}§r: §9§n${l.url}§r`).join('\n');
        }
        const modal = new ModalFormData().title("§l§9Helpful Links§r").content(linksBody);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    /**
     * Displays general tips in a modal.
     * @param {import('@minecraft/server').Player} player - The player viewing the tips.
     * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
     * @param {object} context - The context for this panel.
     */
    showGeneralTipsPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showGeneralTipsPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const generalTips = config?.generalTips ?? [];
        let bodyText = generalTips.length === 0 ? 'No general tips available at the moment.' : generalTips.join('\n\n---\n\n');
        const modal = new ModalFormData().title('General Tips').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },

    // --- Admin Panel & Sub-Panel Leaf Functions ---
    showOnlinePlayersList: showOnlinePlayersList, // This is a special case that opens a panel, not a modal leaf.
    showInspectPlayerForm: showInspectPlayerForm, // This is an older modal, might be replaced or refactored.
    showResetFlagsForm: showResetFlagsFormImpl, // Implemented
    showWatchedPlayersList: showWatchedPlayersListImpl, // Implemented

    /**
     * Displays a modal with various system information details.
     * @async
     * @param {import('@minecraft/server').Player} player - The player viewing the info.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object (not actively used by this function but part of standard signature).
     */
    displaySystemInfoModal: async (player, dependencies, context) => {
        const { playerUtils, config, getString, mc, logManager, playerDataManager, reportManager } = dependencies;
        const viewingPlayerName = player.nameTag;
        playerUtils?.debugLog(`[UiManager.displaySystemInfoModal] Requested by ${viewingPlayerName}`, viewingPlayerName, dependencies);
        let infoText = `§g--- System Information ---\n§r`;
        infoText += `AntiCheat Version: §e${config.addonVersion}\n`;
        infoText += `Server Time: §e${new Date().toLocaleTimeString()}\n`;
        infoText += `Current Game Tick: §e${mc.system.currentTick}\n`;
        const onlinePlayersInstance = mc.world.getAllPlayers();
        infoText += `Online Players: §e${onlinePlayersInstance.length}\n`;
        if (playerDataManager?.getAllPlayerDataCount) { infoText += `Cached PlayerData Entries: §e${playerDataManager.getAllPlayerDataCount()}\n`; }
        let watchedCount = 0;
        onlinePlayersInstance.forEach(p => { const pData = playerDataManager?.getPlayerData(p.id); if (pData?.isWatched) watchedCount++; });
        infoText += `Watched Players (Online): §e${watchedCount}\n`;
        if (playerDataManager?.getPersistentMuteCount) { infoText += `Active Mutes (Persistent): §e${playerDataManager.getPersistentMuteCount()}\n`; }
        if (playerDataManager?.getPersistentBanCount) { infoText += `Active Bans (Persistent): §e${playerDataManager.getPersistentBanCount()}\n`; }
        if (dependencies.worldBorderManager?.getActiveBorderCount) { infoText += `Active World Borders: §e${dependencies.worldBorderManager.getActiveBorderCount()}\n`; }
        if (logManager?.getInMemoryLogCount) { infoText += `LogManager Entries (In-Memory): §e${logManager.getInMemoryLogCount()}\n`; }
        if (reportManager?.getInMemoryReportCount) { infoText += `ReportManager Entries (In-Memory): §e${reportManager.getInMemoryReportCount()}\n`; }
        const modal = new ModalFormData().title("§l§bSystem Information§r").content(infoText);
        modal.button1(getString('common.button.ok'));
        try { await modal.show(player); } catch (error) {
            console.error(`[UiManager.displaySystemInfoModal] Error for ${viewingPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.displaySystemInfoModal] Error: ${error.message}`, viewingPlayerName, dependencies);
            logManager?.addLog({ actionType: 'errorUiSystemInfoModal', context: 'uiManager.displaySystemInfoModal', adminName: viewingPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        }
        // After modal, return to the calling panel.
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {}); // Fallback
    },
    confirmClearChat: confirmClearChatImpl, // Implemented
    confirmLagClear: confirmLagClearImpl, // Implemented
    showConfigCategoriesList: showConfigCategoriesListImpl, // Implemented
    showEditSingleConfigValueForm: showEditSingleConfigValueFormImpl, // Implemented
    displayActionLogsModal: displayActionLogsModalImpl, // Implemented
    showModLogFilterModal: showModLogFilterModalImpl, // Implemented
    displaySpecificLogsPage: displaySpecificLogsPageImpl, // Implemented

    /**
     * Displays a modal with detailed flag information for a target player.
     * After the modal is dismissed, it navigates back to the `playerActionsPanel` with the original context.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player viewing the flags.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player whose flags are being viewed.
     * @param {string} context.targetPlayerName - The name of the player whose flags are being viewed.
     */
    displayDetailedFlagsModal: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, playerDataManager } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for viewing flags."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        playerUtils?.debugLog(`[UiManager.displayDetailedFlagsModal] Admin: ${adminPlayerName} viewing flags for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const targetPData = playerDataManager.getPlayerData(targetPlayerId || targetPlayerName);
        let bodyText = `§g--- Flags for ${targetPlayerName} ---\n§rTotal Flags: ${targetPData?.flags?.totalFlags ?? 0}\n\n`;
        if (!targetPData || !targetPData.flags || targetPData.flags.totalFlags === 0) { bodyText += 'No flags recorded for this player.'; }
        else {
            let specificFlagsFound = false;
            for (const flagKey in targetPData.flags) {
                if (flagKey === 'totalFlags' || flagKey === 'lastFlagTime' || flagKey === 'lastFlagType') continue;
                const flagInfo = targetPData.flags[flagKey];
                if (flagInfo && typeof flagInfo.count === 'number' && flagInfo.count > 0) {
                    const lastTime = flagInfo.lastDetectionTime ? new Date(flagInfo.lastDetectionTime).toLocaleString() : 'N/A';
                    bodyText += `§e${flagKey}: §f${flagInfo.count} §7(Last: ${lastTime})§r\n`;
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) { bodyText += 'No specific active flags with counts > 0.'; }
        }
        const modal = new ModalFormData().title(`§l§3Flags: ${targetPlayerName}§r`).content(bodyText.trim());
        modal.button1(getString('common.button.ok'));
        try { await modal.show(player); }
        catch (error) { console.error(`[UiManager.displayDetailedFlagsModal] Error for ${adminPlayerName} viewing flags of ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.displayDetailedFlagsModal] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiDetailedFlagsModal', context: 'uiManager.displayDetailedFlagsModal', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); player.sendMessage(getString('common.error.genericForm'));}
        finally { await showPanel(player, 'playerActionsPanel', dependencies, context); }
    },

    /**
     * Shows a modal form to collect ban duration and reason for a target player.
     * Executes the ban command upon submission.
     * After interaction (submit, cancel, error), it navigates back to the `playerActionsPanel` with the original context.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the ban.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player to ban.
     * @param {string} context.targetPlayerName - The name of the player to ban.
     */
    showBanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for ban form."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Admin: ${adminPlayerName} opening ban form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const modalForm = new ModalFormData().title(`§l§4Ban ${targetPlayerName}§r`)
            .textField('Ban duration (e.g., 7d, 1mo, perm):', config?.banCommand?.defaultDurationPlaceholder ?? 'Enter duration or "perm"', config?.banCommand?.defaultDuration ?? "perm")
            .textField('Reason for banning:', config?.banCommand?.defaultReasonPlaceholder ?? 'Enter ban reason', config?.banCommand?.defaultReason ?? "");
        try {
            const response = await modalForm.show(player);
            if (response.canceled) { player.sendMessage('§7Ban action cancelled.'); }
            else {
                const [duration, reason] = response.formValues;
                if (!reason || reason.trim() === "") { player.sendMessage(getString('common.error.reasonEmpty')); await showBanFormForPlayer(player, dependencies, context); return; }
                const banCommand = commandExecutionMap?.get('ban');
                if (banCommand) { await banCommand(player, [targetPlayerName, duration || (config?.banCommand?.defaultDuration ?? "perm"), ...reason.split(' ')], dependencies); }
                else { player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'ban' })); }
            }
        } catch (error) { console.error(`[UiManager.showBanFormForPlayer] Error for ${adminPlayerName} banning ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiBanForm', context: 'uiManager.showBanFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); player.sendMessage(getString('common.error.genericForm'));}
        finally { await showPanel(player, 'playerActionsPanel', dependencies, context); }
    },
    /**
     * Shows a modal form to collect a reason for kicking a target player.
     * Executes the kick command upon submission.
     * After interaction, it navigates back to the `playerActionsPanel` with the original context.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the kick.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player to kick.
     * @param {string} context.targetPlayerName - The name of the player to kick.
     */
    showKickFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for kick form."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Admin: ${adminPlayerName} opening kick form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const modalForm = new ModalFormData().title(`§l§cKick ${targetPlayerName}§r`).textField('Reason for kicking (optional):', config?.kickCommand?.defaultReasonPlaceholder ?? 'Enter kick reason', config?.kickCommand?.defaultReason ?? "");
        try {
            const response = await modalForm.show(player);
            if (response.canceled) { player.sendMessage('§7Kick action cancelled.'); }
            else {
                const [reason] = response.formValues;
                const kickCommand = commandExecutionMap?.get('kick');
                if (kickCommand) { await kickCommand(player, [targetPlayerName, ...(reason ? reason.split(' ') : [])], dependencies); }
                else { player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'kick' })); }
            }
        } catch (error) { console.error(`[UiManager.showKickFormForPlayer] Error for ${adminPlayerName} kicking ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiKickForm', context: 'uiManager.showKickFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); player.sendMessage(getString('common.error.genericForm'));}
        finally { await showPanel(player, 'playerActionsPanel', dependencies, context); }
    },
    /**
     * Shows a modal form to collect duration and reason for muting a target player.
     * Executes the mute command upon submission.
     * After interaction, it navigates back to the `playerActionsPanel` with the original context.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the mute.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player to mute.
     * @param {string} context.targetPlayerName - The name of the player to mute.
     */
    showMuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for mute form."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Admin: ${adminPlayerName} opening mute form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const modalForm = new ModalFormData().title(`§l§6Mute ${targetPlayerName}§r`)
            .textField('Mute duration (e.g., 30s, 5m, 1h, perm):', config?.muteCommand?.defaultDurationPlaceholder ?? 'Enter duration or "perm"', config?.muteCommand?.defaultDuration ?? "30m")
            .textField('Reason for muting (optional):', config?.muteCommand?.defaultReasonPlaceholder ?? 'Enter mute reason', config?.muteCommand?.defaultReason ?? "");
        try {
            const response = await modalForm.show(player);
            if (response.canceled) { player.sendMessage('§7Mute action cancelled.'); }
            else {
                const [duration, reason] = response.formValues;
                const muteCommand = commandExecutionMap?.get('mute');
                if (muteCommand) { await muteCommand(player, [targetPlayerName, duration || (config?.muteCommand?.defaultDuration ?? "30m"), ...(reason ? reason.split(' ') : [])], dependencies); }
                else { player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'mute' })); }
            }
        } catch (error) { console.error(`[UiManager.showMuteFormForPlayer] Error for ${adminPlayerName} muting ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiMuteForm', context: 'uiManager.showMuteFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); player.sendMessage(getString('common.error.genericForm'));}
        finally { await showPanel(player, 'playerActionsPanel', dependencies, context); }
    },
    /**
     * Toggles the freeze state for a target player by executing the 'freeze' command.
     * Navigates back to the `playerActionsPanel` with the original context afterwards.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the action.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player to freeze/unfreeze.
     * @param {string} context.targetPlayerName - The name of the player to freeze/unfreeze.
     */
    toggleFreezePlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for freeze toggle."); await showPanel(player, 'playerActionsPanel', dependencies, context); return;}
        playerUtils?.debugLog(`[UiManager.toggleFreezePlayer] Admin: ${adminPlayerName} toggling freeze for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const freezeCommand = commandExecutionMap?.get('freeze');
        if (freezeCommand) {
            try { await freezeCommand(player, [targetPlayerName, 'toggle'], dependencies); }
            catch (error) { console.error(`[UiManager.toggleFreezePlayer] Error executing freeze command for ${targetPlayerName}: ${error.stack || error}`); player.sendMessage(getString('common.error.genericCommandError', { commandName: 'freeze', errorMessage: error.message })); logManager?.addLog({ actionType: 'errorUiFreezeToggle', context: 'uiManager.toggleFreezePlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); }
        } else { player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' })); }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * Teleports the admin player to the target player.
     * Navigates back to the `playerActionsPanel` with the original context afterwards.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player to teleport.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the target player.
     * @param {string} context.targetPlayerName - The name of the target player.
     */
    teleportAdminToPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for teleport."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer?.isValid() && targetPlayer.location && targetPlayer.dimension) {
            try {
                await player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                player.sendMessage(`§aTeleported to ${targetPlayerName}.`);
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportSelfToPlayer', targetName: targetPlayerName, details: `Admin TP to ${targetPlayerName}` }, dependencies);
            } catch (e) { player.sendMessage(`§cTeleport failed: ${e.message}`); logManager?.addLog({ actionType: 'errorUiTeleportToPlayer', context: 'uiManager.teleportAdminToPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack }}, dependencies); }
        } else { player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName })); }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * Teleports the target player to the admin player.
     * Navigates back to the `playerActionsPanel` with the original context afterwards.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player (destination).
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object. Must contain:
     * @param {string} context.targetPlayerId - The ID of the player to teleport.
     * @param {string} context.targetPlayerName - The name of the player to teleport.
     */
    teleportPlayerToAdmin: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;
        if (!targetPlayerName) { player.sendMessage("§cTarget player not specified for teleport."); await showPanel(player, 'playerActionsPanel', dependencies, context); return; }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer?.isValid() && player.location && player.dimension) {
            try {
                await targetPlayer.teleport(player.location, { dimension: player.dimension });
                player.sendMessage(`§aTeleported ${targetPlayerName} to you.`);
                targetPlayer.sendMessage('§eYou have been teleported by an admin.');
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportPlayerToAdmin', targetName: targetPlayerName, details: `Admin TP'd ${targetPlayerName} to self` }, dependencies);
            } catch (e) { player.sendMessage(`§cTeleport failed: ${e.message}`); logManager?.addLog({ actionType: 'errorUiTeleportPlayerToAdmin', context: 'uiManager.teleportPlayerToAdmin', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack }}, dependencies); }
        } else { player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName })); }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
};
        const pData = playerDataManager.getPlayerData(player.id);
        const totalFlags = pData?.flags?.totalFlags ?? 0;
        let bodyText = totalFlags === 0 ? 'You currently have no flags!' : `You have ${totalFlags} flags.`;
        const location = player.location;
        const dimensionName = playerUtils.formatDimensionName(player.dimension.id);
        bodyText += `\nLocation: X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)} in ${dimensionName}`;

        const modal = new ModalFormData().title('§l§bYour Stats§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    showServerRulesPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showServerRulesPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const serverRules = config?.serverRules ?? [];
        let bodyText = serverRules.length === 0 ? 'No server rules have been defined by the admin yet.' : serverRules.join('\n');

        const modal = new ModalFormData().title('§l§eServer Rules§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    showHelpfulLinksPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showHelpfulLinksPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const helpfulLinks = config?.helpfulLinks ?? [];
        let linksBody = "";
        if (helpfulLinks.length === 0) {
            linksBody = 'No helpful links configured.';
        } else {
            linksBody = helpfulLinks.map(l => `${l.title}: ${l.url}`).join('\n');
        }
        const modal = new ModalFormData().title("§l§9Helpful Links§r").content(linksBody);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    showGeneralTipsPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showGeneralTipsPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        const generalTips = config?.generalTips ?? [];
        let bodyText = generalTips.length === 0 ? 'No general tips available at the moment.' : generalTips.join('\n\n---\n\n');
        const modal = new ModalFormData().title('General Tips').content(bodyText);
        modal.button1(getString('common.button.ok'));
        await modal.show(player);
    },
    // Admin panel functions will be added here as they are refactored or created
    showOnlinePlayersList: showOnlinePlayersList,
    showInspectPlayerForm: showInspectPlayerForm,
    showResetFlagsForm: showResetFlagsForm,
    showWatchedPlayersList: showWatchedPlayersList,
    displaySystemInfoModal: async (player, dependencies, context) => {
        const { playerUtils, config, getString, mc, logManager, playerDataManager, reportManager } = dependencies; // Added more deps
        const viewingPlayerName = player.nameTag;

        playerUtils?.debugLog(`[UiManager.displaySystemInfoModal] Requested by ${viewingPlayerName}`, viewingPlayerName, dependencies);

        let infoText = `§g--- System Information ---\n§r`;
        infoText += `AntiCheat Version: §e${config.addonVersion}\n`;
        // mc.minecraftVersion might not be available or what's needed. Game version is usually in manifest.
        // For server specific version, it's not directly exposed.
        // infoText += `Minecraft Version: §e${mc.minecraftVersion}\n`;
        infoText += `Server Time: §e${new Date().toLocaleTimeString()}\n`;
        infoText += `Current Game Tick: §e${mc.system.currentTick}\n`;

        const onlinePlayersInstance = mc.world.getAllPlayers();
        infoText += `Online Players: §e${onlinePlayersInstance.length}\n`; // Max players not available via script

        if (playerDataManager?.getAllPlayerDataCount) {
            infoText += `Cached PlayerData Entries: §e${playerDataManager.getAllPlayerDataCount()}\n`;
        }
        let watchedCount = 0;
        onlinePlayersInstance.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id);
            if (pData?.isWatched) watchedCount++;
        });
        infoText += `Watched Players (Online): §e${watchedCount}\n`;

        if (playerDataManager?.getPersistentMuteCount) {
             infoText += `Active Mutes (Persistent): §e${playerDataManager.getPersistentMuteCount()}\n`;
        }
        if (playerDataManager?.getPersistentBanCount) {
             infoText += `Active Bans (Persistent): §e${playerDataManager.getPersistentBanCount()}\n`;
        }
        // Active world borders would need access to worldBorderManager instance
        if (dependencies.worldBorderManager?.getActiveBorderCount) {
            infoText += `Active World Borders: §e${dependencies.worldBorderManager.getActiveBorderCount()}\n`;
        }
        if (logManager?.getInMemoryLogCount) {
            infoText += `LogManager Entries (In-Memory): §e${logManager.getInMemoryLogCount()}\n`;
        }
        if (reportManager?.getInMemoryReportCount) {
            infoText += `ReportManager Entries (In-Memory): §e${reportManager.getInMemoryReportCount()}\n`;
        }

        const modal = new ModalFormData()
            .title("§l§bSystem Information§r")
            .content(infoText);
        modal.button1(getString('common.button.ok'));

        try {
            await modal.show(player);
        } catch (error) {
            console.error(`[UiManager.displaySystemInfoModal] Error for ${viewingPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.displaySystemInfoModal] Error: ${error.message}`, viewingPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorUiSystemInfoModal',
                context: 'uiManager.displaySystemInfoModal',
                adminName: viewingPlayerName,
                details: { errorMessage: error.message, stack: error.stack },
            }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        }
    },
    confirmClearChat: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
        const adminPlayerName = player.nameTag;
        playerUtils?.debugLog(`[UiManager.confirmClearChat] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            "§l§cConfirm Clear Chat§r",
            "Are you sure you want to clear the global chat for all players?",
            "§cConfirm Clear Chat",
            async () => {
                const clearChatCommand = commandExecutionMap?.get('clearchat');
                if (clearChatCommand) {
                    await clearChatCommand(player, [], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
                }
            },
            dependencies
        );
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {}); // Ensure robust fallback
    },
    confirmLagClear: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
        const adminPlayerName = player.nameTag;
        playerUtils?.debugLog(`[UiManager.confirmLagClear] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            "§l§cConfirm Lag Clear§r",
            "Are you sure you want to clear all ground items and non-player/non-persistent entities? This may cause lag temporarily.",
            "§cConfirm Lag Clear",
            async () => {
                const lagClearCommand = commandExecutionMap?.get('lagclear');
                if (lagClearCommand) {
                    await lagClearCommand(player, [], dependencies);
                } else {
                    player.sendMessage("§eNo 'lagclear' command configured. Performing basic item clear as fallback.");
                    try {
                        await player.runCommandAsync("kill @e[type=item]");
                        player.sendMessage("§aGround items cleared.");
                    } catch (e) {
                        player.sendMessage("§cBasic item clear failed: " + e.message);
                        console.error("[UiManager.confirmLagClear] Basic item clear failed: " + e);
                    }
                }
            },
            dependencies
        );
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {}); // Ensure robust fallback
    },
    showConfigCategoriesList: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: showConfigCategoriesList', player.nameTag, dependencies); player.sendMessage("Config Categories: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'configEditingRootPanel', dependencies, {});},
    showActionLogsForm: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: showActionLogsForm', player.nameTag, dependencies); player.sendMessage("Action Logs Form: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'serverManagementPanel', dependencies, {});},
    displayActionLogsModal: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.nameTag;
        playerUtils?.debugLog(`[UiManager.displayActionLogsModal] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);

        let logText = "§g--- All Action Logs ---\n§r";
        const logs = logManager.getLogs ? logManager.getLogs() : [];

        if (!logs || logs.length === 0) {
            logText += "No action logs found.";
        } else {
            const maxLogsToShow = 50;
            const startIndex = Math.max(0, logs.length - maxLogsToShow);
            for (let i = startIndex; i < logs.length; i++) {
                const log = logs[i];
                if (!log) continue;
                const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
                let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
                if (log.targetName) entry += ` §b-> ${log.targetName}`;

                let detailsString = '';
                if (log.details) {
                    if (typeof log.details === 'string') {
                        detailsString = log.details;
                    } else if (typeof log.details === 'object') {
                        const detailParts = [];
                        if (log.details.reason) detailParts.push(`Reason: ${log.details.reason}`);
                        if (log.details.durationDisplay) detailParts.push(`Duration: ${log.details.durationDisplay}`);
                        // Add other specific details if needed, avoiding redundancy
                        for(const key in log.details) {
                            if (key !== 'reason' && key !== 'durationDisplay' && key !== 'rawErrorStack' && key !== 'stack' && key !== 'errorCode' && key !== 'message') {
                                detailParts.push(`${key}: ${log.details[key]}`);
                            }
                        }
                        detailsString = detailParts.join(', ');
                    }
                }
                if (detailsString) entry += ` §7(${detailsString})§r`;
                logText += entry + "\n";
            }
            if (logs.length > maxLogsToShow) {
                logText += `\n§o(Showing latest ${maxLogsToShow} of ${logs.length} entries. More may exist.)§r`;
            }
        }

        const modal = new ModalFormData()
            .title("§l§3Action Logs (All)§r")
            .content(logText.trim());
        modal.button1(getString('common.button.ok'));

        try {
            await modal.show(player);
        } catch (error) {
            console.error(`[UiManager.displayActionLogsModal] Error for ${adminPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.displayActionLogsModal] Error: ${error.message}`, adminPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorUiActionLogsModal',
                context: 'uiManager.displayActionLogsModal',
                adminName: adminPlayerName,
                details: { errorMessage: error.message, stack: error.stack },
            }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        } finally {
            const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
            if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(player, 'serverManagementPanel', dependencies, {});
        }
    },
    displaySpecificLogsPage: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: displaySpecificLogsPage', player.nameTag, dependencies); player.sendMessage(`Displaying logs for type: ${context.logTypeName}, filter: ${context.playerNameFilter}`);const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'modLogSelectionPanel', dependencies, {});},
    displayDetailedFlagsModal: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: displayDetailedFlagsModal for ' + context.targetPlayerName, player.nameTag, dependencies); player.sendMessage(`Detailed flags modal for ${context.targetPlayerName}: Not implemented.`); const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'playerActionsPanel', dependencies, context);},

    // Player Actions Panel functions
    /**
     * Shows a modal form to collect ban duration and reason for a target player.
     * Executes the ban command and then re-displays the player actions panel.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the ban.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object.
     * @param {string} context.targetPlayerId - The ID of the player to ban.
     * @param {string} context.targetPlayerName - The name of the player to ban.
     */
    showBanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for ban form.");
            const currentPanelState = getCurrentTopOfNavStack(player.id); // This should be playerActionsPanel
            if (currentPanelState) {
                 // Re-showing the panel that tried to call this action.
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            }
            return;
        }
        playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Admin: ${adminPlayerName} opening ban form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const banFormTitle = `§l§4Ban ${targetPlayerName}§r`;
        const durationPrompt = 'Ban duration (e.g., 7d, 1mo, perm):';
        const durationPlaceholder = config?.banCommand?.defaultDurationPlaceholder ?? 'Enter duration or "perm"';
        const reasonPrompt = 'Reason for banning:';
        const reasonPlaceholder = config?.banCommand?.defaultReasonPlaceholder ?? 'Enter ban reason';
        const cancelledMessage = '§7Ban action cancelled.';

        const modalForm = new ModalFormData()
            .title(banFormTitle)
            .textField(durationPrompt, durationPlaceholder, config?.banCommand?.defaultDuration ?? "perm")
            .textField(reasonPrompt, reasonPlaceholder, config?.banCommand?.defaultReason ?? "");

        try {
            const response = await modalForm.show(player);
            if (response.canceled) {
                player.sendMessage(cancelledMessage);
                await showPanel(player, 'playerActionsPanel', dependencies, context);
                return;
            }
            const [duration, reason] = response.formValues;
            if (!reason || reason.trim() === "") {
                player.sendMessage(getString('common.error.reasonEmpty'));
                await showBanFormForPlayer(player, dependencies, context); // Re-show this modal
                return;
            }
            const banCommand = commandExecutionMap?.get('ban');
            if (banCommand) {
                const reasonParts = reason.split(' ');
                const args = [targetPlayerName, duration || (config?.banCommand?.defaultDuration ?? "perm"), ...reasonParts];
                await banCommand(player, args, dependencies);
            } else {
                player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'ban' }));
            }
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        } catch (error) {
            console.error(`[UiManager.showBanFormForPlayer] Error for ${adminPlayerName} banning ${targetPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorUiBanForm', context: 'uiManager.showBanFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName,
                details: { errorMessage: error.message, stack: error.stack },
            }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * Shows a modal form to collect reason for kicking a target player.
     * Executes the kick command and then re-displays the player actions panel.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the kick.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object.
     * @param {string} context.targetPlayerId - The ID of the player to kick.
     * @param {string} context.targetPlayerName - The name of the player to kick.
     */
    showKickFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for kick form.");
            const currentPanelState = getCurrentTopOfNavStack(player.id);
            if (currentPanelState && currentPanelState.panelId) {
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            } else {
                await showPanel(player, 'playerManagementPanel', dependencies, {}); // Fallback
            }
            return;
        }

        playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Admin: ${adminPlayerName} opening kick form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const formTitle = `§l§cKick ${targetPlayerName}§r`;
        const reasonPrompt = 'Reason for kicking (optional):';
        const reasonPlaceholder = config?.kickCommand?.defaultReasonPlaceholder ?? 'Enter kick reason';
        const cancelledMessage = '§7Kick action cancelled.';

        const modalForm = new ModalFormData()
            .title(formTitle)
            .textField(reasonPrompt, reasonPlaceholder, config?.kickCommand?.defaultReason ?? "");

        try {
            const response = await modalForm.show(player);

            if (response.canceled) {
                player.sendMessage(cancelledMessage);
            } else {
                const [reason] = response.formValues;
                const kickCommand = commandExecutionMap?.get('kick');
                if (kickCommand) {
                    const args = [targetPlayerName, ...(reason ? reason.split(' ') : [])];
                    await kickCommand(player, args, dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'kick' }));
                }
            }
        } catch (error) {
            console.error(`[UiManager.showKickFormForPlayer] Error for ${adminPlayerName} kicking ${targetPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorUiKickForm',
                context: 'uiManager.showKickFormForPlayer',
                adminName: adminPlayerName, targetName: targetPlayerName,
                details: { errorMessage: error.message, stack: error.stack },
            }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * Shows a modal form to collect duration and reason for muting a target player.
     * Executes the mute command and then re-displays the player actions panel.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the mute.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object.
     * @param {string} context.targetPlayerId - The ID of the player to mute.
     * @param {string} context.targetPlayerName - The name of the player to mute.
     */
    showMuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerId, targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for mute form.");
            const currentPanelState = getCurrentTopOfNavStack(player.id);
            if (currentPanelState && currentPanelState.panelId) {
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            } else {
                await showPanel(player, 'playerManagementPanel', dependencies, {}); // Fallback
            }
            return;
        }

        playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Admin: ${adminPlayerName} opening mute form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const formTitle = `§l§6Mute ${targetPlayerName}§r`;
        const durationPrompt = 'Mute duration (e.g., 30s, 5m, 1h, perm):';
        const durationPlaceholder = config?.muteCommand?.defaultDurationPlaceholder ?? 'Enter duration or "perm"';
        const reasonPrompt = 'Reason for muting (optional):';
        const reasonPlaceholder = config?.muteCommand?.defaultReasonPlaceholder ?? 'Enter mute reason';
        const cancelledMessage = '§7Mute action cancelled.';

        const modalForm = new ModalFormData()
            .title(formTitle)
            .textField(durationPrompt, durationPlaceholder, config?.muteCommand?.defaultDuration ?? "30m")
            .textField(reasonPrompt, reasonPlaceholder, config?.muteCommand?.defaultReason ?? "");

        try {
            const response = await modalForm.show(player);

            if (response.canceled) {
                player.sendMessage(cancelledMessage);
            } else {
                const [duration, reason] = response.formValues;
                const muteCommand = commandExecutionMap?.get('mute');
                if (muteCommand) {
                    const args = [targetPlayerName, duration || (config?.muteCommand?.defaultDuration ?? "30m"), ...(reason ? reason.split(' ') : [])];
                    await muteCommand(player, args, dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'mute' }));
                }
            }
        } catch (error) {
            console.error(`[UiManager.showMuteFormForPlayer] Error for ${adminPlayerName} muting ${targetPlayerName}: ${error.stack || error}`);
            playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies);
            logManager?.addLog({
                actionType: 'errorUiMuteForm',
                context: 'uiManager.showMuteFormForPlayer',
                adminName: adminPlayerName, targetName: targetPlayerName,
                details: { errorMessage: error.message, stack: error.stack },
            }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * Toggles the freeze state for a target player by executing the freeze command.
     * Refreshes the player actions panel afterwards.
     * @async
     * @param {import('@minecraft/server').Player} player - The admin player initiating the action.
     * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
     * @param {object} context - Context object.
     * @param {string} context.targetPlayerId - The ID of the player to freeze/unfreeze. (Currently unused by command, but good for context)
     * @param {string} context.targetPlayerName - The name of the player to freeze/unfreeze.
     */
    toggleFreezePlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for freeze toggle.");
            const currentPanelState = getCurrentTopOfNavStack(player.id);
            if (currentPanelState && currentPanelState.panelId) { // Ensure panelId exists
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            } else { // Fallback if stack is weird, go to a default or clear
                await showPanel(player, 'playerManagementPanel', dependencies, {}); // Sensible fallback
            }
            return;
        }

        playerUtils?.debugLog(`[UiManager.toggleFreezePlayer] Admin: ${adminPlayerName} toggling freeze for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const freezeCommand = commandExecutionMap?.get('freeze');
        if (freezeCommand) {
            try {
                await freezeCommand(player, [targetPlayerName, 'toggle'], dependencies);
            } catch (error) {
                console.error(`[UiManager.toggleFreezePlayer] Error executing freeze command for ${targetPlayerName}: ${error.stack || error}`);
                player.sendMessage(getString('common.error.genericCommandError', { commandName: 'freeze', errorMessage: error.message }));
                logManager?.addLog({
                    actionType: 'errorUiFreezeToggle',
                    context: 'uiManager.toggleFreezePlayer',
                    adminName: adminPlayerName,
                    targetName: targetPlayerName,
                    details: { errorMessage: error.message, stack: error.stack },
                }, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    teleportAdminToPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for teleport.");
            const currentPanelState = getCurrentTopOfNavStack(player.id);
            if (currentPanelState && currentPanelState.panelId) {
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            } else { await showPanel(player, 'playerManagementPanel', dependencies, {}); }
            return;
        }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);

        if (targetPlayer?.isValid() && targetPlayer.location && targetPlayer.dimension) {
            try {
                await player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                player.sendMessage(`§aTeleported to ${targetPlayerName}.`);
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportSelfToPlayer', targetName: targetPlayerName, details: `Admin TP to ${targetPlayerName}` }, dependencies);
            } catch (e) {
                player.sendMessage(`§cTeleport failed: ${e.message}`);
                logManager?.addLog({ actionType: 'errorUiTeleportToPlayer', context: 'uiManager.teleportAdminToPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack }}, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    teleportPlayerToAdmin: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.nameTag;
        const { targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage("§cTarget player not specified for teleport.");
            const currentPanelState = getCurrentTopOfNavStack(player.id);
            if (currentPanelState && currentPanelState.panelId) {
                await showPanel(player, currentPanelState.panelId, dependencies, currentPanelState.context);
            } else { await showPanel(player, 'playerManagementPanel', dependencies, {}); }
            return;
        }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);

        if (targetPlayer?.isValid() && player.location && player.dimension) {
            try {
                await targetPlayer.teleport(player.location, { dimension: player.dimension });
                player.sendMessage(`§aTeleported ${targetPlayerName} to you.`);
                targetPlayer.sendMessage('§eYou have been teleported by an admin.');
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportPlayerToAdmin', targetName: targetPlayerName, details: `Admin TP'd ${targetPlayerName} to self` }, dependencies);
            } catch (e) {
                player.sendMessage(`§cTeleport failed: ${e.message}`);
                logManager?.addLog({ actionType: 'errorUiTeleportPlayerToAdmin', context: 'uiManager.teleportPlayerToAdmin', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack }}, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
};

/**
 * Generic function to display a panel based on its definition.
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {string} panelId The ID of the panel to display, matching a key in panelDefinitions.
 * @param {import('../types.js').Dependencies} dependencies Standard command dependencies.
 * @param {object} [currentContext={}] Optional context object for the panel (e.g., { playerName: 'Steve', targetPlayerId: '12345' }).
 */
async function showPanel(player, panelId, dependencies, currentContext = {}) {
    const { playerUtils, logManager, getString, permissionLevels, rankManager } = dependencies;
    const viewingPlayerName = player.nameTag; // For logging

    playerUtils?.debugLog(`[UiManager.showPanel] Player: ${viewingPlayerName}, PanelID: ${panelId}, Context: ${JSON.stringify(currentContext)}`, viewingPlayerName, dependencies);

    const panelDefinition = panelDefinitions[panelId];

    if (!panelDefinition) {
        console.error(`[UiManager.showPanel] Error: Panel definition for panelId "${panelId}" not found.`);
        player.sendMessage(getString('common.error.genericForm'));
        const previousPanelState = popFromPlayerNavStack(player.id);
        if (previousPanelState) {
            if (previousPanelState.panelId !== panelId) { // Prevent loops
                 await showPanel(player, previousPanelState.panelId, dependencies, previousPanelState.context);
            } else {
                clearPlayerNavStack(player.id);
            }
        } else {
            clearPlayerNavStack(player.id);
        }
        return;
    }

    // Interpolate title
    let panelTitle = panelDefinition.title;
    for (const key in currentContext) {
        if (Object.prototype.hasOwnProperty.call(currentContext, key)) {
            panelTitle = panelTitle.replace(new RegExp(`{${key}}`, 'g'), String(currentContext[key]));
        }
    }

    const form = new ActionFormData().title(panelTitle);

    const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);
    const permittedItems = panelDefinition.items
        .filter(item => userPermLevel <= item.requiredPermLevel)
        .sort((a, b) => a.sortId - b.sortId);

    permittedItems.forEach(item => {
        let buttonText = item.text;
        for (const key in currentContext) {
            if (Object.prototype.hasOwnProperty.call(currentContext, key)) {
                buttonText = buttonText.replace(new RegExp(`{${key}}`, 'g'), String(currentContext[key]));
            }
        }
        form.button(buttonText, item.icon);
    });

    // Back/Exit button logic and Response handling logic will be added in the next segments.
    // This is a placeholder to make the function syntactically complete for this step.
}


// UI functions will be defined below using 'async function' for hoisting.
// No separate forward declarations needed for them.

/**
 * Helper function to show a generic confirmation modal.
 * This modal typically has a title, body text, and a toggle for confirmation.
 * It executes a callback if the action is confirmed.
 * @async
 * @private
 * @param {import('@minecraft/server').Player} adminPlayer - The player to show the modal to.
 * @param {string} titleString - The direct string for the modal's title.
 * @param {string} bodyString - The direct string for the modal's body content. Can use placeholders if `bodyParams` are provided.
 * @param {string} confirmToggleLabelString - The direct string for the confirmation toggle's label.
 * @param {() => Promise<void>} onConfirmCallback - Async callback function to execute if the action is confirmed.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} [bodyParams={}] - Optional parameters for formatting placeholders in `bodyString`.
 * @returns {Promise<boolean>} True if the action was confirmed and callback executed successfully, false otherwise.
 */
async function _showConfirmationModal(adminPlayer, titleString, bodyString, confirmToggleLabelString, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils, logManager, getString } = dependencies;
    const playerName = adminPlayer?.nameTag ?? 'UnknownAdmin';

    let processedBody = bodyString;
    if (bodyParams) {
        for (const placeholder in bodyParams) {
            if (Object.prototype.hasOwnProperty.call(bodyParams, placeholder)) {
                processedBody = processedBody.replace(new RegExp(`{${placeholder}}`, 'g'), String(bodyParams[placeholder]));
            }
        }
    }

    const modalForm = new ModalFormData().title(titleString).body(processedBody).toggle(confirmToggleLabelString, false);

    try {
        const response = await modalForm.show(adminPlayer);
        if (response.canceled || !response.formValues?.[0]) {
            adminPlayer?.sendMessage(getString('ui.common.actionCancelled')); // This is a common string, so getString is fine
            playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleString}' cancelled by ${playerName}.`, playerName, dependencies);
            return false; // Indicate cancellation
        }
        await onConfirmCallback();
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleString}' confirmed by ${playerName}. Action executed.`, playerName, dependencies);
        return true; // Indicate success
    } catch (error) {
        console.error(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleString}): ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleString}): ${error.message}`, playerName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiConfirmationModal',
            context: 'uiManager._showConfirmationModal',
            adminName: playerName,
            details: {
                titleString, // Log the actual string
                errorMessage: error.message,
                stack: error.stack,
            },
        }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
        return false; // Indicate failure
    }
}

/**
 * Shows a modal form to input a player name for inspection.
 * If submitted, it executes the 'inspect' command with the target player's name.
 * This function does not explicitly navigate; it's expected to be called by `showPanel`
 * (via `UI_ACTION_FUNCTIONS`), which handles the UI flow after this modal interaction.
 * @async
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player using the form.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel (not actively used by this simple modal, but part of standard signature).
 */
async function showInspectPlayerForm(adminPlayer, dependencies, context) { // Added context to signature
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
 * Shows a form listing all currently online players.
 * Allows selecting a player to view further actions.
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player viewing the list.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 */
async function showOnlinePlayersList(adminPlayer, dependencies) {
    const { playerUtils, logManager, playerDataManager, getString, mc: minecraft } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Requested by ${adminName}`, adminName, dependencies);

    const onlinePlayers = minecraft.world.getAllPlayers();
    const form = new ActionFormData()
        .title(`§l§bOnline Players (${onlinePlayers.length})§r`);

    if (onlinePlayers.length === 0) {
        form.body(getString('ui.onlinePlayers.noPlayers')); // Changed to use getString
    } else {
        form.body(getString('ui.onlinePlayers.selectPlayerPrompt')); // Changed to use getString
        onlinePlayers.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id);
            const flagCount = pData?.flags?.totalFlags ?? 0;
            // Example of a string that could be from textDatabase: 'ui.onlinePlayers.playerButtonFormat' -> "{playerName} (Flags: {flagCount})"
            // For now, keeping it as is, but this is a candidate if more complexity is added.
            form.button(`${p.nameTag} §7(Flags: ${flagCount})§r`);
        });
    }
    // Assuming 'ui.button.backToAdminPanel' is like "Back to Main Panel" or just "Back"
    // If this function is only called from playerManagementPanel, the back button should reflect that.
    // For now, this getString call is fine, assuming it's a generic back.
    form.button(getString('common.button.back'));

    try {
        const response = await form.show(adminPlayer);
        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            // If cancelled, should return to the panel that called it.
            const callerPanelState = getCurrentTopOfNavStack(adminPlayer.id);
            if (callerPanelState) {
                await showPanel(adminPlayer, callerPanelState.panelId, dependencies, callerPanelState.context);
            } else { // Fallback if stack is empty for some reason
                await showPanel(adminPlayer, 'playerManagementPanel', dependencies, {});
            }
            return;
        }
        const selection = response.selection;
        if (selection >= 0 && selection < onlinePlayers.length) {
            const targetPlayer = onlinePlayers[selection];
            if (targetPlayer?.isValid()) {
                const playerContext = { targetPlayerId: targetPlayer.id, targetPlayerName: targetPlayer.nameTag };
                // This correctly pushes playerManagementPanel (or current panel) to stack before opening playerActionsPanel
                // showOnlinePlayersList itself doesn't push to stack because it's a functionCall from a panel item
                await showPanel(adminPlayer, 'playerActionsPanel', dependencies, playerContext);
            } else {
                adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayer?.nameTag || 'Selected Player' }));
                await showOnlinePlayersList(adminPlayer, dependencies); // Refresh list
            }
        } else if (selection === onlinePlayers.length) { // Back button
            const callerPanelState = getCurrentTopOfNavStack(adminPlayer.id);
            if (callerPanelState) {
                await showPanel(adminPlayer, callerPanelState.panelId, dependencies, callerPanelState.context);
            } else {
                await showPanel(adminPlayer, 'playerManagementPanel', dependencies, {}); // Fallback
            }
        }
    } catch (error) {
        console.error(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiOnlinePlayersList', adminName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        // Use the new error panel system
        if (panelDefinitions['errorDisplayPanel']) {
            await showPanel(adminPlayer, 'errorDisplayPanel', dependencies, {
                errorMessage: `Error displaying online players list: ${error.message}`,
                originalPanelId: getCurrentTopOfNavStack(adminPlayer.id)?.panelId || 'playerManagementPanel', // Best guess for original panel
                previousPanelIdOnError: getCurrentTopOfNavStack(adminPlayer.id)?.panelId, // Panel to return to
                previousContextOnError: getCurrentTopOfNavStack(adminPlayer.id)?.context
            });
        } else {
            adminPlayer?.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(adminPlayer.id);
        }
    }
}

// Removing showAdminPanelMain, showNormalUserPanelMain, and other old stubs
// as they are superseded by the showPanel system and specific Impl functions.

// Dead code previously here has been removed.

/**
 * Main exported functions for UI management.
 * `showPanel` is the primary function for displaying all data-driven panels.
 * `clearPlayerNavStack` is used to reset navigation history for a player, typically when initiating a new top-level UI flow.
 */
export { showPanel, clearPlayerNavStack };
