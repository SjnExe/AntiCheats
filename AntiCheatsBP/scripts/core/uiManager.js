/**
 * @file Manages the display of dynamic, hierarchical UI panels and modal forms.
 * Core functionality revolves around the generic `showPanel` function, which renders
 * UI structures defined in `../core/panelLayoutConfig.js`. It also handles
 * player-specific navigation stacks for hierarchical panel traversal.
 * @module AntiCheatsBP/scripts/core/uiManager
 */
import * as mc from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from '../core/panelLayoutConfig.js';

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
    const currentTop = stack.length > 0 ? stack[stack.length - 1] : null;
    if (!currentTop || currentTop.panelId !== panelId || JSON.stringify(currentTop.context) !== JSON.stringify(context)) {
        stack.push({ panelId, context: { ...context } });
    }
}

/**
 * Pops the top panel state from the player's navigation stack.
 * @param {string} playerId The ID of the player.
 * @returns {{ panelId: string, context: object } | null} The popped panel state or null if stack is empty.
 */
function popFromPlayerNavStack(playerId) {
    if (!playerNavigationStacks.has(playerId)) return null;
    const stack = playerNavigationStacks.get(playerId);
    return stack.pop() || null;
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
 * Checks if the player's navigation stack is effectively empty.
 * @param {string} playerId The ID of the player.
 * @returns {boolean} True if the stack implies no logical "back" operation.
 */
function isNavStackAtRoot(playerId) {
    if (!playerNavigationStacks.has(playerId)) return true;
    return playerNavigationStacks.get(playerId).length <= 1;
}

/**
 * Gets the current (top) panel state from the player's navigation stack without popping it.
 * @param {string} playerId The ID of the player.
 * @returns {{ panelId: string, context: object } | null} The current panel state or null if stack is empty.
 */
function getCurrentTopOfNavStack(playerId) {
    if (!playerNavigationStacks.has(playerId)) return null;
    const stack = playerNavigationStacks.get(playerId);
    if (stack.length === 0) return null;
    return stack[stack.length - 1];
}
// --- End Player Navigation Stack Management ---

async function showResetFlagsFormImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    const modalForm = new ModalFormData().title("§l§eReset Player Flags§r").textField("Player Name to Reset Flags For:", "Enter exact player name").toggle("§cConfirm Resetting All Flags", false);
    try {
        const response = await modalForm.show(player);
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (response.canceled) {
            player.sendMessage("§7Flag reset action cancelled.");
        } else {
            const [targetPlayerName, confirmed] = response.formValues;
            if (!targetPlayerName || targetPlayerName.trim() === "") {
                player.sendMessage(getString('common.error.nameEmpty'));
                await showResetFlagsFormImpl(player, dependencies, context); return;
            }
            if (!confirmed) {
                player.sendMessage("§eFlag reset not confirmed. Action cancelled.");
            } else {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) await resetFlagsCommand(player, [targetPlayerName.trim()], dependencies);
                else player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
            }
        }
        if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {});
    } catch (error) {
        console.error(`[UiManager.showResetFlagsFormImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiResetFlagsForm', context: 'uiManager.showResetFlagsFormImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (callingPanelStateOnError.panelId) await showPanel(player, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
        else await showPanel(player, 'playerManagementPanel', dependencies, {});
    }
}

async function showWatchedPlayersListImpl(player, dependencies, context) {
    const { playerUtils, getString, playerDataManager, mc, logManager } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    let messageBody = "§gCurrently watched players (online):\n§r";
    const onlinePlayers = mc.world.getAllPlayers();
    const watchedOnline = onlinePlayers.filter(p => playerDataManager.getPlayerData(p.id)?.isWatched).map(p => p.nameTag);
    if (watchedOnline.length === 0) messageBody += "No players are currently being watched or online.";
    else messageBody += watchedOnline.map(name => `- ${name}`).join("\n");
    const modal = new ModalFormData().title("§l§bWatched Players§r").content(messageBody);
    modal.button1(getString('common.button.ok'));
    try {
        await modal.show(player);
    } catch (error) {
        console.error(`[UiManager.showWatchedPlayersListImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showWatchedPlayersListImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiWatchedPlayersList', context: 'uiManager.showWatchedPlayersListImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    }
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
    if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'playerManagementPanel', dependencies, {});
}

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
    const callingPanelState = getCurrentTopOfNavStack(player.id);
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
            const editFormContext = { keyName: selectedKeyConfig.keyName, keyType: selectedKeyConfig.type, currentValue: config[selectedKeyConfig.keyName], parentPanelForEdit: callingPanelState ? callingPanelState.panelId : 'configEditingRootPanel', parentContextForEdit: callingPanelState ? callingPanelState.context : {} };
            await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, editFormContext);
        }
    } catch (e) {
        console.error(`[UiManager.showConfigCategoriesListImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        if (callingPanelState && callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'configEditingRootPanel', dependencies, {});
    }
}

async function showEditSingleConfigValueFormImpl(player, dependencies, context) {
    const { playerUtils, config, getString, logManager } = dependencies;
    const { keyName, keyType, currentValue, parentPanelForEdit, parentContextForEdit } = context;
    playerUtils.debugLog(`[UiManager.showEditSingleConfigValueFormImpl] Editing ${keyName} for ${player.nameTag}`, player.nameTag, dependencies);
    if (!keyName || typeof keyType === 'undefined') {
        player.sendMessage("§cConfiguration key details missing for edit form.");
        if (parentPanelForEdit) await showPanel(player, parentPanelForEdit, dependencies, parentContextForEdit);
        return;
    }
    const modal = new ModalFormData().title(`Edit: ${keyName} (${keyType})`);
    let originalValue = config[keyName];
    switch (keyType) {
        case 'boolean': modal.toggle(`New value for ${keyName}:`, typeof originalValue === 'boolean' ? originalValue : false); break;
        case 'number': modal.textField(`New value for ${keyName} (number):`, typeof originalValue === 'number' ? originalValue.toString() : "0", typeof originalValue === 'number' ? originalValue.toString() : "0"); break;
        case 'string': modal.textField(`New value for ${keyName} (string):`, typeof originalValue === 'string' ? originalValue : "", typeof originalValue === 'string' ? originalValue : ""); break;
        default:
            player.sendMessage(`§cUnsupported config type "${keyType}" for UI editing of key "${keyName}".`);
            if (parentPanelForEdit) await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
            return;
    }
    try {
        const response = await modal.show(player);
        if (response.canceled) {
            await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit); return;
        }
        let newValue = response.formValues[0];
        let updateSuccess = false;
        switch (keyType) {
            case 'boolean': config[keyName] = !!newValue; updateSuccess = true; break;
            case 'number':
                const numVal = parseFloat(newValue);
                if (!isNaN(numVal)) { config[keyName] = numVal; updateSuccess = true; }
                else player.sendMessage("§cInvalid number entered. Value not changed.");
                break;
            case 'string': config[keyName] = String(newValue); updateSuccess = true; break;
        }
        if (updateSuccess) {
            player.sendMessage(`§aConfig "${keyName}" updated to: ${config[keyName]}`);
            logManager?.addLog({ adminName: player.nameTag, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
        }
        await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
    } catch (e) {
        console.error(`[UiManager.showEditSingleConfigValueFormImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
    }
}

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
            adminPlayer?.sendMessage(getString('ui.common.actionCancelled'));
            playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleString}' cancelled by ${playerName}.`, playerName, dependencies);
            return false;
        }
        await onConfirmCallback();
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Modal '${titleString}' confirmed by ${playerName}. Action executed.`, playerName, dependencies);
        return true;
    } catch (error) {
        console.error(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleString}): ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleString}): ${error.message}`, playerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiConfirmationModal', context: 'uiManager._showConfirmationModal', adminName: playerName, details: { titleString, errorMessage: error.message, stack: error.stack, }, }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
        return false;
    }
}

