/**
 * @file Manages the display of dynamic, hierarchical UI panels and modal forms.
 * @module AntiCheatsBP/scripts/core/uiManager
 */
import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { panelDefinitions } from '../core/panelLayoutConfig.js';

// Constants for showInspectPlayerForm
const inspectPlayerTitle = '§l§3Inspect Player§r';
const inspectPlayerTextFieldLabel = 'Player Name:';
const inspectPlayerTextFieldPlaceholder = 'Enter exact player name';

// Constants for string truncation in config UI
const CONFIG_UI_MAX_STRING_DISPLAY_LENGTH = 30;
const CONFIG_UI_TRUNCATE_KEEP_LENGTH = 27;

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
 * @param {string} playerId The ID of the player.
 * @param {string} panelId The ID of the panel.
 * @param {object} context The context for the panel.
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
 * @returns {{panelId: string, context: object}|null} The popped panel state or null.
 */
function popFromPlayerNavStack(playerId) {
    if (!playerNavigationStacks.has(playerId)) {
        return null;
    }
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
    if (!playerNavigationStacks.has(playerId)) {
        return true;
    }
    return playerNavigationStacks.get(playerId).length <= 1;
}

/**
 * Gets the current panel state from the player's navigation stack.
 * @param {string} playerId The ID of the player.
 * @returns {{panelId: string, context: object}|null} The current panel state or null.
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
const UI_DYNAMIC_ITEM_GENERATORS = {
    /**
 * Generates panel items for each helpful link in the configuration.
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
 * @returns {import('./panelLayoutConfig.js').PanelItem[]} An array of PanelItem objects.
     */
    generateHelpfulLinkItems: (player, dependencies, context) => {
        const { config } = dependencies;
        const helpfulLinks = config?.helpfulLinks ?? [];
        const items = [];

        if (helpfulLinks.length === 0) {
            // If no links, we could return a single item saying "No links configured"
            // or let showPanel handle empty items list with its generic message.
            // For now, let showPanel handle it.
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
                        // Pass the original panel context so `displayLinkInChat` can return properly
                        originalPanelIdForDisplayLink: 'helpfulLinksPanel',
                        originalContextForDisplayLink: { ...context },
                    },
                    actionContextVars: [], // No need to pass current panel context vars further in this specific item
                });
            }
        });
        return items;
    },
    /**
 * Generates panel items for each server rule in the configuration.
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
 * @returns {import('./panelLayoutConfig.js').PanelItem[]} An array of PanelItem objects.
     */
    generateServerRuleItems: (player, dependencies, context) => {
        const { config } = dependencies;
        // Assuming config.serverRules is an array of strings.
        const serverRules = config?.serverRules ?? [];
        const items = [];

        if (serverRules.length === 0) {
            // Let showPanel handle the empty list message.
            return [];
        }

        serverRules.forEach((rule, index) => {
            if (typeof rule === 'string' && rule.trim() !== '') {
                items.push({
                    id: `serverRule_${index}`,
                    sortId: 10 + index * 10,
                    text: rule, // Display the rule text directly on the button
                    icon: 'textures/ui/scroll_filled', // Optional: use a consistent icon
                    requiredPermLevel: 1024,
                    actionType: 'functionCall',
                    actionValue: 'returnToCallingPanel', // Action to re-display this panel
                    initialContext: {
                        originalPanelId: 'serverRulesPanel', // Panel to return to
                        originalContext: { ...context },      // Context of this panel
                    },
                    actionContextVars: [],
                });
            }
        });
        return items;
    },
    /**
 * Generates panel items for each general tip in the configuration.
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
 * @returns {import('./panelLayoutConfig.js').PanelItem[]} An array of PanelItem objects.
     */
    generateGeneralTipItems: (player, dependencies, context) => {
        const { config } = dependencies;
        // Assuming config.generalTips is an array of strings.
        const generalTips = config?.generalTips ?? [];
        const items = [];

        if (generalTips.length === 0) {
            return []; // Let showPanel handle empty list message.
        }

        generalTips.forEach((tip, index) => {
            if (typeof tip === 'string' && tip.trim() !== '') {
                items.push({
                    id: `generalTip_${index}`,
                    sortId: 10 + index * 10,
                    text: tip, // Display the tip text directly on the button
                    icon: 'textures/ui/light_bulb_momented', // Optional: use a consistent icon
                    requiredPermLevel: 1024,
                    actionType: 'functionCall',
                    actionValue: 'returnToCallingPanel', // Action to re-display this panel
                    initialContext: {
                        originalPanelId: 'generalTipsPanel', // Panel to return to
                        originalContext: { ...context },       // Context of this panel
                    },
                    actionContextVars: [],
                });
            }
        });
        return items;
    },
    /**
 * Generates panel items for each online player.
 * @param {import('@minecraft/server').Player} player The admin player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @returns {import('./panelLayoutConfig.js').PanelItem[]} An array of PanelItem objects.
     */
    generateOnlinePlayerItems: (player, dependencies) => {
        const { playerDataManager } = dependencies;
        const items = [];
        const onlinePlayers = world.getAllPlayers();

        if (onlinePlayers.length === 0) {
            // Handled by showPanel's generic "no items" message if this is the only generator
            // or if static items are also empty.
            // Alternatively, could return a single disabled button saying "No players online".
        }

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
                sortId: 10 + index, // Ensure refresh button (sortId 1) is above
                text: buttonText,
                icon: 'textures/ui/icon_multiplayer', // Default player icon
                requiredPermLevel: 1, // Changed perm from 2 to 1
                actionType: 'openPanel',
                actionValue: 'playerActionsPanel',
                initialContext: {
                    targetPlayerId: p.id,
                    targetPlayerName: p.name,
                    isTargetFrozen: isPlayerFrozen,
                    // Any other context from onlinePlayersPanel itself (via 'context' param)
                    // will be passed if actionContextVars is omitted or if it's explicitly included.
                    // For opening playerActionsPanel, we mainly need to set the target.
                },
                // actionContextVars: [] // No specific vars from onlinePlayersPanel context needed for playerActionsPanel
            });
        });
        return items;
    },
    /**
 * Generates panel items for each watched online player.
 * @param {import('@minecraft/server').Player} player The admin player viewing the panel.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @returns {import('./panelLayoutConfig.js').PanelItem[]} An array of PanelItem objects.
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
                    sortId: 10 + index, // Ensure refresh button (sortId 1) is above
                    text: buttonText,
                    icon: 'textures/ui/spyglass_flat_color', // Watched player icon
                    requiredPermLevel: 1, // Matches old command perm
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
 * Displays a form to reset all flags for a player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The context from the calling panel.
 */
