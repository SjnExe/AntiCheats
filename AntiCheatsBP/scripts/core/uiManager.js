import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from './panelLayoutConfig.js';
import { logError } from '../modules/utils/playerUtils.js';

// Constants for showInspectPlayerForm
const inspectPlayerTitle = '§l§3Inspect Player§r';
const inspectPlayerTextFieldLabel = 'Player Name:';
const inspectPlayerTextFieldPlaceholder = 'Enter exact player name';

// Constants for string truncation in config UI
const configUiMaxStringDisplayLength = 30;
const configUiTruncateKeepLength = 27;

// --- Player Navigation Stack Management ---
/**
 * Stores navigation stacks for each player.
 * Key: Player ID (string)
 * Value: Array of objects, where each object is { panelId: string, context: object }
 * @type {Map<string, Array<{panelId: string, context: object}>>}
 */
const playerNavigationStacks = new Map();

/**
 * @param {string} playerId
 * @param {string} panelId
 * @param {object} context
 */
function pushToPlayerNavStack(playerId, panelId, context) {
    if (!playerNavigationStacks.has(playerId)) {
        playerNavigationStacks.set(playerId, []);
    }
    const stack = playerNavigationStacks.get(playerId);
    if (!stack) return; // Should not happen
    const currentTop = stack.length > 0 ? stack[stack.length - 1] : null;
    if (!currentTop || currentTop.panelId !== panelId || JSON.stringify(currentTop.context) !== JSON.stringify(context)) {
        stack.push({ panelId, context: { ...context } });
    }
}

/**
 * @param {string} playerId
 * @returns {{panelId: string, context: object}|null}
 */
function popFromPlayerNavStack(playerId) {
    const stack = playerNavigationStacks.get(playerId);
    if (!stack) {
        return null;
    }
    return stack.pop() || null;
}

/** @param {string} playerId */
function clearPlayerNavStack(playerId) {
    if (playerNavigationStacks.has(playerId)) {
        playerNavigationStacks.set(playerId, []);
    }
}

/**
 * @param {string} playerId
 * @returns {boolean}
 */
function isNavStackAtRoot(playerId) {
    const stack = playerNavigationStacks.get(playerId);
    if (!stack) {
        return true;
    }
    return stack.length <= 1;
}

/**
 * @param {string} playerId
 * @returns {{panelId: string, context: object}|null}
 */
function getCurrentTopOfNavStack(playerId) {
    const stack = playerNavigationStacks.get(playerId);
    if (!stack || stack.length === 0) {
        return null;
    }
    return stack[stack.length - 1];
}
// --- End Player Navigation Stack Management ---

// --- Dynamic Item Generators ---
/**
 * @typedef {(player: import('@minecraft/server').Player, dependencies: import('../types.js').Dependencies, context: object) => import('./panelLayoutConfig.js').PanelItem[]} DynamicItemGeneratorFunction
 */

/**
 * Collection of functions that dynamically generate panel items.
 * Each function takes the player, dependencies, and current panel context,
 * and returns an array of `PanelItem` objects.
 * @type {{[key: string]: DynamicItemGeneratorFunction}}
 */