async function confirmClearChatImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.confirmClearChatImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    await _showConfirmationModal(player, "§l§cConfirm Clear Chat§r", "Are you sure you want to clear the global chat for all players?", "§cConfirm Clear Chat", async () => {
        const clearChatCommand = commandExecutionMap?.get('clearchat');
        if (clearChatCommand) await clearChatCommand(player, [], dependencies);
        else player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'serverManagementPanel', dependencies, {});
}

async function confirmLagClearImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.confirmLagClearImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    await _showConfirmationModal(player, "§l§cConfirm Lag Clear§r", "Are you sure you want to clear all ground items and non-player/non-persistent entities? This may cause lag temporarily.", "§cConfirm Lag Clear", async () => {
        const lagClearCommand = commandExecutionMap?.get('lagclear');
        if (lagClearCommand) await lagClearCommand(player, [], dependencies);
        else {
            player.sendMessage("§eNo 'lagclear' command configured. Performing basic item clear as fallback.");
            try {
                await player.runCommandAsync("kill @e[type=item]");
                player.sendMessage("§aGround items cleared.");
            } catch (e) {
                player.sendMessage("§cBasic item clear failed: " + e.message);
                console.error("[UiManager.confirmLagClearImpl] Basic item clear failed: " + e);
            }
        }
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    else await showPanel(player, 'serverManagementPanel', dependencies, {});
}

async function displayActionLogsModalImpl(player, dependencies, context) {
    const { playerUtils, logManager, getString } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.displayActionLogsModalImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    let logText = "§g--- All Action Logs ---\n§r";
    const logs = logManager.getLogs ? logManager.getLogs() : [];
    if (!logs || logs.length === 0) logText += "No action logs found.";
    else {
        const maxLogsToShow = 50;
        const startIndex = Math.max(0, logs.length - maxLogsToShow);
        for (let i = startIndex; i < logs.length; i++) {
            const log = logs[i]; if (!log) continue;
            const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
            let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
            if (log.targetName) entry += ` §b-> ${log.targetName}`;
            let detailsString = '';
            if (log.details) {
                if (typeof log.details === 'string') detailsString = log.details;
                else if (typeof log.details === 'object') {
                    const detailParts = [];
                    if (log.details.reason) detailParts.push(`Reason: ${log.details.reason}`);
                    if (log.details.durationDisplay) detailParts.push(`Duration: ${log.details.durationDisplay}`);
                    for (const key in log.details) {
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
        if (logs.length > maxLogsToShow) logText += `\n§o(Showing latest ${maxLogsToShow} of ${logs.length} entries. More may exist.)§r`;
    }
    const modal = new ModalFormData().title("§l§3Action Logs (All)§r").content(logText.trim());
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
        if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {});
    }
}

async function showModLogFilterModalImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager, config } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils?.debugLog(`[UiManager.showModLogFilterModalImpl] Requested by ${adminPlayerName}, current context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);
    const modal = new ModalFormData().title(getString('ui.modLogSelect.filterModal.title')).textField(getString('ui.modLogSelect.filterModal.textField.label'), getString('ui.modLogSelect.filterModal.textField.placeholder'), context.playerNameFilter || "");
    try {
        const response = await modal.show(player);
        if (response.canceled) {
            const callingPanelState = getCurrentTopOfNavStack(player.id);
            if (callingPanelState && callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(player, 'modLogSelectionPanel', dependencies, {});
            return;
        }
        const [playerNameInput] = response.formValues;
        const newPlayerNameFilter = playerNameInput?.trim() || null;

        if (newPlayerNameFilter) {
            player.sendMessage(getString('ui.modLogSelect.filterModal.filterSet', { filterName: newPlayerNameFilter }));
        } else if (playerNameInput && !newPlayerNameFilter) { // Input was whitespace
            player.sendMessage(getString('ui.modLogSelect.filterModal.filterBlank'));
        }
        else {
            player.sendMessage(getString('ui.modLogSelect.filterModal.filterCleared'));
        }

        const logsPerPage = config?.ui?.logsPerPage ?? 5;
        const allLogs = logManager.getLogs ? logManager.getLogs(context.logTypeFilter || [], newPlayerNameFilter) : [];
        const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

        const nextContext = { ...context, playerNameFilter: newPlayerNameFilter, currentPage: 1, totalPages };
        // When navigating from filter modal, always push the current state (modLogSelectionPanel)
        pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
        await showPanel(player, 'logViewerPanel', dependencies, nextContext);

    } catch (error) {
        console.error(`[UiManager.showModLogFilterModalImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showModLogFilterModalImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiModLogFilterModal', context: 'uiManager.showModLogFilterModalImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));

        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'modLogSelectionPanel', context: {} };
        if (callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'modLogSelectionPanel', dependencies, {});
    }
}