async function showResetFlagsFormImpl(player, dependencies, context) {
    const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    const modalForm = new ModalFormData().title('§l§eReset Player Flags§r').textField('Player Name to Reset Flags For:', 'Enter exact player name').toggle('§cConfirm Resetting All Flags', false);
    try {
        const response = await modalForm.show(player);
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (response.canceled) {
            player.sendMessage('§7Flag reset action cancelled.');
        } else {
            const targetPlayerName = response.formValues[0];
            const confirmedReset = response.formValues[1]; // Renamed for clarity from 'confirmed'
            if (!targetPlayerName || targetPlayerName.trim() === '') {
                player.sendMessage(getString('common.error.nameEmpty'));
                await showResetFlagsFormImpl(player, dependencies, context); return;
            }
            if (!confirmedReset) {
                player.sendMessage('§eFlag reset not confirmed. Action cancelled.');
            } else {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName.trim()], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            }
        }
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'playerManagementPanel', dependencies, {});
        }
    } catch (error) {
        console.error(`[UiManager.showResetFlagsFormImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showResetFlagsFormImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiResetFlagsForm', context: 'uiManager.showResetFlagsFormImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(player.id) || { panelId: 'playerManagementPanel', context: {} };
        if (callingPanelStateOnError.panelId) {
            await showPanel(player, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
        } else {
            await showPanel(player, 'playerManagementPanel', dependencies, {});
        }
    }
}

/**
 * Displays a list of editable configuration keys.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 */
async function showConfigCategoriesListImpl(player, dependencies) {
    const { playerUtils, config, getString } = dependencies;
    playerUtils.debugLog(`[UiManager.showConfigCategoriesListImpl] Called by ${player.name}`, player.name, dependencies);
    const form = new ActionFormData().title('Edit Configuration Key');

    // Dynamically discovers editable configuration keys from dependencies.config.
    // Editable types: boolean, number, string, and simple arrays of primitives (string, number, boolean).
    // Complex objects and arrays of objects are currently excluded from UI editing.
    const dynamicallyEditableKeys = [];

    for (const key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            const value = config[key];
            let type = typeof value;
            let displayValue = String(value);
            let isEditable = false;

            if (type === 'boolean' || type === 'number' || type === 'string') {
                isEditable = true;
                // Truncate long strings for display
                if (type === 'string' && displayValue.length > CONFIG_UI_MAX_STRING_DISPLAY_LENGTH) {
                    displayValue = `${displayValue.substring(0, CONFIG_UI_TRUNCATE_KEEP_LENGTH) }...`;
                }
            } else if (Array.isArray(value)) {
                // Check if it's a simple array (all elements are primitives)
                const isSimpleArray = value.every(el => typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean');
                if (isSimpleArray) {
                    isEditable = true;
                    type = 'arrayString'; // Special type for our form handler
                    displayValue = JSON.stringify(value);
                    if (displayValue.length > CONFIG_UI_MAX_STRING_DISPLAY_LENGTH) {
                        displayValue = `${displayValue.substring(0, CONFIG_UI_TRUNCATE_KEEP_LENGTH) }...`;
                    }
                } else {
                    type = 'arrayComplex'; // Not editable via simple form
                    displayValue = '[Complex Array]';
                }
            } else if (type === 'object' && value !== null) {
                type = 'objectComplex'; // Not editable
                displayValue = '[Complex Object]';
            } else if (value === null) {
                type = 'nullValue'; // Not editable
                displayValue = '[Null]';
            }

            if (isEditable) {
                dynamicallyEditableKeys.push({
                    keyName: key,
                    description: key, // Use keyName as description for now
                    type, // 'boolean', 'number', 'string', 'arrayString'
                    currentValue: value, // Pass the original value for editing
                });
                form.button(`${key} (${type})\n§7Current: §f${displayValue}`);
            } else {
                // Optionally, list non-editable keys as disabled or just omit them
                // Omitting for cleaner UI for now.
                // playerUtils.debugLog(`Config key "${key}" of type "${typeString}" is not UI-editable.`, player.nameTag, dependencies);
            }
        }
    }

    if (dynamicallyEditableKeys.length === 0) {
        form.body('No editable configuration keys found or all are complex types not supported by this editor.');
    }

    const callingPanelState = getCurrentTopOfNavStack(player.id);
    form.button(getString('common.button.back'), 'textures/ui/undo');
    const backButtonIndex = dynamicallyEditableKeys.length; // Index of the back button

    try {
        const response = await form.show(player);
        if (response.canceled || response.selection === undefined) {
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            } else {
                await showPanel(player, 'configEditingRootPanel', dependencies, {});
            } // Fallback
            return;
        }
        if (response.selection === backButtonIndex) {
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            } else {
                await showPanel(player, 'configEditingRootPanel', dependencies, {});
            } // Fallback
            return;
        }

        const selectedKeyConfig = dynamicallyEditableKeys[response.selection];
        if (selectedKeyConfig) {
            // Note: selectedKeyConfig.currentValue holds the actual value (e.g. boolean, number, actual array)
            // showEditSingleConfigValueFormImpl will handle stringifying arrays for its text field if type is 'arrayString'
            const editFormContext = {
                keyName: selectedKeyConfig.keyName,
                keyType: selectedKeyConfig.type,
                currentValue: selectedKeyConfig.currentValue, // Pass the original value
                parentPanelForEdit: callingPanelState ? callingPanelState.panelId : 'configEditingRootPanel',
                parentContextForEdit: callingPanelState ? callingPanelState.context : {},
            };
            await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, editFormContext);
        }
    } catch (e) {
        console.error(`[UiManager.showConfigCategoriesListImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        if (callingPanelState && callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'configEditingRootPanel', dependencies, {});
        }
    }
}

/**
 * Displays a form to edit a single configuration value.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with config key details.
 */
async function showEditSingleConfigValueFormImpl(player, dependencies, context) {
    const { playerUtils, config, getString, logManager } = dependencies;
    const { keyName, keyType, parentPanelForEdit, parentContextForEdit } = context; // currentValue is the actual value from config
    playerUtils.debugLog(`[UiManager.showEditSingleConfigValueFormImpl] Editing ${keyName} (type: ${keyType}) for ${player.name}`, player.name, dependencies);

    // keyType can be 'boolean', 'number', 'string', or 'arrayString'.
    // For 'arrayString', currentValue is the actual array, and it's edited as a JSON string.
    if (!keyName || typeof keyType === 'undefined') {
        player.sendMessage('§cConfiguration key details missing for edit form.');
        if (parentPanelForEdit) {
            await showPanel(player, parentPanelForEdit, dependencies, parentContextForEdit);
        }
        return;
    }
    const modal = new ModalFormData().title(`Edit: ${keyName} (${keyType})`);
    const originalValue = config[keyName]; // This is the live value from config, which is what we want to compare against.
    // context.currentValue is what was displayed on the list, which is also the original value.
    switch (keyType) {
    case 'boolean':
        modal.toggle(`New value for ${keyName}:`, typeof context.currentValue === 'boolean' ? context.currentValue : false);
        break;
    case 'number':
        modal.textField(`New value for ${keyName} (number):`, String(context.currentValue ?? '0'));
        break;
    case 'string':
        modal.textField(`New value for ${keyName} (string):`, String(context.currentValue ?? ''));
        break;
    case 'arrayString': // Represents a simple array to be edited as a JSON string
        modal.textField(`New value for ${keyName} (JSON array string, e.g., ["a","b",1]):`, JSON.stringify(context.currentValue ?? []));
        break;
    default:
        player.sendMessage(`§cError: Unsupported config type "${keyType}" for UI editing of key "${keyName}".`);
        if (parentPanelForEdit) {
            await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
        }
        return;
    }
    try {
        const response = await modal.show(player);
        if (response.canceled) {
            await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit); return;
        }
        const newValue = response.formValues[0];
        let updateSuccess = false;
        switch (keyType) {
        case 'boolean': config[keyName] = !!newValue; updateSuccess = true; break;
        case 'number': {
            const numVal = parseFloat(newValue);
            if (!isNaN(numVal)) {
                config[keyName] = numVal;
                updateSuccess = true;
                player.sendMessage(`§aConfig "${keyName}" updated to: ${config[keyName]}`);
                logManager?.addLog({ adminName: player.name, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
                await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit); // Return to list on success
            } else {
                player.sendMessage('§cError: Invalid number entered. Please try again.');
                // Re-show the same edit form instead of going back to the list.
                // The current context already contains keyName, keyType, parentPanelForEdit, etc.
                // We need to ensure 'currentValue' in context reflects the *original* value for placeholder, not the bad input.
                // The 'context' object was passed in and shouldn't have been mutated by the bad input.
                await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, context);
                return; // Important to prevent falling through to showConfigCategoriesList
            }
            break;
        }
        case 'string':
            config[keyName] = String(newValue);
            updateSuccess = true;
            // For strings, success message and navigation handled below to keep it DRY
            break;
        case 'arrayString':
            try {
                const parsedArray = JSON.parse(newValue);
                if (Array.isArray(parsedArray) && parsedArray.every(el => typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean')) {
                    config[keyName] = parsedArray;
                    updateSuccess = true;
                } else {
                    player.sendMessage('§cError: Invalid input. Value must be a valid JSON array of strings, numbers, or booleans (e.g., ["a", "b", 123, true]). Please try again.');
                    await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, context); // Re-prompt
                    return;
                }
            } catch (parseError) {
                player.sendMessage(`§cError: Invalid JSON format for array: ${parseError.message}. Please try again.`);
                await UI_ACTION_FUNCTIONS.showEditSingleConfigValueForm(player, dependencies, context); // Re-prompt
                return;
            }
            break;
        }

        if (updateSuccess) { // Common success handling for boolean, string, arrayString
            player.sendMessage(`§aSuccess: Config "${keyName}" updated to: ${JSON.stringify(config[keyName])}`);
            logManager?.addLog({ adminName: player.name, actionType: 'configValueUpdated', details: { key: keyName, oldValue: originalValue, newValue: config[keyName] } }, dependencies);
            await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit); // Return to list on success
        }
        // Note: 'number' type handles its own success message and navigation due to the re-prompt logic on failure.
        // if (updateSuccess) { ... } // This block is now conditional per type
    } catch (e) {
        console.error(`[UiManager.showEditSingleConfigValueFormImpl] Error: ${e.stack || e}`);
        player.sendMessage(getString('common.error.genericForm'));
        // On error, attempt to return to the list view, as re-showing the edit form might repeat the error.
        await UI_ACTION_FUNCTIONS.showConfigCategoriesList(player, dependencies, parentContextForEdit);
    }
}

/**
 * Displays a generic confirmation modal.
 * @param {import('@minecraft/server').Player} adminPlayer The player to show the modal to.
 * @param {string} titleString The title of the modal.
 * @param {string} bodyString The body text of the modal.
 * @param {string} confirmToggleLabelString The label for the confirmation toggle.
 * @param {Function} onConfirmCallback Async function to execute on confirmation.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} [bodyParams] Optional parameters for the bodyString.
 * @returns {Promise<boolean>} True if confirmed, false otherwise.
 */
async function _showConfirmationModal(adminPlayer, titleString, bodyString, confirmToggleLabelString, onConfirmCallback, dependencies, bodyParams = {}) {
    const { playerUtils, logManager, getString } = dependencies;
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
        if (response.canceled || !response.formValues?.[0]) { // response.formValues[0] is the 'confirmed' toggle
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
        logManager?.addLog({ actionType: 'errorUiConfirmationModal', context: 'uiManager._showConfirmationModal', adminName: playerName, details: { titleString, errorMessage: error.message, stack: error.stack } }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
        return false;
    }
}

/**
 * Confirms and clears the global chat.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 */
async function confirmClearChatImpl(player, dependencies) {
    const { playerUtils, getString, commandExecutionMap } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.confirmClearChatImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    await _showConfirmationModal(player, '§l§cConfirm Clear Chat§r', 'Are you sure you want to clear the global chat for all players?', '§cConfirm Clear Chat', async () => {
        const clearChatCommand = commandExecutionMap?.get('clearchat');
        if (clearChatCommand) {
            await clearChatCommand(player, [], dependencies);
        } else {
            player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'clearchat' }));
        }
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if (callingPanelState.panelId) {
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    } else {
        await showPanel(player, 'serverManagementPanel', dependencies, {});
    }
}