const uiDynamicItemGenerators = {
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateHelpfulLinkItems: (player, dependencies, context) => {
        const { config } = dependencies;
        const helpfulLinks = config?.helpfulLinks ?? [];
        const items = [];

        if (helpfulLinks.length === 0) {
            return [];
        }

        helpfulLinks.forEach((link, index) => {
            if (link && link.title && link.url) {
                items.push({
                    id: `helpfulLink_${index}`,
                    sortId: 10 + index * 10, // Basic sorting
                    text: link.title,
                    icon: link.icon || 'textures/ui/icon_Details', // Use link-specific icon or default
                    requiredPermLevel: 1024, // Standard user permission
                    actionType: 'functionCall',
                    actionValue: 'displayLinkInChat',
                    initialContext: {
                        linkUrl: link.url,
                        linkTitle: link.title,
                        originalPanelIdForDisplayLink: 'helpfulLinksPanel',
                        originalContextForDisplayLink: { ...context },
                    },
                    actionContextVars: [],
                });
            }
        });
        return items;
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateServerRuleItems: (player, dependencies, context) => {
        const { config } = dependencies;
        const serverRules = config?.serverRules ?? [];
        const items = [];

        if (serverRules.length === 0) {
            return [];
        }

        serverRules.forEach((rule, index) => {
            if (typeof rule === 'string' && rule.trim() !== '') {
                items.push({
                    id: `serverRule_${index}`,
                    sortId: 10 + index * 10,
                    text: rule,
                    icon: 'textures/ui/scroll_filled',
                    requiredPermLevel: 1024,
                    actionType: 'functionCall',
                    actionValue: 'returnToCallingPanel',
                    initialContext: {
                        originalPanelId: 'serverRulesPanel',
                        originalContext: { ...context },
                    },
                    actionContextVars: [],
                });
            }
        });
        return items;
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateGeneralTipItems: (player, dependencies, context) => {
        const { config } = dependencies;
        const generalTips = config?.generalTips ?? [];
        const items = [];

        if (generalTips.length === 0) {
            return [];
        }

        generalTips.forEach((tip, index) => {
            if (typeof tip === 'string' && tip.trim() !== '') {
                items.push({
                    id: `generalTip_${index}`,
                    sortId: 10 + index * 10,
                    text: tip,
                    icon: 'textures/ui/light_bulb_momented',
                    requiredPermLevel: 1024,
                    actionType: 'functionCall',
                    actionValue: 'returnToCallingPanel',
                    initialContext: {
                        originalPanelId: 'generalTipsPanel',
                        originalContext: { ...context },
                    },
                    actionContextVars: [],
                });
            }
        });
        return items;
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateOnlinePlayerItems: (player, dependencies) => {
        const { playerDataManager } = dependencies;
        const items = [];
        const onlinePlayers = world.getAllPlayers();

        onlinePlayers.forEach((p, index) => {
            const playerData = playerDataManager?.getPlayerData(p.id);
            const isPlayerFrozen = playerData?.isFrozen ?? false;
            const flagCount = playerData?.flags?.totalFlags ?? 0;
            let buttonText = p.name;
            if (flagCount > 0) {
                buttonText += ` §7(Flags: §c${flagCount}§7)§r`;
            }
            if (isPlayerFrozen) {
                buttonText += ' §b[Frozen]§r';
            }

            items.push({
                id: `onlinePlayer_${p.id}`,
                sortId: 10 + index,
                text: buttonText,
                icon: 'textures/ui/icon_multiplayer',
                requiredPermLevel: 1,
                actionType: 'openPanel',
                actionValue: 'playerActionsPanel',
                initialContext: {
                    targetPlayerId: p.id,
                    targetPlayerName: p.name,
                    isTargetFrozen: isPlayerFrozen,
                },
            });
        });
        return items;
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateWatchedPlayerItems: (player, dependencies) => {
        const { playerDataManager } = dependencies;
        const items = [];
        const onlinePlayers = world.getAllPlayers();

        onlinePlayers.forEach((p, index) => {
            const playerData = playerDataManager?.getPlayerData(p.id);
            if (playerData?.isWatched) {
                const isPlayerFrozen = playerData?.isFrozen ?? false;
                const flagCount = playerData?.flags?.totalFlags ?? 0;
                let buttonText = p.name;
                if (flagCount > 0) {
                    buttonText += ` §7(Flags: §c${flagCount}§7)§r`;
                }
                if (isPlayerFrozen) {
                    buttonText += ' §b[Frozen]§r';
                }

                items.push({
                    id: `watchedPlayer_${p.id}`,
                    sortId: 10 + index,
                    text: buttonText,
                    icon: 'textures/ui/spyglass_flat_color',
                    requiredPermLevel: 1,
                    actionType: 'openPanel',
                    actionValue: 'playerActionsPanel',
                    initialContext: {
                        targetPlayerId: p.id,
                        targetPlayerName: p.name,
                        isTargetFrozen: isPlayerFrozen,
                    },
                });
            }
        });
        return items;
    },
};
// --- End Dynamic Item Generators ---

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function showResetFlagsFormImpl(player, dependencies, context) {
    const { playerUtils, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    const modalForm = new ModalFormData().title('§l§eReset Player Flags§r').textField('Player Name to Reset Flags For:', 'Enter exact player name').toggle('§cConfirm Resetting All Flags', false);
    try {
        const response = await modalForm.show(player);
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (response.canceled) {
            player.sendMessage('§7Flag reset action cancelled.');
        } else if (response.formValues) {
            const [targetPlayerName, confirmedReset] = response.formValues;
            if (typeof targetPlayerName !== 'string' || !targetPlayerName.trim()) {
                player.sendMessage(playerUtils.getString('common.error.nameEmpty'));
                await showResetFlagsFormImpl(player, dependencies, context); return;
            }
            if (!confirmedReset) {
                player.sendMessage('§eFlag reset not confirmed. Action cancelled.');
            } else {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName.trim()], dependencies);
                } else {
                    player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            }
        }
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'playerManagementPanel', dependencies, {});
        }
    } catch (error) {
        logError(`[UiManager.showResetFlagsFormImpl] Error for ${adminPlayerName}: ${error.stack || error}`, error);
        playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Error: ${String(error)}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiResetFlagsForm', context: 'uiManager.showResetFlagsFormImpl', adminName: adminPlayerName, details: { errorMessage: String(error), stack: error.stack } }, dependencies);
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (callingPanelStateOnError.panelId) {
            await showPanel(player, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
        } else {
            await showPanel(player, 'playerManagementPanel', dependencies, {});
        }
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 */
async function showConfigCategoriesListImpl(player, dependencies) {
    const { playerUtils, config } = dependencies;
    playerUtils.debugLog(`[UiManager.showConfigCategoriesListImpl] Called by ${player.name}`, player.name, dependencies);
    const form = new ActionFormData().title('Edit Configuration Key');

    const dynamicallyEditableKeys = [];

    for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            const value = config[key];
            const type = typeof value;
            let displayValue = String(value);
            let isEditable = false;
            let resolvedType = type;

            if (type === 'boolean' || type === 'number' || type === 'string') {
                isEditable = true;
                if (type === 'string' && displayValue.length > configUiMaxStringDisplayLength) {
                    displayValue = `${displayValue.substring(0, configUiTruncateKeepLength) }...`;
                }
            } else if (Array.isArray(value)) {
                const isSimpleArray = value.every(el => typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean');
                if (isSimpleArray) {
                    isEditable = true;
                    resolvedType = 'arrayString';
                    displayValue = JSON.stringify(value);
                    if (displayValue.length > configUiMaxStringDisplayLength) {
                        displayValue = `${displayValue.substring(0, configUiTruncateKeepLength) }...`;
                    }
                } else {
                    displayValue = '[Complex Array]';
                }
            } else if (type === 'object' && value !== null) {
                displayValue = '[Complex Object]';
            } else if (value === null) {
                displayValue = '[Null]';
            }

            if (isEditable) {
                dynamicallyEditableKeys.push({
                    keyName: key,
                    type: resolvedType,
                    currentValue: value,
                });
                form.button(`${key} (${resolvedType})\n§7Current: §f${displayValue}`);
            }
        }
    }

    if (dynamicallyEditableKeys.length === 0) {
        form.body('No editable configuration keys found or all are complex types not supported by this editor.');
    }

    const callingPanelState = getCurrentTopOfNavStack(player.id);
    form.button(playerUtils.getString('common.button.back'), 'textures/ui/undo');
    const backButtonIndex = dynamicallyEditableKeys.length;

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === undefined) {
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            }
            return;
        }
        if (response.selection === backButtonIndex) {
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            }
            return;
        }

        const selectedKeyConfig = dynamicallyEditableKeys[response.selection];
        if (selectedKeyConfig) {
            const editFormContext = {
                keyName: selectedKeyConfig.keyName,
                keyType: selectedKeyConfig.type,
                currentValue: selectedKeyConfig.currentValue,
                parentPanelForEdit: callingPanelState?.panelId ?? 'configEditingRootPanel',
                parentContextForEdit: callingPanelState?.context ?? {},
            };
            await uiActionFunctions.showEditSingleConfigValueForm(player, dependencies, editFormContext);
        }
    } catch (e) {
        logError(`[UiManager.showConfigCategoriesListImpl] Error: ${e.stack || e}`, e);
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
        if (callingPanelState && callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        }
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function showEditSingleConfigValueFormImpl(player, dependencies, context) {
    const { playerUtils, config, logManager } = dependencies;
    const { keyName, keyType, parentPanelForEdit, parentContextForEdit, currentValue } = context;
    playerUtils.debugLog(`[UiManager.showEditSingleConfigValueFormImpl] Editing ${keyName} (type: ${keyType}) for ${player.name}`, player.name, dependencies);

    if (typeof keyName !== 'string' || typeof keyType !== 'string') {
        player.sendMessage('§cConfiguration key details missing for edit form.');
        if (parentPanelForEdit) {
            await showPanel(player, String(parentPanelForEdit), dependencies, parentContextForEdit);
        }
        return;
    }
    const modal = new ModalFormData().title(`Edit: ${keyName} (${keyType})`);
    const originalValue = config[keyName];

    switch (keyType) {
        case 'boolean':
            modal.toggle(`New value for ${keyName}:`, typeof currentValue === 'boolean' ? currentValue : false);
            break;
        case 'number':
            modal.textField(`New value for ${keyName} (number):`, String(currentValue ?? '0'));
            break;
        case 'string':
            modal.textField(`New value for ${keyName} (string):`, String(currentValue ?? ''));
            break;
        case 'arrayString':
            modal.textField(`New value for ${keyName} (JSON array string, e.g., ["a","b",1]):`, JSON.stringify(currentValue ?? []));
            break;
        default:
            player.sendMessage(`§cError: Unsupported config type "${keyType}" for UI editing of key "${keyName}".`);
            if (parentPanelForEdit) {
                await uiActionFunctions.showConfigCategoriesList(player, dependencies, parentContextForEdit);
            }
            return;
    }
    try {
        const response = await modal.show(player);
        if (response.canceled || !response.formValues) {
            await uiActionFunctions.showConfigCategoriesList(player, dependencies, parentContextForEdit); return;
        }
        const newValue = response.formValues[0];
        let updateSuccess = false;
        switch (keyType) {
            case 'boolean':
                config[keyName] = !!newValue;
                updateSuccess = true;
                break;
            case 'number': {
                const numVal = parseFloat(String(newValue));
                if (!isNaN(numVal)) {
                    config[keyName] = numVal;
                    player.sendMessage(`§aConfig "${keyName}" updated to: ${config[keyName]}`);
                    logManager?.addLog({ adminName: player.name, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
                    await uiActionFunctions.showConfigCategoriesList(player, dependencies, parentContextForEdit);
                } else {
                    player.sendMessage('§cError: Invalid number entered. Please try again.');
                    await uiActionFunctions.showEditSingleConfigValueForm(player, dependencies, context);
                }
                return;
            }
            case 'string':
                config[keyName] = String(newValue);
                updateSuccess = true;
                break;
            case 'arrayString':
                try {
                    const parsedArray = JSON.parse(String(newValue));
                    if (Array.isArray(parsedArray) && parsedArray.every(el => typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean')) {
                        config[keyName] = parsedArray;
                        updateSuccess = true;
                    } else {
                        player.sendMessage('§cError: Invalid input. Must be a JSON array of primitives. Please try again.');
                        await uiActionFunctions.showEditSingleConfigValueForm(player, dependencies, context);
                        return;
                    }
                } catch (parseError) {
                    player.sendMessage(`§cError: Invalid JSON format: ${parseError.message}. Please try again.`);
                    await uiActionFunctions.showEditSingleConfigValueForm(player, dependencies, context);
                    return;
                }
                break;
        }

        if (updateSuccess) {
            player.sendMessage(`§aSuccess: Config "${keyName}" updated to: ${JSON.stringify(config[keyName])}`);
            logManager?.addLog({ adminName: player.name, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
            await uiActionFunctions.showConfigCategoriesList(player, dependencies, parentContextForEdit);
        }
    } catch (e) {
        logError(`[UiManager.showEditSingleConfigValueFormImpl] Error: ${e.stack || e}`, e);
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
        await uiActionFunctions.showConfigCategoriesList(player, dependencies, parentContextForEdit);
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {{ configKey: string }} context
 */
async function showEditConfigForm(player, dependencies, context) {
    const { config, updateConfigValue } = dependencies;
    const { configKey } = context;
    const checkKey = configKey.split('.')[1];
    const checkConfig = config.checks[checkKey];

    if (!checkConfig) {
        player.sendMessage(`§cConfiguration for "${configKey}" not found.`);
        return;
    }

    const form = new ModalFormData().title(`Edit ${configKey}`);
    form.toggle('Enabled', checkConfig.enabled);

    const response = await form.show(player);

    if (response.canceled || !response.formValues) {
        return;
    }

    const [enabled] = response.formValues;

    const newConfig = {
        ...checkConfig,
        enabled: !!enabled,
    };

    updateConfigValue(`checks.${checkKey}`, newConfig);

    player.sendMessage(`§aConfiguration for "${configKey}" updated.`);
    await showPanel(player, 'configEditingCombatPanel', dependencies, {});
}

/**
 * @param {import('@minecraft/server').Player} adminPlayer
 * @param {string} titleString
 * @param {string} bodyString
 * @param {string} confirmToggleLabelString
 * @param {() => Promise<void> | void} onConfirmCallback
 * @param {import('../types.js').Dependencies} dependencies
 * @param {Record<string, string | number | boolean>} [bodyParams]
 * @returns {Promise<boolean>}
 */
async function _showConfirmationModal(adminPlayer, titleString, bodyString, confirmToggleLabelString, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils, logManager } = dependencies;
    const playerName = adminPlayer?.name ?? 'UnknownAdmin';
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
            adminPlayer?.sendMessage(playerUtils.getString('ui.common.actionCancelled'));
            return false;
        }
        await onConfirmCallback();
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logError(`[UiManager._showConfirmationModal] Error for ${playerName} (Title: ${titleString}): ${errorStack || errorMessage}`, error);
        logManager?.addLog({ actionType: 'errorUiConfirmationModal', context: 'uiManager._showConfirmationModal', adminName: playerName, details: { titleString, errorMessage, stack: errorStack } }, dependencies);
        adminPlayer?.sendMessage(playerUtils.getString('common.error.genericForm'));
        return false;
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 */
async function confirmClearChatImpl(player, dependencies) {
    const { playerUtils, commandExecutionMap } = dependencies;
    await _showConfirmationModal(player, '§l§cConfirm Clear Chat§r', 'Are you sure you want to clear the global chat for all players?', '§cConfirm Clear Chat', async () => {
        const clearChatCommand = commandExecutionMap?.get('clearchat');
        if (clearChatCommand) {
            await clearChatCommand(player, [], dependencies);
        } else {
            player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
        }
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 */
async function confirmLagClearImpl(player, dependencies) {
    const { playerUtils, commandExecutionMap } = dependencies;
    await _showConfirmationModal(player, '§l§cConfirm Lag Clear§r', 'Are you sure you want to clear all ground items and non-player/non-persistent entities?', '§cConfirm Lag Clear', async () => {
        const lagClearCommand = commandExecutionMap?.get('lagclear');
        if (lagClearCommand) {
            await lagClearCommand(player, [], dependencies);
        } else {
            player.sendMessage('§eNo \'lagclear\' command configured. Performing basic item clear as fallback.');
            try {
                if (player.isValid()) {
                    await player.runCommandAsync('kill @e[type=item]');
                    player.sendMessage('§aSuccess: Ground items cleared.');
                }
            } catch (e) {
                player.sendMessage('§cError: Basic item clear command failed. See console for details.');
                logError(`[UiManager.confirmLagClearImpl] Basic item clear failed: ${ e.stack || e}`, e);
            }
        }
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 */
async function displayActionLogsModalImpl(player, dependencies) {
    const { playerUtils, logManager } = dependencies;
    const adminPlayerName = player.name;
    let logText = '§g--- All Action Logs ---\n§r';
    const allLogs = logManager?.getLogs?.() ?? [];
    const maxLogsToShow = 50;
    const logsToShow = allLogs.slice(0, maxLogsToShow);

    if (logsToShow.length === 0) {
        logText += 'No action logs found.';
    } else {
        for (const log of logsToShow) {
            if (!log) continue;
            const timestamp = new Date(log.timestamp ?? Date.now()).toLocaleString();
            let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
            if (log.targetName) {
                entry += ` §b-> ${log.targetName}`;
            }
            let detailsString = '';
            if (log.details) {
                if (typeof log.details === 'string') {
                    detailsString = log.details;
                } else if (typeof log.details === 'object' && log.details !== null) {
                    const detailParts = [];
                    const detailsObj = log.details;
                    if ('reason' in detailsObj) detailParts.push(`Reason: ${detailsObj.reason}`);
                    if ('durationDisplay' in detailsObj) detailParts.push(`Duration: ${detailsObj.durationDisplay}`);
                    for (const key in detailsObj) {
                        if (key !== 'reason' && key !== 'durationDisplay' && !['rawErrorStack', 'stack', 'errorCode', 'message'].includes(key) && Object.prototype.hasOwnProperty.call(detailsObj, key)) {
                            detailParts.push(`${key}: ${detailsObj[key]}`);
                        }
                    }
                    detailsString = detailParts.join(', ');
                }
            }
            if (detailsString) {
                entry += ` §7(${detailsString})§r`;
            }
            logText += `${entry}\n`;
        }
        if (allLogs.length > maxLogsToShow) {
            logText += `\n§o(Showing latest ${maxLogsToShow} of ${allLogs.length} entries.)§r`;
        }
    }
    const modal = new ModalFormData().title('§l§3Action Logs (All)§r').body(logText.trim()).button1(playerUtils.getString('common.button.ok'));
    try {
        await modal.show(player);
    } catch (error) {
        logError(`[UiManager.displayActionLogsModalImpl] Error: ${error.stack || error}`, error);
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
    } finally {
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function showModLogFilterModalImpl(player, dependencies, context) {
    const { playerUtils, logManager, config } = dependencies;
    const adminPlayerName = player.name;
    const modal = new ModalFormData().title(playerUtils.getString('ui.modLogSelect.filterModal.title')).textField(playerUtils.getString('ui.modLogSelect.filterModal.textField.label'), playerUtils.getString('ui.modLogSelect.filterModal.textField.placeholder'), String(context.playerNameFilter || ''));
    try {
        const response = await modal.show(player);
        if (response.canceled || !response.formValues) {
            const callingPanelState = getCurrentTopOfNavStack(player.id);
            await showPanel(player, callingPanelState?.panelId ?? 'modLogSelectionPanel', dependencies, callingPanelState?.context ?? {});
            return;
        }
        const [playerNameInput] = response.formValues;
        const newPlayerNameFilter = typeof playerNameInput === 'string' ? playerNameInput.trim() : null;

        if (newPlayerNameFilter) {
            player.sendMessage(playerUtils.getString('ui.modLogSelect.filterModal.filterSet', { filterName: newPlayerNameFilter }));
        } else {
            player.sendMessage(playerUtils.getString('ui.modLogSelect.filterModal.filterCleared'));
        }

        const logsPerPage = config?.ui?.logsPerPage ?? 5;
        const allLogs = logManager?.getLogs?.(context.logTypeFilter || [], newPlayerNameFilter) ?? [];
        const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

        const nextContext = { ...context, playerNameFilter: newPlayerNameFilter, currentPage: 1, totalPages };
        pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
        await showPanel(player, 'logViewerPanel', dependencies, nextContext);

    } catch (error) {
        logError(`[UiManager.showModLogFilterModalImpl] Error for ${adminPlayerName}: ${error.stack || error}`, error);
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'modLogSelectionPanel', context: {} };
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function displaySpecificLogsPageImpl(player, dependencies, context) {
    const { playerUtils, logManager, config } = dependencies;
    const adminPlayerName = player.name;

    const {
        logTypeFilter = [],
        logTypeName = 'Selected Logs',
        playerNameFilter = null,
        currentPage = 1,
    } = context;

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const filteredLogs = logManager?.getLogs?.(logTypeFilter, playerNameFilter) ?? [];
    const totalLogs = filteredLogs.length;
    const effectiveTotalPages = context.totalPages ?? Math.ceil(totalLogs / logsPerPage) || 1;

    let title = '';
    if (playerNameFilter) {
        title = playerUtils.getString('ui.logViewer.title.filteredPaged', { logTypeName, filterName: playerNameFilter, currentPage, totalPages: effectiveTotalPages });
    } else {
        title = playerUtils.getString('ui.logViewer.title.unfilteredPaged', { logTypeName, currentPage, totalPages: effectiveTotalPages });
    }

    let messageBody = '';
    if (totalLogs === 0) {
        messageBody = playerUtils.getString('ui.logViewer.noLogs');
    } else {
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, totalLogs);

        for (let i = startIndex; i < endIndex; i++) {
            const log = filteredLogs[i];
            if (!log) continue;

            const timestamp = new Date(log.timestamp ?? Date.now()).toLocaleString();
            const entry = playerUtils.getString('ui.actionLogs.logEntry', {
                timestamp,
                actor: log.actor || 'Unknown',
                actionType: log.actionType || 'unknown',
                target: log.targetName ? ` -> ${log.targetName}` : '',
                duration: log.details?.durationDisplay ? playerUtils.getString('ui.actionLogs.logEntry.duration', { duration: log.details.durationDisplay }) : '',
                reason: log.details?.reason ? playerUtils.getString('ui.actionLogs.logEntry.reason', { reason: log.details.reason }) : '',
                details: '',
            });
            messageBody += `${entry}\n`;
        }
        messageBody += `\n${playerUtils.getString('ui.logViewer.footer.pageInfo', { currentPage, totalPages: effectiveTotalPages, totalEntries: totalLogs })}`;
    }

    const modal = new ModalFormData().title(title).body(messageBody.trim()).button1(playerUtils.getString('common.button.ok'));

    try {
        await modal.show(player);
    } catch (error) {
        player.sendMessage(playerUtils.getString('common.error.genericForm'));
        logError(`[UiManager.displaySpecificLogsPageImpl] Error: ${error.stack || error}`, error);
    } finally {
        await showPanel(player, 'logViewerPanel', dependencies, { ...context, totalPages: effectiveTotalPages });
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {string} panelId
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} [currentContext]
 */
async function showPanel(player, panelId, dependencies, currentContext = {}) {
    const { playerUtils, logManager, rankManager, config } = dependencies;
    const viewingPlayerName = player.name;

    const effectiveContext = { ...currentContext };

    if (panelId === 'logViewerPanel') {
        const logsPerPage = config?.ui?.logsPerPage ?? 5;
        const { logTypeFilter = [], playerNameFilter = null } = effectiveContext;
        const allLogs = logManager?.getLogs?.(logTypeFilter, playerNameFilter) ?? [];
        effectiveContext.totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;
        effectiveContext.currentPage = Math.max(1, Math.min(effectiveContext.currentPage ?? 1, effectiveContext.totalPages));
    }

    const panelDefinition = panelDefinitions[panelId];

    if (!panelDefinition) {
        logError(`[UiManager.showPanel] Error: Panel definition for panelId "${panelId}" not found.`);
        if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `Panel "${panelId}" is missing.`,
                originalPanelId: panelId,
                originalContext: effectiveContext,
            });
        } else {
            player.sendMessage(playerUtils.getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id);
        }
        return;
    }

    let panelTitle = panelDefinition.title;
    for (const key in effectiveContext) {
        if (Object.prototype.hasOwnProperty.call(effectiveContext, key)) {
            panelTitle = panelTitle.replace(new RegExp(`{${key}}`, 'g'), String(effectiveContext[key]));
        }
    }

    const form = new ActionFormData().title(panelTitle);
    const userPermLevel = rankManager.getPlayerPermissionLevel(player, dependencies);

    let allPanelItems = [...(panelDefinition.items || [])];

    if (panelDefinition.dynamicItemGeneratorKey) {
        const generatorFunction = uiDynamicItemGenerators[panelDefinition.dynamicItemGeneratorKey];
        if (generatorFunction) {
            try {
                const dynamicItems = generatorFunction(player, dependencies, effectiveContext);
                allPanelItems.push(...dynamicItems);
            } catch (genError) {
                logError(`[UiManager.showPanel] Error in generator "${panelDefinition.dynamicItemGeneratorKey}": ${genError.stack || genError}`, genError);
                if (panelId !== 'errorDisplayPanel') {
                    await showPanel(player, 'errorDisplayPanel', dependencies, {
                        errorMessage: `Panel "${panelTitle}" failed to generate content.`,
                        originalPanelId: panelId,
                        originalContext: effectiveContext,
                    });
                }
                return;
            }
        }
    }

    const permittedItems = allPanelItems
        .filter(item => {
            if (!item) return false;
            if (panelId === 'logViewerPanel') {
                if (item.id === 'prevLogPage' && effectiveContext.currentPage <= 1) return false;
                if (item.id === 'nextLogPage' && effectiveContext.currentPage >= effectiveContext.totalPages) return false;
            }
            return userPermLevel <= item.requiredPermLevel;
        })
        .sort((a, b) => (a.sortId ?? 999) - (b.sortId ?? 999));

    permittedItems.forEach(item => {
        let effectiveText = item.text;
        let effectiveIcon = item.icon;

        if (item.textVariants) {
            const variant = item.textVariants.find(v => effectiveContext[v.contextKey] === v.contextValue);
            if (variant) effectiveText = variant.text;
        }

        if (item.iconVariants) {
            const variant = item.iconVariants.find(v => effectiveContext[v.contextKey] === v.contextValue);
            if (variant) effectiveIcon = variant.icon;
        }

        for (const key in effectiveContext) {
            if (Object.prototype.hasOwnProperty.call(effectiveContext, key)) {
                effectiveText = effectiveText.replace(new RegExp(`{${key}}`, 'g'), String(effectiveContext[key]));
            }
        }
        form.button(effectiveText, effectiveIcon);
    });

    const atRootLevel = isNavStackAtRoot(player.id) || !panelDefinition.parentPanelId;
    const backExitButtonText = atRootLevel ? playerUtils.getString('common.button.close') : playerUtils.getString('common.button.back');
    const backExitButtonIcon = atRootLevel ? 'textures/ui/cancel' : 'textures/ui/undo';

    if (panelId === 'errorDisplayPanel' || permittedItems.length > 0 || !panelDefinition.items?.length) {
        form.button(backExitButtonText, backExitButtonIcon);
    }
    const backExitButtonIndex = permittedItems.length;

    if (panelId === 'errorDisplayPanel' && effectiveContext.errorMessage) {
        form.body(String(effectiveContext.errorMessage));
    } else if (permittedItems.length === 0 && panelDefinition.items?.length > 0) {
        form.body(playerUtils.getString('ui.common.noPermissionForPanelItems'));
    } else if (permittedItems.length === 0) {
        form.body(playerUtils.getString('ui.common.noOptionsAvailable'));
    }

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            if (atRootLevel) clearPlayerNavStack(player.id);
            return;
        }
        const { selection } = response;
        if (selection === undefined) return;

        if (selection < permittedItems.length) {
            const selectedItem = permittedItems[selection];
            if (selectedItem.actionType === 'openPanel' && selectedItem.actionValue) {
                let baseContext = {};
                if (selectedItem.actionContextVars?.length) {
                    selectedItem.actionContextVars.forEach(varName => {
                        if (varName in effectiveContext) baseContext[varName] = effectiveContext[varName];
                    });
                } else {
                    baseContext = { ...effectiveContext };
                }
                const nextContext = { ...baseContext, ...selectedItem.initialContext };
                pushToPlayerNavStack(player.id, panelId, effectiveContext);
                await showPanel(player, selectedItem.actionValue, dependencies, nextContext);
            } else if (selectedItem.actionType === 'functionCall' && selectedItem.actionValue) {
                const funcToCall = uiActionFunctions[selectedItem.actionValue];
                if (funcToCall) {
                    const functionContext = { ...effectiveContext, ...selectedItem.initialContext };
                    await funcToCall(player, dependencies, functionContext);
                } else {
                    player.sendMessage(playerUtils.getString('common.error.genericForm'));
                    await showPanel(player, panelId, dependencies, effectiveContext);
                }
            }
        } else if (selection === backExitButtonIndex) {
            if (atRootLevel) {
                clearPlayerNavStack(player.id);
            } else {
                const previousPanelState = popFromPlayerNavStack(player.id);
                if (previousPanelState) {
                    await showPanel(player, previousPanelState.panelId, dependencies, previousPanelState.context);
                } else {
                    clearPlayerNavStack(player.id);
                }
            }
        }
    } catch (error) {
        logError(`[UiManager.showPanel] Error processing panel ${panelId}: ${error.stack || error}`, error);
        if (panelId !== 'errorDisplayPanel') {
            const previousState = getCurrentTopOfNavStack(player.id);
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `Error in panel "${panelId}": ${error.message}`,
                originalPanelId: panelId,
                originalContext: effectiveContext,
                previousPanelIdOnError: previousState?.panelId,
                previousContextOnError: previousState?.context,
            });
        } else {
            player.sendMessage(playerUtils.getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id);
        }
    }
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function prepareBanUnbanLogsViewer(player, dependencies, context) {
    const { logManager, config, playerUtils } = dependencies;

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['playerBanned', 'playerUnbanned'];
    const logTypeName = playerUtils.getString('ui.logViewer.title.banUnban');
    const allLogs = logManager?.getLogs?.(logTypeFilter, null) ?? [];
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = {
        ...context,
        logTypeFilter,
        logTypeName,
        playerNameFilter: null,
        currentPage: 1,
        totalPages,
    };
    pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function prepareMuteUnmuteLogsViewer(player, dependencies, context) {
    const { logManager, config, playerUtils } = dependencies;

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['playerMuted', 'playerUnmuted'];
    const logTypeName = playerUtils.getString('ui.logViewer.title.muteUnmute');
    const allLogs = logManager?.getLogs?.(logTypeFilter, null) ?? [];
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = {
        ...context,
        logTypeFilter,
        logTypeName,
        playerNameFilter: null,
        currentPage: 1,
        totalPages,
    };
    pushToPlayerNavStack(player.id, 'modLogSelectionPanel', context);
    await showPanel(player, 'logViewerPanel', dependencies, newContext);
}


const uiActionFunctions = {
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showMyStatsPageContent: async (player, dependencies, context) => {
        const { playerUtils, playerDataManager } = dependencies;
        const pData = playerDataManager.getPlayerData(player.id);
        const totalFlags = pData?.flags?.totalFlags ?? 0;
        const location = player.location;
        const dimensionName = playerUtils.formatDimensionName(player.dimension.id);
        const bodyText = `You have ${totalFlags} flags.\nLocation: X:${Math.floor(location.x)}, Y:${Math.floor(location.y)}, Z:${Math.floor(location.z)} in ${dimensionName}`;
        const modal = new ModalFormData().title('§l§bYour Stats§r').body(bodyText).button1(playerUtils.getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'myStatsPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showServerRulesPageContent: async (player, dependencies, context) => {
        const { playerUtils, config } = dependencies;
        const serverRules = config?.serverRules ?? [];
        const bodyText = serverRules.length > 0 ? serverRules.join('\n') : 'No server rules defined.';
        const modal = new ModalFormData().title('§l§eServer Rules§r').body(bodyText).button1(playerUtils.getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'serverRulesPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     */
    showHelpfulLinksPageContent: async (player, dependencies) => {
        const { playerUtils } = dependencies;
        player.sendMessage('This UI element is deprecated.');
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'mainUserPanel', context: {} };
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    displayLinkInChat: async (player, dependencies, context) => {
        const { playerUtils } = dependencies;
        const { linkUrl, linkTitle, originalPanelIdForDisplayLink, originalContextForDisplayLink } = context;
        if (typeof linkUrl === 'string' && typeof linkTitle === 'string') {
            player.sendMessage(`§e${linkTitle}: §9§n${linkUrl}§r`);
            player.sendMessage(playerUtils.getString('ui.helpfulLinks.clickHint'));
        } else {
            player.sendMessage(playerUtils.getString('common.error.generic'));
        }
        if (typeof originalPanelIdForDisplayLink === 'string') {
            await showPanel(player, originalPanelIdForDisplayLink, dependencies, originalContextForDisplayLink || {});
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    returnToCallingPanel: async (player, dependencies, context) => {
        const { playerUtils } = dependencies;
        const { originalPanelId, originalContext } = context;
        if (typeof originalPanelId === 'string') {
            await showPanel(player, originalPanelId, dependencies, originalContext || {});
        } else {
            player.sendMessage('§cError: Could not determine panel to return to.');
            await showPanel(player, 'mainUserPanel', dependencies, {});
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    refreshOnlinePlayersPanelAction: async (player, dependencies, context) => {
        await showPanel(player, 'onlinePlayersPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    refreshWatchedPlayersPanelAction: async (player, dependencies, context) => {
        await showPanel(player, 'watchedPlayersPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showGeneralTipsPageContent: async (player, dependencies, context) => {
        const { playerUtils, config } = dependencies;
        const generalTips = config?.generalTips ?? [];
        const bodyText = generalTips.length > 0 ? generalTips.join('\n\n---\n\n') : 'No tips available.';
        const modal = new ModalFormData().title('General Tips').content(bodyText).button1(playerUtils.getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            // empty
        } finally {
            await showPanel(player, 'generalTipsPanel', dependencies, context);
        }
    },
    showInspectPlayerForm,
    showResetFlagsForm: showResetFlagsFormImpl,
    showEditConfigForm,
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     */
    displaySystemInfoModal: async (player, dependencies) => {
        const { playerUtils, config, logManager, playerDataManager, reportManager, system, worldBorderManager } = dependencies;
        let infoText = `§g--- System Information ---\n§r` +
            `Version: §e${config.addonVersion}\n` +
            `Server Time: §e${new Date().toLocaleTimeString()}\n` +
            `Tick: §e${system.currentTick}\n` +
            `Online: §e${world.getAllPlayers().length}\n` +
            `Cached Players: §e${playerDataManager?.getAllPlayerDataCount?.() ?? 'N/A'}\n` +
            `Watched: §e${world.getAllPlayers().filter(p => playerDataManager?.getPlayerData(p.id)?.isWatched).length}\n` +
            `Mutes: §e${playerDataManager?.getPersistentMuteCount?.() ?? 'N/A'}\n` +
            `Bans: §e${playerDataManager?.getPersistentBanCount?.() ?? 'N/A'}\n` +
            `World Borders: §e${worldBorderManager?.getActiveBorderCount?.() ?? 'N/A'}\n` +
            `Logs (Memory): §e${logManager?.getInMemoryLogCount?.() ?? 'N/A'}\n` +
            `Reports (Memory): §e${reportManager?.getInMemoryReportCount?.() ?? 'N/A'}`;

        const modal = new ModalFormData().title('§l§bSystem Information§r').body(infoText).button1(playerUtils.getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (error) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        }
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    },
    confirmClearChat: confirmClearChatImpl,
    confirmLagClear: confirmLagClearImpl,
    showConfigCategoriesList: showConfigCategoriesListImpl,
    showEditSingleConfigValueForm: showEditSingleConfigValueFormImpl,
    displayActionLogsModal: displayActionLogsModalImpl,
    showModLogFilterModal: showModLogFilterModalImpl,
    displaySpecificLogsPage: displaySpecificLogsPageImpl,
    goToNextLogPage,
    goToPrevLogPage,
    prepareBanUnbanLogsViewer,
    prepareMuteUnmuteLogsViewer,
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    displayDetailedFlagsModal: async (player, dependencies, context) => {
        const { playerUtils, playerDataManager } = dependencies;
        const { targetPlayerId, targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage('§cTarget not specified.'); await showPanel(player, 'playerActionsPanel', dependencies, context); return;
        }
        const targetPData = playerDataManager.getPlayerData(String(targetPlayerId || targetPlayerName));
        let bodyText = `§g--- Flags for ${targetPlayerName} ---\n§rTotal: ${targetPData?.flags?.totalFlags ?? 0}\n\n`;
        if (!targetPData?.flags || Object.keys(targetPData.flags).length <= 2) {
            bodyText += 'No flags recorded.';
        } else {
            for (const flagKey in targetPData.flags) {
                if (flagKey !== 'totalFlags' && flagKey !== 'lastFlagTime' && flagKey !== 'lastFlagType') {
                    const flagInfo = targetPData.flags[flagKey];
                    if (flagInfo && flagInfo.count > 0) {
                        bodyText += `§e${flagKey}: §f${flagInfo.count} §7(Last: ${new Date(flagInfo.lastDetectionTime).toLocaleString()})§r\n`;
                    }
                }
            }
        }
        const modal = new ModalFormData().title(`§l§3Flags: ${targetPlayerName}§r`).body(bodyText.trim()).button1(playerUtils.getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (error) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showBanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, config, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'ban' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        const modal = new ModalFormData()
            .title(playerUtils.getString('ui.playerActions.ban.title', { targetPlayerName }))
            .textField('Duration:', 'e.g., 30m, 1d, perm', config?.banCommand?.defaultDuration ?? 'perm')
            .textField('Reason:', 'Reason for ban', config?.banCommand?.defaultReason ?? '');
        try {
            const response = await modal.show(player);
            if (response.canceled || !response.formValues) return;
            const [duration, reason] = response.formValues;
            if (typeof reason !== 'string' || !reason.trim()) {
                player.sendMessage(playerUtils.getString('common.error.reasonEmpty'));
                await uiActionFunctions.showBanFormForPlayer(player, dependencies, context);
                return;
            }
            const banCommand = commandExecutionMap?.get('ban');
            if (banCommand) {
                await banCommand(player, [targetPlayerName, String(duration), reason], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'ban' }));
            }
        } catch (error) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showKickFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, config, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'kick' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        const modal = new ModalFormData()
            .title(playerUtils.getString('ui.playerActions.kick.title', { targetPlayerName }))
            .textField('Reason:', 'Reason for kick', config?.kickCommand?.defaultReason ?? '');
        try {
            const response = await modal.show(player);
            if (response.canceled || !response.formValues) return;
            const [reason] = response.formValues;
            const kickCommand = commandExecutionMap?.get('kick');
            if (kickCommand) {
                await kickCommand(player, [targetPlayerName, String(reason || '')], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'kick' }));
            }
        } catch (error) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showMuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, config, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'mute' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        const modal = new ModalFormData()
            .title(playerUtils.getString('ui.playerActions.mute.title', { targetPlayerName }))
            .textField('Duration:', 'e.g., 30m, 1h, 1d', config?.muteCommand?.defaultDuration ?? '30m')
            .textField('Reason:', 'Reason for mute', config?.muteCommand?.defaultReason ?? '');
        try {
            const response = await modal.show(player);
            if (response.canceled || !response.formValues) return;
            const [duration, reason] = response.formValues;
            const muteCommand = commandExecutionMap?.get('mute');
            if (muteCommand) {
                await muteCommand(player, [targetPlayerName, String(duration), String(reason || '')], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'mute' }));
            }
        } catch (error) {
            player.sendMessage(playerUtils.getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    toggleFreezePlayer: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage('§cTarget not specified.');
        } else {
            const freezeCommand = commandExecutionMap?.get('freeze');
            if (freezeCommand) {
                await freezeCommand(player, [targetPlayerName, 'toggle'], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'freeze' }));
            }
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    teleportAdminToPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage('§cTarget not specified.');
        } else {
            const targetPlayer = playerUtils.findPlayer(targetPlayerName);
            if (targetPlayer?.isValid()) {
                try {
                    await player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                    player.sendMessage(`§aTeleported to ${targetPlayerName}.`);
                    logManager?.addLog({ adminName: player.name, actionType: 'teleportSelfToPlayer', targetName: targetPlayerName });
                } catch (e) {
                    player.sendMessage('§cTeleport failed.');
                }
            } else {
                player.sendMessage(playerUtils.getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
            }
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    teleportPlayerToAdmin: async (player, dependencies, context) => {
        const { playerUtils, logManager } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage('§cTarget not specified.');
        } else {
            const targetPlayer = playerUtils.findPlayer(targetPlayerName);
            if (targetPlayer?.isValid()) {
                try {
                    await targetPlayer.teleport(player.location, { dimension: player.dimension });
                    player.sendMessage(`§aBrought ${targetPlayerName} to you.`);
                    targetPlayer.sendMessage(`§7You were teleported by ${player.name}.`);
                    logManager?.addLog({ adminName: player.name, actionType: 'teleportPlayerToAdmin', targetName: targetPlayerName });
                } catch (e) {
                    player.sendMessage('§cTeleport failed.');
                }
            } else {
                player.sendMessage(playerUtils.getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
            }
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showUnmuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'unmute' }));
        } else {
            await _showConfirmationModal(player, `Unmute ${targetPlayerName}`, `Confirm unmuting ${targetPlayerName}?`, '§aConfirm Unmute', async () => {
                const unmuteCommand = commandExecutionMap?.get('unmute');
                if (unmuteCommand) {
                    await unmuteCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'unmute' }));
                }
            }, dependencies);
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    confirmClearPlayerInventory: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap, logManager } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'clear inventory' }));
        } else {
            await _showConfirmationModal(player, `Clear ${targetPlayerName}'s Inv`, `Confirm clearing inventory for ${targetPlayerName}?`, '§cConfirm Clear Inventory', async () => {
                const clearInvCommand = commandExecutionMap?.get('clearinv');
                if (clearInvCommand) {
                    await clearInvCommand(player, [targetPlayerName], dependencies);
                } else {
                    try {
                        const target = world.getAllPlayers().find(p => p.name === targetPlayerName);
                        if (target) {
                            await target.runCommandAsync('clear @s');
                            player.sendMessage(`§aCleared inventory for ${targetPlayerName}.`);
                            logManager?.addLog({ adminName: player.name, actionType: 'playerInventoryCleared', targetName: targetPlayerName });
                        } else {
                            player.sendMessage(playerUtils.getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
                        }
                    } catch (e) {
                        player.sendMessage(`§cFailed to clear inventory for ${targetPlayerName}.`);
                    }
                }
            }, dependencies);
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showUnbanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'unban' }));
        } else {
            await _showConfirmationModal(player, `Unban ${targetPlayerName}`, `Confirm unbanning ${targetPlayerName}?`, '§aConfirm Unban', async () => {
                const unbanCommand = commandExecutionMap?.get('unban');
                if (unbanCommand) {
                    await unbanCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'unban' }));
                }
            }, dependencies);
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    confirmResetPlayerFlagsForPlayer: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'reset flags' }));
        } else {
            await _showConfirmationModal(player, `Reset ${targetPlayerName}'s Flags`, `Confirm resetting all flags for ${targetPlayerName}?`, '§cConfirm Reset Flags', async () => {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            }, dependencies);
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showPlayerInventoryFromPanel: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'view inventory' }));
        } else {
            const invseeCommand = commandExecutionMap?.get('invsee');
            if (invseeCommand) {
                await invseeCommand(player, [targetPlayerName], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'invsee' }));
            }
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    toggleWatchPlayerFromPanel: async (player, dependencies, context) => {
        const { playerUtils, commandExecutionMap } = dependencies;
        const { targetPlayerName } = context;
        if (typeof targetPlayerName !== 'string') {
            player.sendMessage(playerUtils.getString('ui.playerActions.error.targetNotSpecified', { action: 'toggle watch' }));
        } else {
            const watchCommand = commandExecutionMap?.get('watch');
            if (watchCommand) {
                await watchCommand(player, [targetPlayerName, 'toggle'], dependencies);
            } else {
                player.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'watch' }));
            }
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    refreshReportListPanelAction: async (player, dependencies, context) => {
        await showPanel(player, 'reportManagementPanel', dependencies, context);
    },
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showReportDetailsModal: async (player, dependencies, context) => {
        const { reportManager, playerUtils } = dependencies;
        const { reportId } = context;
        const report = reportManager.getReportById(reportId);

        if (!report) {
            player.sendMessage(playerUtils.getString('command.viewreports.idNotFound', { reportId }));
            await showPanel(player, 'reportManagementPanel', dependencies, {});
            return;
        }

        const bodyText = `ID: ${report.id}\n` +
            `Timestamp: ${new Date(report.timestamp).toLocaleString()}\n` +
            `Reporter: ${report.reporterName}\n` +
            `Reported: ${report.reportedName}\n` +
            `Reason: ${report.reason}\n` +
            `Status: ${report.status}\n` +
            (report.assignedAdmin ? `Assigned to: ${report.assignedAdmin}\n` : '') +
            (report.resolutionDetails ? `Resolution: ${report.resolutionDetails}\n` : '');

        const modal = new ModalFormData().title('Report Details').body(bodyText).button1('OK');
        await modal.show(player);
        await showPanel(player, 'reportActionsPanel', dependencies, context);
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    assignReportToSelf: (player, dependencies, context) => {
        const { reportManager } = dependencies;
        const { reportId } = context;
        if (reportManager.assignReport(reportId, player.name)) {
            player.sendMessage(`§aReport ${reportId} assigned to you.`);
        } else {
            player.sendMessage(`§cFailed to assign report ${reportId}.`);
        }
        showPanel(player, 'reportManagementPanel', dependencies, {});
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    showResolveReportForm: async (player, dependencies, context) => {
        const { reportManager } = dependencies;
        const { reportId } = context;

        const modal = new ModalFormData().title(`Resolve Report: ${reportId}`).textField('Resolution Notes:', 'Details').toggle('Mark as resolved', true);
        const response = await modal.show(player);

        if (response.canceled || !response.formValues) {
            await showPanel(player, 'reportActionsPanel', dependencies, context);
            return;
        }

        const [resolutionNotes, isResolved] = response.formValues;
        if (isResolved) {
            if (reportManager.resolveReport(reportId, player.name, String(resolutionNotes))) {
                player.sendMessage(`§aReport ${reportId} resolved.`);
            } else {
                player.sendMessage(`§cFailed to resolve report ${reportId}.`);
            }
        }
        await showPanel(player, 'reportManagementPanel', dependencies, {});
    },

    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @param {object} context
     */
    confirmClearReport: async (player, dependencies, context) => {
        const { reportManager } = dependencies;
        const { reportId } = context;

        await _showConfirmationModal(player, 'Confirm Clear Report', `Clear report ${reportId}?`, 'Confirm', async () => {
            if (reportManager.clearReportById(reportId, dependencies)) {
                player.sendMessage(`§aReport ${reportId} cleared.`);
            } else {
                player.sendMessage(`§cFailed to clear report ${reportId}.`);
            }
        }, dependencies);
        await showPanel(player, 'reportManagementPanel', dependencies, {});
    },
};
Object.assign(uiDynamicItemGenerators, {
    /**
     * @param {import('@minecraft/server').Player} player
     * @param {import('../types.js').Dependencies} dependencies
     * @returns {import('./panelLayoutConfig.js').PanelItem[]}
     */
    generateReportListItems: (player, dependencies) => {
        const { reportManager } = dependencies;
        const openReports = reportManager?.getOpenReports?.() ?? [];
        return openReports.map((report, index) => ({
            id: `report_${report.id}`,
            sortId: 10 + index,
            text: `§eID: §f${report.id}\n§cReported: §f${report.reportedName}`,
            icon: 'textures/ui/feedback',
            requiredPermLevel: 1,
            actionType: 'openPanel',
            actionValue: 'reportActionsPanel',
            initialContext: { reportId: report.id },
        }));
    },
});


/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function goToNextLogPage(player, dependencies, context) {
    const currentPage = (context.currentPage ?? 1);
    const totalPages = (context.totalPages ?? 1);
    const nextPage = Math.min(currentPage + 1, totalPages);
    await showPanel(player, 'logViewerPanel', dependencies, { ...context, currentPage: nextPage });
}

/**
 * @param {import('@minecraft/server').Player} player
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function goToPrevLogPage(player, dependencies, context) {
    const currentPage = (context.currentPage ?? 1);
    const prevPage = Math.max(currentPage - 1, 1);
    await showPanel(player, 'logViewerPanel', dependencies, { ...context, currentPage: prevPage });
}

/**
 * @param {import('@minecraft/server').Player} adminPlayer
 * @param {import('../types.js').Dependencies} dependencies
 * @param {object} context
 */
async function showInspectPlayerForm(adminPlayer, dependencies, context) {
    const { playerUtils, logManager, commandExecutionMap } = dependencies;
    const adminName = adminPlayer?.name ?? 'UnknownAdmin';

    const modalForm = new ModalFormData().title(inspectPlayerTitle).textField(inspectPlayerTextFieldLabel, inspectPlayerTextFieldPlaceholder);

    try {
        const response = await modalForm.show(adminPlayer);
        const callingPanelState = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };

        if (response.canceled || !response.formValues) {
            await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
            return;
        }
        const targetPlayerName = String(response.formValues[0] ?? '').trim();
        if (!targetPlayerName) {
            adminPlayer?.sendMessage(playerUtils.getString('common.error.nameEmpty'));
            await uiActionFunctions.showInspectPlayerForm(adminPlayer, dependencies, context);
            return;
        }

        const commandExecute = commandExecutionMap?.get('inspect');
        if (commandExecute) {
            await commandExecute(adminPlayer, [targetPlayerName], dependencies);
        } else {
            adminPlayer?.sendMessage(playerUtils.getString('common.error.commandModuleNotFound', { moduleName: 'inspect' }));
        }
        await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);

    } catch (error) {
        logError(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.stack || error}`, error);
        adminPlayer?.sendMessage(playerUtils.getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };
        await showPanel(adminPlayer, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
    }
}

export { showPanel, clearPlayerNavStack };