/**
 * Displays a specific page of logs in a modal form.
 * This function is typically called by an item in `logViewerPanel`.
 * @async
 * @param {import('@minecraft/server').Player} player - The player viewing the logs.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context object. Expected properties:
 *   - `logTypeFilter` (Array<string>): Filter for log types.
 *   - `logTypeName` (string): Display name for the log type (e.g., "Ban/Unban Logs").
 *   - `playerNameFilter` (string | null): Optional filter for player name.
 *   - `currentPage` (number): The current page number to display.
 *   - `totalPages` (number): The total number of pages, calculated externally and passed in.
 */
async function displaySpecificLogsPageImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager, config } = dependencies;
    const adminPlayerName = player.nameTag;
    playerUtils.debugLog(`[UiManager.displaySpecificLogsPageImpl] For ${adminPlayerName}, Context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);

    const {
        logTypeFilter = [],
        logTypeName = getString('ui.logViewer.title.default', {ประเภท: 'Selected'}), // Default title part
        playerNameFilter = null,
        currentPage = 1,
        // totalPages is expected to be in context, calculated by showPanel or prepareXLogViewer
    } = context;

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const filteredLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, playerNameFilter) : [];
    const totalLogs = filteredLogs.length;
    // totalPages should ideally be passed in context, but recalculate if missing for robustness
    const effectiveTotalPages = context.totalPages ?? Math.ceil(totalLogs / logsPerPage) || 1;

    let title = '';
    if (playerNameFilter) {
        title = getString('ui.logViewer.title.filteredPaged', { logTypeName, filterName: playerNameFilter, currentPage, totalPages: effectiveTotalPages });
    } else {
        title = getString('ui.logViewer.title.unfilteredPaged', { logTypeName, currentPage, totalPages: effectiveTotalPages });
    }

    let messageBody = "";

    if (totalLogs === 0) {
        messageBody = getString('ui.logViewer.noLogs');
    } else {
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, totalLogs);

        if (currentPage < 1 || currentPage > effectiveTotalPages && effectiveTotalPages > 0) { // Check against effectiveTotalPages
            messageBody = getString('ui.logViewer.invalidPage', { maxPages: effectiveTotalPages });
        } else {
            for (let i = startIndex; i < endIndex; i++) {
                if (i >= totalLogs) break;
                const log = filteredLogs[i]; if (!log) continue;

                const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
                let entry = getString('ui.actionLogs.logEntry', {
                    timestamp,
                    actor: log.actor || getString('common.value.unknown'),
                    actionType: log.actionType || getString('common.value.unknown'),
                    target: log.targetName ? ` -> ${log.targetName}` : '',
                    duration: log.details?.durationDisplay ? getString('ui.actionLogs.logEntry.duration', { duration: log.details.durationDisplay }) : '',
                    reason: log.details?.reason ? getString('ui.actionLogs.logEntry.reason', { reason: log.details.reason }) : '',
                    details: '' // Simplified for this view, main details are actor/action/target/reason/duration
                });
                messageBody += entry + "\n";
            }
            messageBody += `\n${getString('ui.logViewer.footer.pageInfo', { currentPage, totalPages: effectiveTotalPages, totalEntries: totalLogs })}`;
        }
    }

    const modal = new ModalFormData().title(title).content(messageBody.trim());
    modal.button1(getString('common.button.ok'));

    try {
        await modal.show(player);
    } catch (error) {
        player.sendMessage(getString('common.error.genericForm'));
        console.error(`[UiManager.displaySpecificLogsPageImpl] Error showing modal: ${error.stack || error}`);
        logManager?.addLog({
            actionType: 'errorUiDisplaySpecificLogs',
            context: 'uiManager.displaySpecificLogsPageImpl',
            adminName: adminPlayerName,
            details: { errorMessage: error.message, stack: error.stack, currentContext: context }
        }, dependencies);
    } finally {
        // Always return to the logViewerPanel, passing the most up-to-date context
        // which includes currentPage and the externally calculated totalPages.
        await showPanel(player, 'logViewerPanel', dependencies, { ...context, totalPages: effectiveTotalPages });
    }
}

/**
 * Generic function to display a panel based on its definition from `panelLayoutConfig.js`.
 * Handles dynamic button generation, permission filtering, item sorting, title/text interpolation,
 * 'Back'/'Exit' button logic, navigation stack management, and action dispatching.
 * Also manages navigation to a dedicated error panel (`errorDisplayPanel`) if errors occur during panel processing.
 * Special handling for `logViewerPanel` includes calculating `totalPages` and `currentPage` for pagination.
 * @async
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {string} panelId The ID of the panel to display (must be a key in `panelDefinitions`).
 * @param {import('../types.js').Dependencies} dependencies Standard command dependencies.
 * @param {object} [currentContext={}] Optional context object. For `logViewerPanel`, this may include
 * `logTypeFilter`, `playerNameFilter`, and `currentPage`. `totalPages` will be calculated.
 */
async function showPanel(player, panelId, dependencies, currentContext = {}) {
    const { playerUtils, logManager, getString, permissionLevels, rankManager, config } = dependencies;
    const viewingPlayerName = player.nameTag;

    playerUtils?.debugLog(`[UiManager.showPanel] Player: ${viewingPlayerName}, PanelID: ${panelId}, Context: ${JSON.stringify(currentContext)}`, viewingPlayerName, dependencies);

    let effectiveContext = { ...currentContext };

    // Special context handling for logViewerPanel (pagination)
    if (panelId === 'logViewerPanel') {
        const logsPerPage = config?.ui?.logsPerPage ?? 5;
        const { logTypeFilter = [], playerNameFilter = null } = effectiveContext; // Filters from context
        const allLogs = logManager?.getLogs ? logManager.getLogs(logTypeFilter, playerNameFilter) : [];

        effectiveContext.totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

        let currentPage = effectiveContext.currentPage ?? 1; // Use current page from context or default to 1
        currentPage = Math.max(1, currentPage); // Ensure currentPage is at least 1
        currentPage = Math.min(currentPage, effectiveContext.totalPages); // Ensure currentPage does not exceed totalPages
        effectiveContext.currentPage = currentPage;
    }

    const panelDefinition = panelDefinitions[panelId];

    if (!panelDefinition) {
        console.error(`[UiManager.showPanel] Error: Panel definition for panelId "${panelId}" not found.`);
        logManager?.addLog({
            actionType: 'errorUiMissingPanelDef',
            context: 'uiManager.showPanel',
            adminName: viewingPlayerName,
            details: { panelId, context: effectiveContext, errorMessage: `Panel definition for "${panelId}" not found.` },
        }, dependencies);

        if (panelId !== 'errorDisplayPanel' && panelDefinitions['errorDisplayPanel']) {
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `Panel definition for "${panelId}" is missing. Please report this.`,
                originalPanelId: panelId,
                originalContext: effectiveContext,
                previousPanelIdOnError: null
            });
        } else {
            player.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id);
        }
        return;
    }

    let panelTitle = panelDefinition.title;
    if (panelId === 'logViewerPanel') {
        panelTitle = panelTitle.replace(/{currentPage}/g, String(effectiveContext.currentPage ?? 1));
        panelTitle = panelTitle.replace(/{totalPages}/g, String(effectiveContext.totalPages ?? 1));
    }
    for (const key in effectiveContext) {
        if (Object.prototype.hasOwnProperty.call(effectiveContext, key) && !['currentPage', 'totalPages'].includes(key)) {
            const replacementValue = String(effectiveContext[key]);
            panelTitle = panelTitle.replace(new RegExp(`{${key}}`, 'g'), replacementValue);
        }
    }

    const form = new ActionFormData().title(panelTitle);
    const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

    const permittedItems = panelDefinition.items
        .filter(item => {
            if (panelId === 'logViewerPanel') {
                if (item.id === 'prevLogPage' && effectiveContext.currentPage <= 1) return false;
                if (item.id === 'nextLogPage' && effectiveContext.currentPage >= effectiveContext.totalPages) return false;
            }
            return userPermLevel <= item.requiredPermLevel;
        })
        .sort((a, b) => a.sortId - b.sortId);

    permittedItems.forEach(item => {
        let buttonText = item.text;
        if (panelId === 'logViewerPanel') {
             buttonText = buttonText.replace(/{currentPage}/g, String(effectiveContext.currentPage ?? 1));
             buttonText = buttonText.replace(/{totalPages}/g, String(effectiveContext.totalPages ?? 1));
        }
        for (const key in effectiveContext) {
            if (Object.prototype.hasOwnProperty.call(effectiveContext, key) && !['currentPage', 'totalPages'].includes(key)) {
                const replacementValue = String(effectiveContext[key]);
                buttonText = buttonText.replace(new RegExp(`{${key}}`, 'g'), replacementValue);
            }
        }
        form.button(buttonText, item.icon);
    });

    let atRootLevel = isNavStackAtRoot(player.id) || !panelDefinition.parentPanelId;
    if (panelId === 'errorDisplayPanel') {
        const stack = playerNavigationStacks.get(player.id) || [];
        atRootLevel = stack.length <= 1;
    }
    const backExitButtonText = atRootLevel ? getString('common.button.close') : getString('common.button.back');
    const backExitButtonIcon = atRootLevel ? 'textures/ui/cancel' : 'textures/ui/undo';
    if (panelId === 'errorDisplayPanel' || permittedItems.length > 0 || panelDefinition.items.length === 0) {
        form.button(backExitButtonText, backExitButtonIcon);
    }
    const backExitButtonIndex = permittedItems.length;

    if (panelId === 'errorDisplayPanel' && effectiveContext.errorMessage) {
        form.body(String(effectiveContext.errorMessage));
    } else if (permittedItems.length === 0 && panelDefinition.items.length > 0) {
        form.body(getString('ui.common.noPermissionForPanelItems'));
    } else if (panelId !== 'logViewerPanel' && permittedItems.length === 0 && (form.buttonCount === undefined || form.buttonCount === 0 || (form.buttonCount === 1 && backExitButtonIndex === 0 )) ) {
        form.body(getString('ui.common.noOptionsAvailable'));
    }

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId} cancelled by ${viewingPlayerName}. Reason: ${response.cancelationReason}`, viewingPlayerName, dependencies);
            if (atRootLevel) clearPlayerNavStack(player.id);
            return;
        }
        const selection = response.selection;
        if (typeof selection === 'undefined') return;

        if (selection < permittedItems.length) {
            const selectedItemConfig = permittedItems[selection];
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Player ${viewingPlayerName} selected item: ${selectedItemConfig.id}`, viewingPlayerName, dependencies);
            if (selectedItemConfig.actionType === 'openPanel') {
                let nextContext = { ...effectiveContext, ...(selectedItemConfig.initialContext || {}) };
                if (selectedItemConfig.actionContextVars && selectedItemConfig.actionContextVars.length > 0) {
                    const extractedContext = {};
                    selectedItemConfig.actionContextVars.forEach(varName => {
                        if (effectiveContext[varName] !== undefined) extractedContext[varName] = effectiveContext[varName];
                    });
                    nextContext = { ...nextContext, ...extractedContext };
                }
                pushToPlayerNavStack(player.id, panelId, effectiveContext);
                await showPanel(player, selectedItemConfig.actionValue, dependencies, nextContext);
            } else if (selectedItemConfig.actionType === 'functionCall') {
                const funcToCall = UI_ACTION_FUNCTIONS[selectedItemConfig.actionValue];
                if (funcToCall && typeof funcToCall === 'function') {
                    let functionContext = { ...effectiveContext, ...(selectedItemConfig.initialContext || {}) };
                    await funcToCall(player, dependencies, functionContext);
                } else {
                    playerUtils?.debugLog(`[UiManager.showPanel] Misconfigured functionCall for item ${selectedItemConfig.id} in panel ${panelId}. Function "${selectedItemConfig.actionValue}" not found.`, viewingPlayerName, dependencies);
                    player.sendMessage(getString('common.error.genericForm'));
                    await showPanel(player, panelId, dependencies, effectiveContext);
                }
            } else {
                playerUtils?.debugLog(`[UiManager.showPanel] Unknown actionType "${selectedItemConfig.actionType}" for item ${selectedItemConfig.id}.`, viewingPlayerName, dependencies);
                await showPanel(player, panelId, dependencies, effectiveContext);
            }
        } else if (selection === backExitButtonIndex) {
            if (atRootLevel) {
                playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId} (top-level/error) exited by ${viewingPlayerName}.`, viewingPlayerName, dependencies);
                clearPlayerNavStack(player.id);
            } else {
                if (panelId === 'errorDisplayPanel' && effectiveContext.previousPanelIdOnError) {
                    playerUtils?.debugLog(`[UiManager.showPanel] ErrorPanel Back to: ${effectiveContext.previousPanelIdOnError}.`, viewingPlayerName, dependencies);
                    await showPanel(player, effectiveContext.previousPanelIdOnError, dependencies, effectiveContext.previousContextOnError || {});
                } else {
                    const previousPanelState = popFromPlayerNavStack(player.id);
                    if (previousPanelState) {
                        playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Back to ${previousPanelState.panelId}.`, viewingPlayerName, dependencies);
                        await showPanel(player, previousPanelState.panelId, dependencies, previousPanelState.context);
                    } else {
                        playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Back, but nav stack empty. Clearing.`, viewingPlayerName, dependencies);
                        clearPlayerNavStack(player.id);
                    }
                }
            }
        } else {
            playerUtils?.debugLog(`[UiManager.showPanel] Invalid selection ${selection} in panel ${panelId}.`, viewingPlayerName, dependencies);
        }
    } catch (error) {
        console.error(`[UiManager.showPanel] Error processing panel ${panelId} for ${viewingPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showPanel] Error for ${viewingPlayerName}, Panel ${panelId}: ${error.message}`, viewingPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiGenericPanelShow', context: `uiManager.showPanel.${panelId}`, adminName: viewingPlayerName, details: { panelId, context: effectiveContext, errorMessage: error.message, stack: error.stack }, }, dependencies);
        const navStack = playerNavigationStacks.get(player.id) || [];
        let previousValidPanelState = null;
        if (navStack.length > 0) {
            const topOfStack = navStack[navStack.length - 1];
            if (topOfStack.panelId === panelId) {
                popFromPlayerNavStack(player.id);
                if (navStack.length > 0) previousValidPanelState = navStack[navStack.length - 1];
            } else previousValidPanelState = topOfStack;
        }
        if (panelId !== 'errorDisplayPanel' && panelDefinitions['errorDisplayPanel']) {
            await showPanel(player, 'errorDisplayPanel', dependencies, { errorMessage: `An error occurred while processing panel "${panelId}".\nDetails: ${error.message}`, originalPanelId: panelId, originalContext: effectiveContext, previousPanelIdOnError: previousValidPanelState ? previousValidPanelState.panelId : null, previousContextOnError: previousValidPanelState ? previousValidPanelState.context : {} });
        } else {
            player.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id);
        }
    }
}