/**
 * Confirms and performs a lag clear operation.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 */
async function confirmLagClearImpl(player, dependencies) {
    const { playerUtils, commandExecutionMap } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.confirmLagClearImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    await _showConfirmationModal(player, '§l§cConfirm Lag Clear§r', 'Are you sure you want to clear all ground items and non-player/non-persistent entities? This may cause lag temporarily.', '§cConfirm Lag Clear', async () => {
        const lagClearCommand = commandExecutionMap?.get('lagclear');
        if (lagClearCommand) {
            await lagClearCommand(player, [], dependencies);
        } else {
            player.sendMessage('§eNo \'lagclear\' command configured. Performing basic item clear as fallback.');
            try {
                await player.runCommandAsync('kill @e[type=item]');
                player.sendMessage('§aSuccess: Ground items cleared.');
            } catch (e) {
                player.sendMessage('§cError: Basic item clear command failed. See console for details.');
                console.error(`[UiManager.confirmLagClearImpl] Basic item clear failed: ${ e.stack || e}`);
            }
        }
    }, dependencies);
    const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
    if (callingPanelState.panelId) {
        await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
    } else {
        await showPanel(player, 'serverManagementPanel', dependencies, {});
    }
}

/**
 * Displays a modal form showing all action logs.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 */
async function displayActionLogsModalImpl(player, dependencies) {
    const { playerUtils, logManager, getString } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.displayActionLogsModalImpl] Requested by ${adminPlayerName}`, adminPlayerName, dependencies);
    let logText = '§g--- All Action Logs ---\n§r';
    const logs = logManager.getLogs ? logManager.getLogs() : [];
    if (!logs || logs.length === 0) {
        logText += 'No action logs found.';
    } else {
        const maxLogsToShow = 50;
        const startIndex = Math.max(0, logs.length - maxLogsToShow);
        for (let i = startIndex; i < logs.length; i++) {
            const log = logs[i]; if (!log) {
                continue;
            }
            const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
            let entry = `§7[${timestamp}] §e${log.actor || 'System'} §f${log.actionType || 'unknownAction'}`;
            if (log.targetName) {
                entry += ` §b-> ${log.targetName}`;
            }
            let detailsString = '';
            if (log.details) {
                if (typeof log.details === 'string') {
                    detailsString = log.details;
                } else if (typeof log.details === 'object') {
                    const detailParts = [];
                    if (log.details.reason) {
                        detailParts.push(`Reason: ${log.details.reason}`);
                    }
                    if (log.details.durationDisplay) {
                        detailParts.push(`Duration: ${log.details.durationDisplay}`);
                    }
                    for (const key in log.details) {
                        if (key !== 'reason' && key !== 'durationDisplay' && !['rawErrorStack', 'stack', 'errorCode', 'message'].includes(key) && Object.prototype.hasOwnProperty.call(log.details, key)) {
                            detailParts.push(`${key}: ${log.details[key]}`);
                        }
                    }
                    detailsString = detailParts.join(', ');
                }
            }
            if (detailsString) {
                entry += ` §7(${detailsString})§r`;
            }
            logText += `${entry }\n`;
        }
        if (logs.length > maxLogsToShow) {
            logText += `\n§o(Showing latest ${maxLogsToShow} of ${logs.length} entries. More may exist.)§r`;
        }
    }
    const modal = new ModalFormData().title('§l§3Action Logs (All)§r').content(logText.trim());
    modal.button1(getString('common.button.ok'));
    try {
        await modal.show(player);
    } catch (error) {
        console.error(`[UiManager.displayActionLogsModalImpl] Error for ${adminPlayerName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.displayActionLogsModalImpl] Error: ${error.message}`, adminPlayerName, dependencies);
        logManager?.addLog({ actionType: 'errorUiActionLogsModal', context: 'uiManager.displayActionLogsModalImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));
    } finally {
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'serverManagementPanel', dependencies, {});
        }
    }
}

/**
 * Shows a form to filter logs by player name.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
 */
async function showModLogFilterModalImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager, config } = dependencies;
    const adminPlayerName = player.name;
    playerUtils?.debugLog(`[UiManager.showModLogFilterModalImpl] Requested by ${adminPlayerName}, current context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);
    const modal = new ModalFormData().title(getString('ui.modLogSelect.filterModal.title')).textField(getString('ui.modLogSelect.filterModal.textField.label'), getString('ui.modLogSelect.filterModal.textField.placeholder'), context.playerNameFilter || '');
    try {
        const response = await modal.show(player);
        if (response.canceled) {
            const callingPanelState = getCurrentTopOfNavStack(player.id);
            if (callingPanelState && callingPanelState.panelId) {
                await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
            } else {
                await showPanel(player, 'modLogSelectionPanel', dependencies, {});
            }
            return;
        }
        const [playerNameInput] = response.formValues;
        const newPlayerNameFilter = playerNameInput?.trim() || null;

        if (newPlayerNameFilter) {
            player.sendMessage(getString('ui.modLogSelect.filterModal.filterSet', { filterName: newPlayerNameFilter }));
        } else if (playerNameInput && !newPlayerNameFilter) { // Input was whitespace
            player.sendMessage(getString('ui.modLogSelect.filterModal.filterBlank'));
        } else {
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
        logManager?.addLog({ actionType: 'errorUiModLogFilterModal', context: 'uiManager.showModLogFilterModalImpl', adminName: adminPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
        player.sendMessage(getString('common.error.genericForm'));

        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'modLogSelectionPanel', context: {} };
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'modLogSelectionPanel', dependencies, {});
        }
    }
}

/**
 * Displays a specific page of logs in a modal form.
 * @param {import('@minecraft/server').Player} player The player viewing the logs.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with log filtering and pagination details.
 */
async function displaySpecificLogsPageImpl(player, dependencies, context) {
    const { playerUtils, getString, logManager, config } = dependencies;
    const adminPlayerName = player.name;
    playerUtils.debugLog(`[UiManager.displaySpecificLogsPageImpl] For ${adminPlayerName}, Context: ${JSON.stringify(context)}`, adminPlayerName, dependencies);

    const {
        logTypeFilter = [],
        logTypeName = getString('ui.logViewer.title.default', { ประเภท: 'Selected' }), // Default title part
        playerNameFilter = null,
        currentPage = 1,
        // totalPages is expected to be in context, calculated by showPanel or prepareXLogViewer
    } = context;


    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const filteredLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, playerNameFilter) : [];
    const totalLogs = filteredLogs.length;
    // totalPages should ideally be passed in context, but recalculate if missing for robustness
    const effectiveTotalPages = (context.totalPages ?? Math.ceil(totalLogs / logsPerPage)) || 1;

    let title = '';
    if (playerNameFilter) {
        title = getString('ui.logViewer.title.filteredPaged', { logTypeName, filterName: playerNameFilter, currentPage, totalPages: effectiveTotalPages });
    } else {
        title = getString('ui.logViewer.title.unfilteredPaged', { logTypeName, currentPage, totalPages: effectiveTotalPages });
    }

    let messageBody = '';

    if (totalLogs === 0) {
        messageBody = getString('ui.logViewer.noLogs');
    } else {
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, totalLogs);

        if (currentPage < 1 || currentPage > effectiveTotalPages && effectiveTotalPages > 0) { // Check against effectiveTotalPages
            messageBody = getString('ui.logViewer.invalidPage', { maxPages: effectiveTotalPages });
        } else {
            for (let i = startIndex; i < endIndex; i++) {
                if (i >= totalLogs) {
                    break;
                }
                const log = filteredLogs[i]; if (!log) {
                    continue;
                }

                const timestamp = new Date(log.timestamp || Date.now()).toLocaleString();
                const entry = getString('ui.actionLogs.logEntry', {
                    timestamp,
                    actor: log.actor || getString('common.value.unknown'),
                    actionType: log.actionType || getString('common.value.unknown'),
                    target: log.targetName ? ` -> ${log.targetName}` : '',
                    duration: log.details?.durationDisplay ? getString('ui.actionLogs.logEntry.duration', { duration: log.details.durationDisplay }) : '',
                    reason: log.details?.reason ? getString('ui.actionLogs.logEntry.reason', { reason: log.details.reason }) : '',
                    details: '', // Simplified for this view, main details are actor/action/target/reason/duration
                });
                messageBody += `${entry }\n`;
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
            details: { errorMessage: error.message, stack: error.stack, currentContext: context },
        }, dependencies);
    } finally {
        // Always return to the logViewerPanel, passing the most up-to-date context
        // which includes currentPage and the externally calculated totalPages.
        await showPanel(player, 'logViewerPanel', dependencies, { ...context, totalPages: effectiveTotalPages });
    }
}

/**
 * Displays a panel based on its definition.
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {string} panelId The ID of the panel to display.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} [currentContext] Optional context object for the panel.
 */
async function showPanel(player, panelId, dependencies, currentContext = {}) {
    const { playerUtils, logManager, getString, rankManager, config } = dependencies;
    const viewingPlayerName = player.name;

    playerUtils?.debugLog(`[UiManager.showPanel] Player: ${viewingPlayerName}, PanelID: ${panelId}, Context: ${JSON.stringify(currentContext)}`, viewingPlayerName, dependencies);

    const effectiveContext = { ...currentContext };

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

        if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
            await showPanel(player, 'errorDisplayPanel', dependencies, {
                errorMessage: `Panel definition for "${panelId}" is missing. Please report this.`,
                originalPanelId: panelId,
                originalContext: effectiveContext,
                previousPanelIdOnError: null,
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

    let allPanelItems = [...(panelDefinition.items || [])]; // Start with static items

    // Check for and execute dynamic item generator
    if (panelDefinition.dynamicItemGeneratorKey) {
        const generatorFunction = UI_DYNAMIC_ITEM_GENERATORS[panelDefinition.dynamicItemGeneratorKey];
        if (generatorFunction && typeof generatorFunction === 'function') {
            try {
                const dynamicItems = generatorFunction(player, dependencies, effectiveContext);
                if (Array.isArray(dynamicItems)) {
                    allPanelItems = allPanelItems.concat(dynamicItems);
                } else {
                    console.warn(`[UiManager.showPanel] Dynamic item generator "${panelDefinition.dynamicItemGeneratorKey}" for panel "${panelId}" did not return an array.`);
                    logManager?.addLog({
                        actionType: 'warningUiDynamicGeneratorInvalidReturn',
                        context: 'uiManager.showPanel',
                        adminName: viewingPlayerName,
                        details: { panelId, generatorKey: panelDefinition.dynamicItemGeneratorKey, panelTitle },
                    }, dependencies);
                    // Treat as a critical error for this panel's display
                    if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
                        await showPanel(player, 'errorDisplayPanel', dependencies, {
                            errorMessage: `Panel "${panelTitle}" (${panelId}) failed to generate content: generator did not return an array.`,
                            originalPanelId: panelId, originalContext: effectiveContext,
                            previousPanelIdOnError: getCurrentTopOfNavStack(player.id)?.panelId,
                            previousContextOnError: getCurrentTopOfNavStack(player.id)?.context,
                        });
                        return; // Stop further processing of this broken panel
                    }
                }
            } catch (genError) {
                console.error(`[UiManager.showPanel] Error in dynamic item generator "${panelDefinition.dynamicItemGeneratorKey}" for panel "${panelId}": ${genError.stack || genError}`);
                logManager?.addLog({
                    actionType: 'errorUiDynamicGenerator',
                    context: 'uiManager.showPanel',
                    adminName: viewingPlayerName,
                    details: { panelId, generatorKey: panelDefinition.dynamicItemGeneratorKey, errorMessage: genError.message, stack: genError.stack },
                }, dependencies);
                if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
                    await showPanel(player, 'errorDisplayPanel', dependencies, {
                        errorMessage: `Panel "${panelTitle}" (${panelId}) failed to generate content due to an internal error in its generator: ${genError.message}.`,
                        originalPanelId: panelId, originalContext: effectiveContext,
                        previousPanelIdOnError: getCurrentTopOfNavStack(player.id)?.panelId,
                        previousContextOnError: getCurrentTopOfNavStack(player.id)?.context,
                    });
                    return;
                }
            }
        } else { // Generator function itself not found
            console.warn(`[UiManager.showPanel] Dynamic item generator key "${panelDefinition.dynamicItemGeneratorKey}" for panel "${panelId}" not found in UI_DYNAMIC_ITEM_GENERATORS.`);
            logManager?.addLog({
                actionType: 'warningUiDynamicGeneratorNotFound', // Could be upgraded to error type
                context: 'uiManager.showPanel',
                adminName: viewingPlayerName,
                details: { panelId, generatorKey: panelDefinition.dynamicItemGeneratorKey, panelTitle },
            }, dependencies);
            if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
                await showPanel(player, 'errorDisplayPanel', dependencies, {
                    errorMessage: `Panel "${panelTitle}" (${panelId}) is misconfigured: content generator "${panelDefinition.dynamicItemGeneratorKey}" not found.`,
                    originalPanelId: panelId, originalContext: effectiveContext,
                    previousPanelIdOnError: getCurrentTopOfNavStack(player.id)?.panelId,
                    previousContextOnError: getCurrentTopOfNavStack(player.id)?.context,
                });
                return;
            }
        }
    }

    const permittedItems = allPanelItems
        .filter(item => {
            if (!item) {
                return false;
            } // Handle potential undefined items if generator had issues
            if (panelId === 'logViewerPanel') {
                if (item.id === 'prevLogPage' && effectiveContext.currentPage <= 1) {
                    return false;
                }
                if (item.id === 'nextLogPage' && effectiveContext.currentPage >= effectiveContext.totalPages) {
                    return false;
                }
            }
            return userPermLevel <= item.requiredPermLevel;
        })
        .sort((a, b) => a.sortId - b.sortId);

    permittedItems.forEach(item => {
        let effectiveText = item.text;
        let effectiveIcon = item.icon;

        // Process textVariants
        if (item.textVariants && Array.isArray(item.textVariants)) {
            for (const variant of item.textVariants) {
                if (variant && effectiveContext[variant.contextKey] === variant.contextValue) {
                    effectiveText = variant.text;
                    break; // First match wins
                }
            }
        }

        // Process iconVariants
        if (item.iconVariants && Array.isArray(item.iconVariants)) {
            for (const variant of item.iconVariants) {
                if (variant && effectiveContext[variant.contextKey] === variant.contextValue) {
                    effectiveIcon = variant.icon;
                    break; // First match wins
                }
            }
        }

        // Interpolate placeholders in the chosen text
        if (panelId === 'logViewerPanel') {
            effectiveText = effectiveText.replace(/{currentPage}/g, String(effectiveContext.currentPage ?? 1));
            effectiveText = effectiveText.replace(/{totalPages}/g, String(effectiveContext.totalPages ?? 1));
        }
        for (const key in effectiveContext) {
            if (Object.prototype.hasOwnProperty.call(effectiveContext, key) && !['currentPage', 'totalPages'].includes(key)) {
                const replacementValue = String(effectiveContext[key]);
                if (typeof effectiveText === 'string') { // Ensure effectiveText is a string before replacing
                    effectiveText = effectiveText.replace(new RegExp(`{${key}}`, 'g'), replacementValue);
                }
            }
        }
        form.button(effectiveText, effectiveIcon);
    });

    let atRootLevel = isNavStackAtRoot(player.id) || !panelDefinition.parentPanelId;
    if (panelId === 'errorDisplayPanel') {
        const stack = playerNavigationStacks.get(player.id) || [];
        atRootLevel = stack.length <= 1;
    }
    const backExitButtonText = atRootLevel ? getString('common.button.close') : getString('common.button.back');
    const backExitButtonIcon = atRootLevel ? 'textures/ui/cancel' : 'textures/ui/undo';
    // Condition for adding a back/exit button.
    // It's added if it's an error panel, or if there are items to show, or if the panel is defined to have no static items (implying it's dynamic or just a message panel).
    const shouldAddBackExitButton = (panelId === 'errorDisplayPanel' || permittedItems.length > 0 || panelDefinition.items.length === 0);
    if (shouldAddBackExitButton) {
        form.button(backExitButtonText, backExitButtonIcon);
    }
    const backExitButtonIndex = permittedItems.length;

    if (panelId === 'errorDisplayPanel' && effectiveContext.errorMessage) {
        form.body(String(effectiveContext.errorMessage));
    } else if (permittedItems.length === 0 && panelDefinition.items.length > 0) {
        form.body(getString('ui.common.noPermissionForPanelItems'));
    } else if (panelId !== 'logViewerPanel' && permittedItems.length === 0) {
        // If there are no permitted items (other than potential back/exit)
        // and it's not a log viewer panel (which has its own empty state handling),
        // then display "No options available".
        // This assumes that if permittedItems is empty, no meaningful actions can be taken from this panel
        // beyond using the "Back" or "Close" button (which is added separately).
        form.body(getString('ui.common.noOptionsAvailable'));
    }

    try {
        playerUtils?.playSoundForEvent(player, 'uiFormOpen', dependencies);
        const response = await form.show(player);

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId} cancelled by ${viewingPlayerName}. Reason: ${response.cancelationReason}`, viewingPlayerName, dependencies);
            if (atRootLevel) {
                clearPlayerNavStack(player.id);
            }
            return;
        }
        const selection = response.selection;
        if (typeof selection === 'undefined') {
            return;
        }

        if (selection < permittedItems.length) {
            const selectedItemConfig = permittedItems[selection];
            playerUtils?.debugLog(`[UiManager.showPanel] Panel ${panelId}, Player ${viewingPlayerName} selected item: ${selectedItemConfig.id}`, viewingPlayerName, dependencies);
            if (selectedItemConfig.actionType === 'openPanel') {
                let baseForNextPanel = {};
                if (selectedItemConfig.actionContextVars && selectedItemConfig.actionContextVars.length > 0) {
                    // If actionContextVars are specified, only pass those specific variables from effectiveContext.
                    selectedItemConfig.actionContextVars.forEach(varName => {
                        if (Object.prototype.hasOwnProperty.call(effectiveContext, varName)) {
                            baseForNextPanel[varName] = effectiveContext[varName];
                        }
                    });
                } else {
                    // If no actionContextVars, pass all of effectiveContext as the base.
                    baseForNextPanel = { ...effectiveContext };
                }

                const nextContext = { ...baseForNextPanel, ...(selectedItemConfig.initialContext || {}) };
                // initialContext properties will override any same-named properties from baseForNextPanel.
                // For example, if baseForNextPanel has { A:1, B:2 } and initialContext has { B:3, C:4 },
                // nextContext will be { A:1, B:3, C:4 }.

                pushToPlayerNavStack(player.id, panelId, effectiveContext);
                await showPanel(player, selectedItemConfig.actionValue, dependencies, nextContext);
            } else if (selectedItemConfig.actionType === 'functionCall') {
                const funcToCall = UI_ACTION_FUNCTIONS[selectedItemConfig.actionValue];
                if (funcToCall && typeof funcToCall === 'function') {
                    const functionContext = { ...effectiveContext, ...(selectedItemConfig.initialContext || {}) };
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
        logManager?.addLog({ actionType: 'errorUiGenericPanelShow', context: `uiManager.showPanel.${panelId}`, adminName: viewingPlayerName, details: { panelId, context: effectiveContext, errorMessage: error.message, stack: error.stack } }, dependencies);
        const navStack = playerNavigationStacks.get(player.id) || [];
        let previousValidPanelState = null;
        if (navStack.length > 0) {
            const topOfStack = navStack[navStack.length - 1];
            if (topOfStack.panelId === panelId) {
                popFromPlayerNavStack(player.id);
                if (navStack.length > 0) {
                    previousValidPanelState = navStack[navStack.length - 1];
                }
            } else {
                previousValidPanelState = topOfStack;
            }
        }
        if (panelId !== 'errorDisplayPanel' && panelDefinitions.errorDisplayPanel) {
            await showPanel(player, 'errorDisplayPanel', dependencies, { errorMessage: `An error occurred while processing panel "${panelId}".\nDetails: ${error.message}`, originalPanelId: panelId, originalContext: effectiveContext, previousPanelIdOnError: previousValidPanelState ? previousValidPanelState.panelId : null, previousContextOnError: previousValidPanelState ? previousValidPanelState.context : {} });
        } else {
            player.sendMessage(getString('common.error.criticalUiError'));
            clearPlayerNavStack(player.id);
        }
    }
}

/**
 * Prepares and shows the Ban/Unban logs viewer.
 * @param {import('@minecraft/server').Player} player The player initiating the view.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context from the calling panel.
 */
async function prepareBanUnbanLogsViewer(player, dependencies, context) {
    const { logManager, config, getString } = dependencies; // Added getString

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['playerBanned', 'playerUnbanned']; // Corrected actionTypes
    const logTypeName = getString('ui.logViewer.title.banUnban'); // Used getString
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : []; // No player name filter initially
    const totalPages = Math.ceil(allLogs.length / logsPerPage) || 1;

    const newContext = {
        ...context, // Preserve any incoming context if needed, though usually not for fresh log views
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
 * Prepares and shows the Mute/Unmute logs viewer.
 * @param {import('@minecraft/server').Player} player The player initiating the view.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context from the calling panel.
 */
async function prepareMuteUnmuteLogsViewer(player, dependencies, context) {
    const { logManager, config, getString } = dependencies; // Added getString

    const logsPerPage = config?.ui?.logsPerPage ?? 5;
    const logTypeFilter = ['playerMuted', 'playerUnmuted']; // Corrected actionTypes
    const logTypeName = getString('ui.logViewer.title.muteUnmute'); // Used getString
    const allLogs = logManager.getLogs ? logManager.getLogs(logTypeFilter, null) : []; // No player name filter initially
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


const UI_ACTION_FUNCTIONS = {
    /**
 * Displays a modal with the player's stats.
     * @param {import('@minecraft/server').Player} player The player viewing their stats.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The context from the calling panel.
     */
    showMyStatsPageContent: async (player, dependencies, context) => {
        const { playerUtils, playerDataManager, getString } = dependencies;
        playerUtils.debugLog(`Action: showMyStatsPageContent for ${player.name}`, player.name, dependencies);
        const pData = playerDataManager.getPlayerData(player.id);
        const totalFlags = pData?.flags?.totalFlags ?? 0;
        let bodyText = totalFlags === 0 ? 'You currently have no flags!' : `You have ${totalFlags} flags.`;
        const location = player.location;
        const dimensionName = playerUtils.formatDimensionName(player.dimension.id);
        bodyText += `\nLocation: X: ${Math.floor(location.x)}, Y: ${Math.floor(location.y)}, Z: ${Math.floor(location.z)} in ${dimensionName}`;
        const modal = new ModalFormData().title('§l§bYour Stats§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            playerUtils.debugLog(`Error showing MyStats modal: ${e}`, player.nameTag, dependencies);
            player.sendMessage(getString('common.error.genericForm') || '§cError: Could not display stats.');
            // Log error if necessary with logManager
        } finally {
            // Return to the panel that called this function.
            // The 'context' here is the context of 'myStatsPanel'.
            // 'myStatsPanel' is the panel that has the button calling 'showMyStatsPageContent'.
            await showPanel(player, 'myStatsPanel', dependencies, context);
        }
    },
    /**
     * Displays a modal with the server rules.
 * @param {import('@minecraft/server').Player} player The player viewing the rules.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The context from the calling panel.
     */
    showServerRulesPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showServerRulesPageContent for ${player.name}`, player.name, dependencies);
        const serverRules = config?.serverRules ?? [];
        const bodyText = serverRules.length === 0 ? 'No server rules have been defined by the admin yet.' : serverRules.join('\n');
        const modal = new ModalFormData().title('§l§eServer Rules§r').content(bodyText);
        modal.button1(getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            playerUtils.debugLog(`Error showing ServerRules modal: ${e}`, player.nameTag, dependencies);
            player.sendMessage(getString('common.error.genericForm') || '§cError: Could not display server rules.');
        } finally {
            // Return to the panel that called this function.
            await showPanel(player, 'serverRulesPanel', dependencies, context);
        }
    },
    showHelpfulLinksPageContent: async (player, dependencies) => {
        const { playerUtils } = dependencies;
        playerUtils.debugLog(`Action: showHelpfulLinksPageContent for ${player.name}`, player.name, dependencies);
        playerUtils.debugLog(`DEPRECATED Action: showHelpfulLinksPageContent for ${player.nameTag}`, player.nameTag, dependencies);
        player.sendMessage('This way of showing links is outdated.');
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'mainUserPanel', context: {} };
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'mainUserPanel', dependencies, {});
        }
    },
    /**
     * Displays a clickable link in the player's chat.
     * @param {import('@minecraft/server').Player} player The player to send the link to.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with link details.
     */
    displayLinkInChat: async (player, dependencies, context) => {
        const { playerUtils, getString } = dependencies;
        const { linkUrl, linkTitle, originalPanelIdForDisplayLink, originalContextForDisplayLink } = context;

        playerUtils.debugLog(`Action: displayLinkInChat for ${player.name}: ${linkTitle} - ${linkUrl}`, player.name, dependencies);

        if (linkUrl && linkTitle) {
            // Minecraft typically makes full URLs clickable in chat.
            // Using §9 (blue) and §n (underline) for link-like appearance.
            player.sendMessage(`§e${linkTitle}: §9§n${linkUrl}§r`);
            player.sendMessage(getString('ui.helpfulLinks.clickHint') || '§7(You may need to click the link in chat to open it)');
        } else {
            player.sendMessage(getString('common.error.generic') || '§cCould not display link: Information missing.');
        }

        // Return the user to the helpfulLinksPanel
        // Ensure originalPanelIdForDisplayLink and originalContextForDisplayLink were passed in initialContext
        if (originalPanelIdForDisplayLink) {
            // We need to push the current state (which is the helpfulLinksPanel itself, about to be re-shown)
            // onto the stack BEFORE showing it, so 'Back' from it works correctly.
            // However, showPanel itself handles pushing to stack when navigating TO a new panel.
            // When a functionCall completes, it typically returns to the panel it was called FROM.
            // If the functionCall itself calls showPanel, it becomes the new "current" panel.

            // The context for helpfulLinksPanel might need to be the one it had when it was first opened.
            // This is why we passed originalContextForDisplayLink.
            await showPanel(player, originalPanelIdForDisplayLink, dependencies, originalContextForDisplayLink || {});
        } else {
            // Fallback if context wasn't passed correctly, though it should be.
            await showPanel(player, 'helpfulLinksPanel', dependencies, {});
        }
    },
    /**
 * Returns to the calling panel.
     * @param {import('@minecraft/server').Player} player The player interacting with the UI.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with navigation details.
     */
    returnToCallingPanel: async (player, dependencies, context) => {
        const { playerUtils } = dependencies;
        const { originalPanelId, originalContext } = context;

        playerUtils.debugLog(`Action: returnToCallingPanel for ${player.name}. Returning to Panel ID: ${originalPanelId}`, player.name, dependencies);

        if (originalPanelId) {
            // The originalContext should be the context of the panel we are returning to.
            await showPanel(player, originalPanelId, dependencies, originalContext || {});
        } else {
            playerUtils.debugLog('Cannot return to original panel: originalPanelId missing from context.', player.nameTag, dependencies);
            player.sendMessage('§cError: Could not determine panel to return to.');
            // Fallback to a default panel if necessary, though this indicates a setup error.
            // For user panels, mainUserPanel is a safe bet.
            await showPanel(player, 'mainUserPanel', dependencies, {});
        }
    },
    /**
 * Refreshes the `onlinePlayersPanel`.
 * @param {import('@minecraft/server').Player} player The player who clicked refresh.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
     */
    refreshOnlinePlayersPanelAction: async (player, dependencies, context) => {
        const { playerUtils } = dependencies;
        playerUtils.debugLog(`Action: refreshOnlinePlayersPanelAction for ${player.name}`, player.name, dependencies);
        // context here is the context of the onlinePlayersPanel itself.
        // Re-showing the panel will trigger its dynamicItemGeneratorKey again.
        await showPanel(player, 'onlinePlayersPanel', dependencies, context);
    },
    /**
 * Refreshes the `watchedPlayersPanel`.
 * @param {import('@minecraft/server').Player} player The player who clicked refresh.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The current panel context.
     */
    refreshWatchedPlayersPanelAction: async (player, dependencies, context) => {
        const { playerUtils } = dependencies;
        playerUtils.debugLog(`Action: refreshWatchedPlayersPanelAction for ${player.name}`, player.name, dependencies);
        await showPanel(player, 'watchedPlayersPanel', dependencies, context);
    },
    /**
 * Displays a modal with general tips.
 * @param {import('@minecraft/server').Player} player The player viewing the tips.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context The context from the calling panel.
     */
    showGeneralTipsPageContent: async (player, dependencies, context) => {
        const { playerUtils, config, getString } = dependencies;
        playerUtils.debugLog(`Action: showGeneralTipsPageContent for ${player.name}`, player.name, dependencies);
        const generalTips = config?.generalTips ?? [];
        const bodyText = generalTips.length === 0 ? 'No general tips available at the moment.' : generalTips.join('\n\n---\n\n');
        const modal = new ModalFormData().title('General Tips').content(bodyText);
        modal.button1(getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (e) {
            playerUtils.debugLog(`Error showing GeneralTips modal: ${e}`, player.nameTag, dependencies);
        } finally {
            // Return to the panel that called this function.
            await showPanel(player, 'generalTipsPanel', dependencies, context);
        }
    },
    showInspectPlayerForm,
    showResetFlagsForm: showResetFlagsFormImpl,
    /**
 * Displays a modal with system information.
 * @param {import('@minecraft/server').Player} player The player viewing the info.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
     */
    displaySystemInfoModal: async (player, dependencies) => {
        const { playerUtils, config, getString, logManager, playerDataManager, reportManager, system } = dependencies;
        const viewingPlayerName = player.name;
        playerUtils?.debugLog(`[UiManager.displaySystemInfoModal] Requested by ${viewingPlayerName}`, viewingPlayerName, dependencies);
        let infoText = '§g--- System Information ---\n§r';
        infoText += `AntiCheat Version: §e${config.addonVersion}\n`;
        infoText += `Server Time: §e${new Date().toLocaleTimeString()}\n`;
        infoText += `Current Game Tick: §e${system.currentTick}\n`;
        const onlinePlayersInstance = world.getAllPlayers();
        infoText += `Online Players: §e${onlinePlayersInstance.length}\n`;
        if (playerDataManager?.getAllPlayerDataCount) {
            infoText += `Cached PlayerData Entries: §e${playerDataManager.getAllPlayerDataCount()}\n`;
        }
        let watchedCount = 0;
        onlinePlayersInstance.forEach(p => {
            const pData = playerDataManager?.getPlayerData(p.id); if (pData?.isWatched) {
                watchedCount++;
            }
        });
        infoText += `Watched Players (Online): §e${watchedCount}\n`;
        if (playerDataManager?.getPersistentMuteCount) {
            infoText += `Active Mutes (Persistent): §e${playerDataManager.getPersistentMuteCount()}\n`;
        }
        if (playerDataManager?.getPersistentBanCount) {
            infoText += `Active Bans (Persistent): §e${playerDataManager.getPersistentBanCount()}\n`;
        }
        if (dependencies.worldBorderManager?.getActiveBorderCount) {
            infoText += `Active World Borders: §e${dependencies.worldBorderManager.getActiveBorderCount()}\n`;
        }
        if (logManager?.getInMemoryLogCount) {
            infoText += `LogManager Entries (In-Memory): §e${logManager.getInMemoryLogCount()}\n`;
        }
        if (reportManager?.getInMemoryReportCount) {
            infoText += `ReportManager Entries (In-Memory): §e${reportManager.getInMemoryReportCount()}\n`;
        }
        const modal = new ModalFormData().title('§l§bSystem Information§r').content(infoText);
        modal.button1(getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (error) {
            console.error(`[UiManager.displaySystemInfoModal] Error for ${viewingPlayerName}: ${error.stack || error}`);
            logManager?.addLog({ actionType: 'errorUiSystemInfoModal', context: 'uiManager.displaySystemInfoModal', adminName: viewingPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
            player.sendMessage(getString('common.error.genericForm'));
        }
        const callingPanelState = getCurrentTopOfNavStack(player.id) || { panelId: 'serverManagementPanel', context: {} };
        if (callingPanelState.panelId) {
            await showPanel(player, callingPanelState.panelId, dependencies, callingPanelState.context);
        } else {
            await showPanel(player, 'serverManagementPanel', dependencies, {});
        }
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
     * Displays a modal with detailed flag information for a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    displayDetailedFlagsModal: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, playerDataManager } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerId, targetPlayerName } = context;
        if (!targetPlayerName) {
            player.sendMessage('§cTarget player not specified for viewing flags.'); await showPanel(player, 'playerActionsPanel', dependencies, context); return;
        }
        playerUtils?.debugLog(`[UiManager.displayDetailedFlagsModal] Admin: ${adminPlayerName} viewing flags for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const targetPData = playerDataManager.getPlayerData(targetPlayerId || targetPlayerName);
        let bodyText = `§g--- Flags for ${targetPlayerName} ---\n§rTotal Flags: ${targetPData?.flags?.totalFlags ?? 0}\n\n`;
        if (!targetPData || !targetPData.flags || targetPData.flags.totalFlags === 0) {
            bodyText += 'No flags recorded for this player.';
        } else {
            let specificFlagsFound = false;
            for (const flagKey in targetPData.flags) {
                if (flagKey === 'totalFlags' || flagKey === 'lastFlagTime' || flagKey === 'lastFlagType') {
                    continue;
                }
                const flagInfo = targetPData.flags[flagKey];
                if (flagInfo && typeof flagInfo.count === 'number' && flagInfo.count > 0) {
                    const lastTime = flagInfo.lastDetectionTime ? new Date(flagInfo.lastDetectionTime).toLocaleString() : 'N/A';
                    bodyText += `§e${flagKey}: §f${flagInfo.count} §7(Last: ${lastTime})§r\n`;
                    specificFlagsFound = true;
                }
            }
            if (!specificFlagsFound) {
                bodyText += 'No specific active flags with counts > 0.';
            }
        }
        const modal = new ModalFormData().title(`§l§3Flags: ${targetPlayerName}§r`).content(bodyText.trim());
        modal.button1(getString('common.button.ok'));
        try {
            await modal.show(player);
        } catch (error) {
            console.error(`[UiManager.displayDetailedFlagsModal] Error for ${adminPlayerName} viewing flags of ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.displayDetailedFlagsModal] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiDetailedFlagsModal', context: 'uiManager.displayDetailedFlagsModal', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies); player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
 * Displays a form to ban a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showBanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId
        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'ban' })); // Assumes new string
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Admin: ${adminPlayerName} opening ban form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const modalForm = new ModalFormData()
            .title(getString('ui.playerActions.ban.title', { targetPlayerName }))
            .textField(
                getString('ui.playerActions.ban.durationPrompt'),
                config?.banCommand?.defaultDurationPlaceholder ?? getString('ui.playerActions.ban.durationPlaceholder'),
                config?.banCommand?.defaultDuration ?? 'perm',
            )
            .textField(
                getString('ui.playerActions.ban.reasonPrompt'),
                config?.banCommand?.defaultReasonPlaceholder ?? getString('ui.playerActions.ban.reasonPlaceholder'),
                config?.banCommand?.defaultReason ?? '',
            );

        try {
            const response = await modalForm.show(player);
            if (response.canceled) {
                player.sendMessage(getString('ui.playerActions.ban.cancelled'));
            } else {
                const [duration, reason] = response.formValues;
                if (!reason || reason.trim() === '') {
                    player.sendMessage(getString('common.error.reasonEmpty')); await UI_ACTION_FUNCTIONS.showBanFormForPlayer(player, dependencies, context); return;
                }
                const banCommand = commandExecutionMap?.get('ban');
                if (banCommand) {
                    await banCommand(player, [targetPlayerName, duration || (config?.banCommand?.defaultDuration ?? 'perm'), ...reason.split(' ')], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'ban' }));
                }
            }
        } catch (error) {
            console.error(`[UiManager.showBanFormForPlayer] Error for ${adminPlayerName} banning ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showBanFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiBanForm', context: 'uiManager.showBanFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies); player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
 * Displays a form to kick a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showKickFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId
        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'kick' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Admin: ${adminPlayerName} opening kick form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const modalForm = new ModalFormData()
            .title(getString('ui.playerActions.kick.title', { targetPlayerName }))
            .textField(
                getString('ui.playerActions.kick.reasonPrompt'),
                config?.kickCommand?.defaultReasonPlaceholder ?? getString('ui.playerActions.kick.reasonPlaceholder'),
                config?.kickCommand?.defaultReason ?? '',
            );

        try {
            const response = await modalForm.show(player);
            if (response.canceled) {
                player.sendMessage(getString('ui.playerActions.kick.cancelled'));
            } else {
                const [reason] = response.formValues;
                const kickCommand = commandExecutionMap?.get('kick');
                if (kickCommand) {
                    await kickCommand(player, [targetPlayerName, ...(reason ? reason.split(' ') : [])], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'kick' }));
                }
            }
        } catch (error) {
            console.error(`[UiManager.showKickFormForPlayer] Error for ${adminPlayerName} kicking ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showKickFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiKickForm', context: 'uiManager.showKickFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies); player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
 * Displays a form to mute a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showMuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, config, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId
        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'mute' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Admin: ${adminPlayerName} opening mute form for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const modalForm = new ModalFormData()
            .title(getString('ui.playerActions.mute.title', { targetPlayerName }))
            .textField(
                getString('ui.playerActions.mute.durationPrompt'),
                config?.muteCommand?.defaultDurationPlaceholder ?? getString('ui.playerActions.mute.durationPlaceholder'),
                config?.muteCommand?.defaultDuration ?? '30m',
            )
            .textField(
                getString('ui.playerActions.mute.reasonPrompt'),
                config?.muteCommand?.defaultReasonPlaceholder ?? getString('ui.playerActions.mute.reasonPlaceholder'),
                config?.muteCommand?.defaultReason ?? '',
            );

        try {
            const response = await modalForm.show(player);
            if (response.canceled) {
                player.sendMessage(getString('ui.playerActions.mute.cancelled'));
            } else {
                const [duration, reason] = response.formValues;
                const muteCommand = commandExecutionMap?.get('mute');
                if (muteCommand) {
                    await muteCommand(player, [targetPlayerName, duration || (config?.muteCommand?.defaultDuration ?? '30m'), ...(reason ? reason.split(' ') : [])], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'mute' }));
                }
            }
        } catch (error) {
            console.error(`[UiManager.showMuteFormForPlayer] Error for ${adminPlayerName} muting ${targetPlayerName}: ${error.stack || error}`); playerUtils?.debugLog(`[UiManager.showMuteFormForPlayer] Error: ${error.message}`, adminPlayerName, dependencies); logManager?.addLog({ actionType: 'errorUiMuteForm', context: 'uiManager.showMuteFormForPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies); player.sendMessage(getString('common.error.genericForm'));
        } finally {
            await showPanel(player, 'playerActionsPanel', dependencies, context);
        }
    },
    /**
     * Toggles the frozen state of a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    toggleFreezePlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context;
        if (!targetPlayerName) {
            player.sendMessage('§cTarget player not specified for freeze toggle.'); await showPanel(player, 'playerActionsPanel', dependencies, context); return;
        }
        playerUtils?.debugLog(`[UiManager.toggleFreezePlayer] Admin: ${adminPlayerName} toggling freeze for Target: ${targetPlayerName}`, adminPlayerName, dependencies);
        const freezeCommand = commandExecutionMap?.get('freeze');
        if (freezeCommand) {
            try {
                await freezeCommand(player, [targetPlayerName, 'toggle'], dependencies);
            } catch (error) {
                console.error(`[UiManager.toggleFreezePlayer] Error executing freeze command for ${targetPlayerName}: ${error.stack || error}`); player.sendMessage(getString('common.error.genericCommandError', { commandName: 'freeze', errorMessage: error.message })); logManager?.addLog({ actionType: 'errorUiFreezeToggle', context: 'uiManager.toggleFreezePlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'freeze' }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
 * Teleports the admin to a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    teleportAdminToPlayer: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context;
        if (!targetPlayerName) {
            player.sendMessage('§cTarget player not specified for teleport.'); await showPanel(player, 'playerActionsPanel', dependencies, context); return;
        }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer?.isValid() && targetPlayer.location && targetPlayer.dimension) {
            try {
                await player.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                player.sendMessage(`§aSuccess: Teleported to ${targetPlayerName}.`);
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportSelfToPlayer', targetName: targetPlayerName, details: `Admin TP to ${targetPlayerName}` });
            } catch (e) {
                player.sendMessage(getString('ui.playerActions.teleport.errorGeneric') || '§cError: Teleport failed. The player might be in an invalid location or dimension.');
                console.error(`[UiManager.teleportAdminToPlayer] Teleport failed for ${adminPlayerName} to ${targetPlayerName}: ${e.stack || e}`);
                logManager?.addLog({ actionType: 'errorUiTeleportToPlayer', context: 'uiManager.teleportAdminToPlayer', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack } });
            }
        } else {
            player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
 * Teleports a target player to the admin.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    teleportPlayerToAdmin: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context;
        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'teleport here' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        const targetPlayer = playerUtils.findPlayer(targetPlayerName);
        if (targetPlayer?.isValid() && player.location && player.dimension) {
            try {
                await targetPlayer.teleport(player.location, { dimension: player.dimension });
                player.sendMessage(getString('ui.playerActions.teleport.successPlayerToAdmin', { targetPlayerName, adminName: adminPlayerName })); // Assuming new string
                targetPlayer.sendMessage(getString('ui.playerActions.teleport.targetNotification', { adminName: adminPlayerName })); // Assuming new string
                logManager?.addLog({ adminName: adminPlayerName, actionType: 'teleportPlayerToAdmin', targetName: targetPlayerName, details: `Admin TP'd ${targetPlayerName} to self` }, dependencies);
            } catch (e) {
                player.sendMessage(getString('ui.playerActions.teleport.errorGeneric') || '§cError: Teleport failed. The player might be in an invalid location or dimension, or you lack permission.');
                console.error(`[UiManager.teleportPlayerToAdmin] Teleport failed for ${targetPlayerName} to ${adminPlayerName}: ${e.stack || e}`);
                logManager?.addLog({ actionType: 'errorUiTeleportPlayerToAdmin', context: 'uiManager.teleportPlayerToAdmin', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack } }, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
 * Confirms and unmutes a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showUnmuteFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'unmute' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showUnmuteFormForPlayer] Admin: ${adminPlayerName} initiating unmute for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            getString('ui.playerActions.unmute.confirmTitle'),
            getString('ui.playerActions.unmute.confirmBody', { targetPlayerName }),
            getString('ui.playerActions.unmute.confirmToggle'),
            async () => { // This callback is only executed if confirmed
                const unmuteCommand = commandExecutionMap?.get('unmute');
                if (unmuteCommand) {
                    await unmuteCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'unmute' }));
                }
            },
            dependencies,
        );
        // _showConfirmationModal returns true if confirmed and callback ran, false otherwise (cancelled or error in modal)
        // It also handles sending 'ui.common.actionCancelled' if not confirmed.

        // Always navigate back to the playerActionsPanel.
        // The command itself (unmute) should provide success/failure feedback to the admin.
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
    /**
 * Confirms and clears a target player's inventory.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    confirmClearPlayerInventory: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap, logManager } = dependencies; // logManager is used by callback
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'clear inventory' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.confirmClearPlayerInventory] Admin: ${adminPlayerName} initiating clear inventory for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            getString('ui.playerActions.clearInventory.confirmTitle'),
            getString('ui.playerActions.clearInventory.confirmBody', { targetPlayerName }),
            getString('ui.playerActions.clearInventory.confirmToggle'),
            async () => {
                const clearInvCommand = commandExecutionMap?.get('clearinv') ?? commandExecutionMap?.get('clearinventory');
                if (clearInvCommand) {
                    await clearInvCommand(player, [targetPlayerName], dependencies);
                } else {
                    playerUtils.debugLog(`[UiManager.confirmClearPlayerInventory] No 'clearinv' command in map, using vanilla /clear for ${targetPlayerName}`, adminPlayerName, dependencies);
                    try {
                        const targetPlayerObject = world.getAllPlayers().find(p => p.name === targetPlayerName);
                        if (targetPlayerObject) {
                            await targetPlayerObject.runCommandAsync('clear @s');
                            player.sendMessage(getString('ui.playerActions.clearInventory.success', { targetPlayerName }));
                            logManager?.addLog({ adminName: adminPlayerName, actionType: 'playerInventoryCleared', targetName: targetPlayerName, details: `Inventory cleared for ${targetPlayerName} via UI.` }, dependencies);
                        } else {
                            player.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayerName }));
                            logManager?.addLog({ adminName: adminPlayerName, actionType: 'errorPlayerInventoryClear', targetName: targetPlayerName, details: `Failed to clear inventory: ${targetPlayerName} not found online.` }, dependencies);
                        }
                    } catch (e) {
                        player.sendMessage(getString('ui.playerActions.clearInventory.fail', { targetPlayerName }));
                        console.error(`[UiManager.confirmClearPlayerInventory] Vanilla /clear command failed for ${targetPlayerName}: ${e}`);
                        logManager?.addLog({ adminName: adminPlayerName, actionType: 'errorPlayerInventoryClear', targetName: targetPlayerName, details: { errorMessage: e.message, stack: e.stack } }, dependencies);
                    }
                }
            },
            dependencies,
        );
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
 * Confirms and unbans a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showUnbanFormForPlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context;

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'unban' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showUnbanFormForPlayer] Admin: ${adminPlayerName} initiating unban for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            getString('ui.playerActions.unban.confirmTitle', { targetPlayerName }), // Assuming similar string key structure
            getString('ui.playerActions.unban.confirmBody', { targetPlayerName }),
            getString('ui.playerActions.unban.confirmToggle'),
            async () => {
                const unbanCommand = commandExecutionMap?.get('unban');
                if (unbanCommand) {
                    await unbanCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'unban' }));
                }
            },
            dependencies,
        );
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
 * Confirms and resets all flags for a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    confirmResetPlayerFlagsForPlayer: async (player, dependencies, context) => {
        const { playerUtils, getString, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'reset flags' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.confirmResetPlayerFlagsForPlayer] Admin: ${adminPlayerName} initiating flag reset for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        await _showConfirmationModal(
            player,
            getString('ui.playerActions.resetFlags.confirmTitle', { targetPlayerName }), // Assuming string key
            getString('ui.playerActions.resetFlags.confirmBody', { targetPlayerName }),
            getString('ui.playerActions.resetFlags.confirmToggle'),
            async () => {
                const resetFlagsCommand = commandExecutionMap?.get('resetflags');
                if (resetFlagsCommand) {
                    await resetFlagsCommand(player, [targetPlayerName], dependencies);
                } else {
                    player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'resetflags' }));
                }
            },
            dependencies,
        );
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
 * Displays the inventory of a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    showPlayerInventoryFromPanel: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'view inventory' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.showPlayerInventoryFromPanel] Admin: ${adminPlayerName} viewing inventory for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const invseeCommand = commandExecutionMap?.get('invsee');
        if (invseeCommand) {
            try {
                await invseeCommand(player, [targetPlayerName], dependencies);
            } catch (error) {
                console.error(`[UiManager.showPlayerInventoryFromPanel] Error executing invsee command for ${targetPlayerName}: ${error.stack || error}`);
                player.sendMessage(getString('common.error.genericCommandError', { commandName: 'invsee', errorMessage: error.message }));
                logManager?.addLog({ actionType: 'errorUiInvsee', context: 'uiManager.showPlayerInventoryFromPanel', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
                // Still show panel again in finally
            }
        } else {
            player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'invsee' }));
        }
        // The invsee command shows its own form. We should return to playerActionsPanel *after* that form is closed.
        // However, invsee command itself doesn't have a callback to uiManager.
        // For now, we'll navigate back immediately. This might be slightly awkward if invsee takes time or is cancelled.
        // A more robust solution would involve invsee command being aware of UI flow or uiManager having a way to await modal closure.
        // Given the current structure, this is the most straightforward approach.
        // The `invsee` command itself doesn't return to any panel, it just shows a MessageFormData.
        // So, after it's called, we need to manually bring the user back to the playerActionsPanel.
        // The `invsee` command's `execute` function is async and shows a form.
        // We don't want to show the playerActionsPanel *before* the invsee form is shown.
        // This means this function should ensure the invsee form is handled, then return.
        // The `invsee` command doesn't take a `context` to return to a panel.
        // This is a slight architectural limitation. We will proceed by calling it, and the user will manually close the invsee form.
        // Then, they'd still be on the playerActionsPanel because we're calling showPanel here.
        // This might be okay. Let's test this assumption.
        // Actually, the invsee command shows a MessageFormData, which is modal.
        // After it's dismissed, control returns. So calling showPanel afterwards is correct.
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },

    /**
 * Toggles the 'watched' status for a target player.
 * @param {import('@minecraft/server').Player} player The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context object with target player details.
     */
    toggleWatchPlayerFromPanel: async (player, dependencies, context) => {
        const { playerUtils, logManager, getString, commandExecutionMap } = dependencies;
        const adminPlayerName = player.name;
        const { targetPlayerName } = context; // Removed targetPlayerId

        if (!targetPlayerName) {
            player.sendMessage(getString('ui.playerActions.error.targetNotSpecified', { action: 'toggle watch' }));
            await showPanel(player, 'playerActionsPanel', dependencies, context);
            return;
        }
        playerUtils?.debugLog(`[UiManager.toggleWatchPlayerFromPanel] Admin: ${adminPlayerName} toggling watch for Target: ${targetPlayerName}`, adminPlayerName, dependencies);

        const watchCommand = commandExecutionMap?.get('watch');
        if (watchCommand) {
            try {
                await watchCommand(player, [targetPlayerName, 'toggle'], dependencies);
            } catch (error) {
                console.error(`[UiManager.toggleWatchPlayerFromPanel] Error executing watch command for ${targetPlayerName}: ${error.stack || error}`);
                player.sendMessage(getString('common.error.genericCommandError', { commandName: 'watch', errorMessage: error.message }));
                logManager?.addLog({ actionType: 'errorUiWatchToggle', context: 'uiManager.toggleWatchPlayerFromPanel', adminName: adminPlayerName, targetName: targetPlayerName, details: { errorMessage: error.message, stack: error.stack } }, dependencies);
            }
        } else {
            player.sendMessage(getString('common.error.commandModuleNotFound', { moduleName: 'watch' }));
        }
        await showPanel(player, 'playerActionsPanel', dependencies, context);
    },
};