/**
 * Prepares and shows the Ban/Unban logs viewer.
 * @async
 */
async function prepareBanUnbanLogsViewer(player, dependencies, context) {
    const { logManager, config } = dependencies;
    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['ban', 'unban'];
    const logTypeName = 'Ban/Unban';
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : [];
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = { ...context, logTypeFilter, logTypeName, playerNameFilter: null, currentPage: 1, totalPages };
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}

/**
 * Prepares and shows the Mute/Unmute logs viewer.
 * @async
 */
async function prepareMuteUnmuteLogsViewer(player, dependencies, context) {
    const { logManager, config } = dependencies;
    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['mute', 'unmute'];
    const logTypeName = 'Mute/Unmute';
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : [];
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = { ...context, logTypeFilter, logTypeName, playerNameFilter: null, currentPage: 1, totalPages };
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}


const UI_ACTION_FUNCTIONS = {
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
            linksBody = helpfulLinks.map(l => `§e${l.title}§r: §9§n${l.url}§r`).join('\n');
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
    showOnlinePlayersList: showOnlinePlayersList,
    showInspectPlayerForm: showInspectPlayerForm,
    showResetFlagsForm: showResetFlagsFormImpl,
    showWatchedPlayersList: showWatchedPlayersListImpl,
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
            logManager?.addLog({ actionType: 'errorUiSystemInfoModal', context: 'uiManager.displaySystemInfoModal', adminName: viewingPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        }
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if(callingPanelState.panelId) await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        else await showPanel(player, 'serverManagementPanel', dependencies, {});
    },
    confirmClearChat: confirmClearChatImpl,
    confirmLagClear: confirmLagClearImpl,
    showConfigCategoriesList: showConfigCategoriesListImpl,
    showEditSingleConfigValueForm: showEditSingleConfigValueFormImpl,
    displayActionLogsModal: displayActionLogsModalImpl,
    showModLogFilterModal: showModLogFilterModalImpl,
    displaySpecificLogsPage: displaySpecificLogsPageImpl,
    goToNextLogPage: goToNextLogPage,
    goToPrevLogPage: goToPrevLogPage,
    prepareBanUnbanLogsViewer: prepareBanUnbanLogsViewer,
    prepareMuteUnmuteLogsViewer: prepareMuteUnmuteLogsViewer,
    displayDetailedFlagsModal: async (player, dependencies, context) => { // JSDoc was fine
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
                if (!reason || reason.trim() === "") { player.sendMessage(getString('common.error.reasonEmpty')); await UI_ACTION_FUNCTIONS.showBanFormForPlayer(player, dependencies, context); return; }
                const banCommand = commandExecutionMap?.get('ban');
                if (banCommand) { await banCommand(player, [targetPlayerName, duration || (config?.banCommand?.defaultDuration ?? "perm"), ...reason.split(' ')], dependencies); }
                else { player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'ban' })); }
            }
        } catch (error) { console.error(`[UiManager.showBanFormForPlayer] Error for ${adminPlayerName} banning ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiBanForm', context: 'uiManager.showBanFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack }, }, dependencies); player.sendMessage(getString('common.error.genericForm'));}
        finally { await showPanel(player, 'playerActionsPanel', dependencies, context); }
    },
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

/**
 * Navigates to the next page of logs in the logViewerPanel.
 * Navigates to the next page of logs in the `logViewerPanel`.
 * @async
 * @param {import('@minecraft/server').Player} player - The player navigating.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 * @param {object} context - Current panel context. Expected to contain `currentPage` and `totalPages`.
 */
async function goToNextLogPage(player, dependencies, context) {
    const { playerUtils } = dependencies;
    let { currentPage = 1, totalPages = 1 } = context;
    playerUtils.debugLog(`[UiManager.goToNextLogPage] Current: ${currentPage}, Total: ${totalPages}`, player.nameTag, dependencies);
    if (currentPage < totalPages) {
        currentPage++;
    }
    // No need to push to nav stack here, showPanel for logViewerPanel handles its state.
    await showPanel(player, 'logViewerPanel', dependencies, { ...context, currentPage });
}

/**
 * Navigates to the previous page of logs in the `logViewerPanel`.
 * @async
 * @param {import('@minecraft/server').Player} player - The player navigating.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 * @param {object} context - Current panel context. Expected to contain `currentPage`.
 */
async function goToPrevLogPage(player, dependencies, context) {
    const { playerUtils } = dependencies;
    let { currentPage = 1 } = context;
    playerUtils.debugLog(`[UiManager.goToPrevLogPage] Current: ${currentPage}`, player.nameTag, dependencies);
    if (currentPage > 1) {
        currentPage--;
    }
    // No need to push to nav stack here, showPanel for logViewerPanel handles its state.
    await showPanel(player, 'logViewerPanel', dependencies, { ...context, currentPage });
}

/**
 * Prepares and shows the Ban/Unban logs viewer (`logViewerPanel`).
 * Initializes context with appropriate filters, calculates total pages, and sets current page to 1.
 * @async
 * @param {import('@minecraft/server').Player} player - The player initiating the view.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 * @param {object} context - Context from the calling panel (e.g., `modLogSelectionPanel`).
 */
async function prepareBanUnbanLogsViewer(player, dependencies, context) {
    const { logManager, config, getString } = dependencies;
    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['ban', 'unban'];
    const logTypeName = getString('ui.logViewer.title.banUnban');
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : []; // No player name filter initially
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = {
        ...context, // Preserve any incoming context if needed, though usually not for fresh log views
        logTypeFilter,
        logTypeName,
        playerNameFilter: null,
        currentPage: 1,
        totalPages
    };
    pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}

/**
 * Prepares and shows the Mute/Unmute logs viewer (`logViewerPanel`).
 * Initializes context with appropriate filters, calculates total pages, and sets current page to 1.
 * @async
 * @param {import('@minecraft/server').Player} player - The player initiating the view.
 * @param {import('../types.js').Dependencies} dependencies - Standard dependencies.
 * @param {object} context - Context from the calling panel (e.g., `modLogSelectionPanel`).
 */
async function prepareMuteUnmuteLogsViewer(player, dependencies, context) {
    const { logManager, config, getString } = dependencies;
    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['mute', 'unmute'];
    const logTypeName = getString('ui.logViewer.title.muteUnmute');
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : []; // No player name filter initially
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = {
        ...context,
        logTypeFilter,
        logTypeName,
        playerNameFilter: null,
        currentPage: 1,
        totalPages
    };
    pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}


/**
 * Shows a modal form to input a player name for inspection.
 * On submission, it executes the 'inspect' command with the provided player name.
 * @async
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player using the form.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} context - Context from the calling panel, used for navigation fallback.
 */
async function showInspectPlayerForm(adminPlayer, dependencies, context) {
    const { playerUtils, logManager, getString, commandExecutionMap } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Requested by ${adminName}`, adminName, dependencies);

    const modalForm = new ModalFormData()
        .title(getString('ui.inspectPlayer.title'))
        .textField(getString('ui.inspectPlayer.textFieldLabel'), getString('ui.inspectPlayer.textFieldPlaceholder'));

    try {
        const response = await modalForm.show(adminPlayer);
        const callingPanelState = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            if (callingPanelState.panelId) await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
            return;
        }
        const targetPlayerName = response.formValues?.[0]?.trim();
        if (!targetPlayerName) {
            adminPlayer?.sendMessage(getString('common.error.nameEmpty'));
            await UI_ACTION_FUNCTIONS.showInspectPlayerForm(adminPlayer, dependencies, context);
            return;
        }

        const commandExecute = commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName], dependencies);
        } else {
            adminPlayer?.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'inspect' }));
        }
        if (callingPanelState.panelId) await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);

    } catch (error) {
        console.error(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiInspectPlayerForm',
            context: 'uiManager.showInspectPlayerForm',
            adminName,
            details: { errorMessage: error.message, stack: error.stack, },
        }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };
        if (callingPanelStateOnError.panelId) await showPanel(adminPlayer, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
    }
}