/**
 * Navigates to the next page of logs in the logViewerPanel.
 * Navigates to the next page of logs in the `logViewerPanel`.
 * @async
 * @param {import('@minecraft/server').Player} player The player navigating.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Current panel context. Expected to contain `currentPage` and `totalPages`.
 */
async function goToNextLogPage(player, dependencies, context) {
    const { playerUtils } = dependencies;
    let { currentPage = 1 } = context; // currentPage can be incremented
    const totalPages = context.totalPages ?? 1; // Get totalPages from context or default to 1

    playerUtils.debugLog(`[UiManager.goToNextLogPage] Current: ${currentPage}, Total: ${totalPages}`, player.nameTag, dependencies);
    if (currentPage < totalPages) {
        currentPage++;
    }
    // No need to push to nav stack here, showPanel for logViewerPanel handles its state.
    // Pass the original context, which might include filters, and the updated currentPage.
    await showPanel(player, 'logViewerPanel', dependencies, { ...context, currentPage });
}

/**
 * Navigates to the next page of logs.
 * @param {import('@minecraft/server').Player} player The player navigating.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Current panel context.
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

// Removed duplicate function prepareBanUnbanLogsViewer

// Removed duplicate function prepareMuteUnmuteLogsViewer


/**
 * Shows a form to input a player name for inspection.
 * @param {import('@minecraft/server').Player} adminPlayer The admin player.
 * @param {import('../types.js').Dependencies} dependencies Standard dependencies.
 * @param {object} context Context from the calling panel.
 */
async function showInspectPlayerForm(adminPlayer, dependencies, context) {
    const { playerUtils, logManager, getString, commandExecutionMap } = dependencies;
    const adminName = adminPlayer?.name ?? 'UnknownAdmin';
    playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Requested by ${adminName}`, adminName, dependencies);

    const modalForm = new ModalFormData()
        .title(inspectPlayerTitle)
        .textField(inspectPlayerTextFieldLabel, inspectPlayerTextFieldPlaceholder);

    try {
        const response = await modalForm.show(adminPlayer);
        const callingPanelState = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };

        if (response.canceled) {
            playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Cancelled by ${adminName}. Reason: ${response.cancelationReason}`, adminName, dependencies);
            if (callingPanelState.panelId) {
                await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
            }
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
        if (callingPanelState.panelId) {
            await showPanel(adminPlayer, callingPanelState.panelId, dependencies, callingPanelState.context);
        }

    } catch (error) {
        console.error(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.stack || error}`);
        playerUtils?.debugLog(`[UiManager.showInspectPlayerForm] Error for ${adminName}: ${error.message}`, adminName, dependencies);
        logManager?.addLog({
            actionType: 'errorUiInspectPlayerForm',
            context: 'uiManager.showInspectPlayerForm',
            adminName,
            details: { errorMessage: error.message, stack: error.stack },
        }, dependencies);
        adminPlayer?.sendMessage(getString('common.error.genericForm'));
        const callingPanelStateOnError = getCurrentTopOfNavStack(adminPlayer.id) || { panelId: 'playerManagementPanel', context: {} };
        if (callingPanelStateOnError.panelId) {
            await showPanel(adminPlayer, callingPanelStateOnError.panelId, dependencies, callingPanelStateOnError.context);
        }
    }
}

/**
 * Main exported functions for UI management.
 */
export { showPanel, clearPlayerNavStack };