/**
 * Shows a form listing all currently online players.
 * Allows selecting a player from a list of online players to view further actions in the `playerActionsPanel`.
 * @async
 * @param {import('@minecraft/server').Player} adminPlayer - The admin player viewing the list.
 * @param {import('../types.js').Dependencies} dependencies - Standard command dependencies.
 * @param {object} [context={}] - Context from the calling panel, primarily for navigation stack.
 */
async function showOnlinePlayersList(adminPlayer, dependencies, context = {}) { // Added context param for consistency
    const { playerUtils, logManager, playerDataManager, getString, mc: minecraft } = dependencies;
    const adminName = adminPlayer?.nameTag ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Requested by ${adminName}`, adminName, dependencies);

    const onlinePlayers = minecraft.world.getAllPlayers();
    const form = new ActionFormData()
        .title(getString('ui.onlinePlayers.title', { playerCount: onlinePlayers.length }));

    if (onlinePlayers.length === 0) {
        form.body(getString('ui.onlinePlayers.noPlayers'));
    } else {
        form.body(getString('ui.onlinePlayers.selectPlayerPrompt'));
        onlinePlayers.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id);
            const flagCount = pData?.flags?.totalFlags ?? 0;
            form.button(getString('ui.onlinePlayers.playerEntryFormat', { playerName: p.nameTag, flagCount: flagCount }));
        });
    }
    form.button(getString('common.button.back'));

    try {
        const response = await form.show(adminPlayer);
        const callingPanelState = getCurrentTopOfNavStack(adminPlayer.id);

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            if (callingPanelState) await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(adminPlayer, 'playerManagementPanel', dependencies, {});
            return;
        }
        const selection = response.selection;
        if (selection >= 0 && selection < onlinePlayers.length) {
            const targetPlayer = onlinePlayers[selection];
            if (targetPlayer?.isValid()) {
                const playerContext = {
                    targetPlayerId: targetPlayer.id,
                    targetPlayerName: targetPlayer.nameTag,
                    ...(callingPanelState?.context || {})
                };
                if (callingPanelState) pushToPlayerNavStack(adminPlayer.id, callingPanelState.panelId, callingPanelState.context);
                else pushToPlayerNavStack(adminPlayer.id, 'playerManagementPanel', {});

                await showPanel(adminPlayer, 'playerActionsPanel', dependencies, playerContext);
            } else {
                adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayer?.nameTag || 'Selected Player' }));
                await UI_ACTION_FUNCTIONS.showOnlinePlayersList(adminPlayer, dependencies, callingPanelState?.context || {});
            }
        } else if (selection === onlinePlayers.length) { // Back button
            if (callingPanelState) await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
            else await showPanel(adminPlayer, 'playerManagementPanel', dependencies, {});
        }
    } catch (error) {
        console.error(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showOnlinePlayersList] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiOnlinePlayersList', adminName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);

        const errorContextReturn = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };
        if (panelDefinitions['errorDisplayPanel']) {
            await showPanel(adminPlayer, 'errorDisplayPanel', dependencies, {
                errorMessage: `Error displaying online players list: ${error.message}`,
                originalPanelId: errorContextReturn.panelId,
                previousPanelIdOnError: errorContextReturn.panelId,
                previousContextOnError: errorContextReturn.context
            });
        } else {
            adminPlayer?.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(adminPlayer.id);
        }
    }
}

/**
 * Main exported functions for UI management.
 * `showPanel` is the primary function for displaying all data-driven panels.
 * `clearPlayerNavStack` is used to reset navigation history for a player, typically when initiating a new top-level UI flow.
 */
export { showPanel, clearPlayerNavStack };

[end of AntiCheatsBP/scripts/core/uiManager.js]
