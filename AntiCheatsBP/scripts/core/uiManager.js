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
const playerNavigationStacks = new Map(); // Stores navigation stacks per player: playerId -> [{ panelId, context }, ...]

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
 * Generic function to display a panel based on its definition from `panelLayoutConfig.js`.
 * Handles dynamic button generation, permission filtering, item sorting,
 * title/text interpolation with context, 'Back'/'Exit' button logic,
 * navigation stack management, and action dispatching.
 * @async
 * @param {import('@minecraft/server').Player} player The player viewing the panel.
 * @param {string} panelId The ID of the panel to display (must be a key in `panelDefinitions`).
 * @param {import('../types.js').Dependencies} dependencies Standard command dependencies.
 * @param {object} [currentContext={}] Optional context object for the panel (e.g., { playerName: 'Steve', targetPlayerId: '12345' }).
 *                                     Used for title/text interpolation and passed to action functions/sub-panels.
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

    // Back/Exit button logic
    const atRootLevel = isNavStackAtRoot(player.id) || !panelDefinition.parentPanelId;
    const backExitButtonText = atRootLevel ? getString('common.button.close') : getString('common.button.back');
    const backExitButtonIcon = atRootLevel ? 'textures/ui/cancel' : 'textures/ui/undo';
    form.button(backExitButtonText, backExitButtonIcon);
    const backExitButtonIndex = permittedItems.length; // This button is added last

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
        player.sendMessage(getString('common.error.genericForm'));
        const previousPanelStateOnError = popFromPlayerNavStack(player.id);
        if (previousPanelStateOnError && previousPanelStateOnError.panelId !== panelId) {
            await showPanel(player, previousPanelStateOnError.panelId, dependencies, previousPanelStateOnError.context);
        } else {
            clearPlayerNavStack(player.id);
        }
    }
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
    confirmClearChat: async (player, dependencies, context) => { /* calls _showConfirmationModal, then actual clear chat */ dependencies.playerUtils.debugLog('Action: confirmClearChat', player.nameTag, dependencies); player.sendMessage("Confirm Clear Chat: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'serverManagementPanel', dependencies, {});},
    confirmLagClear: async (player, dependencies, context) => { /* calls _showConfirmationModal, then actual lag clear */ dependencies.playerUtils.debugLog('Action: confirmLagClear', player.nameTag, dependencies); player.sendMessage("Confirm Lag Clear: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'serverManagementPanel', dependencies, {});},
    showConfigCategoriesList: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: showConfigCategoriesList', player.nameTag, dependencies); player.sendMessage("Config Categories: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'configEditingRootPanel', dependencies, {});},
    showActionLogsForm: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: showActionLogsForm', player.nameTag, dependencies); player.sendMessage("Action Logs Form: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'serverManagementPanel', dependencies, {});},
    showModLogFilterModal: async (player, dependencies, context) => { dependencies.playerUtils.debugLog('Action: showModLogFilterModal', player.nameTag, dependencies); player.sendMessage("Mod Log Filter Modal: Not implemented.");const selfPanel = popFromPlayerNavStack(player.id); if (selfPanel && selfPanel.panelId) await showPanel(player, selfPanel.panelId, dependencies, selfPanel.context); else await showPanel(player, 'modLogSelectionPanel', dependencies, {});},
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
    showKickFormForPlayer: async (player, dependencies, context) => { dependencies.playerUtils.debugLog(`Action: showKickFormForPlayer, Target: ${context.targetPlayerName}`, player.nameTag, dependencies); player.sendMessage(`Kick form for ${context.targetPlayerName} TBD`); await showPanel(player, 'playerActionsPanel', dependencies, context);},
    showMuteFormForPlayer: async (player, dependencies, context) => { dependencies.playerUtils.debugLog(`Action: showMuteFormForPlayer, Target: ${context.targetPlayerName}`, player.nameTag, dependencies); player.sendMessage(`Mute form for ${context.targetPlayerName} TBD`); await showPanel(player, 'playerActionsPanel', dependencies, context);},
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
    teleportAdminToPlayer: async (player, dependencies, context) => { dependencies.playerUtils.debugLog(`Action: teleportAdminToPlayer, Target: ${context.targetPlayerName}`, player.nameTag, dependencies); player.sendMessage(`Teleporting to ${context.targetPlayerName} (simulated)`); await showPanel(player, 'playerActionsPanel', dependencies, context);},
    teleportPlayerToAdmin: async (player, dependencies, context) => { dependencies.playerUtils.debugLog(`Action: teleportPlayerToAdmin, Target: ${context.targetPlayerName}`, player.nameTag, dependencies); player.sendMessage(`Teleporting ${context.targetPlayerName} to you (simulated)`); await showPanel(player, 'playerActionsPanel', dependencies, context);},
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
    try {
        if (permittedItems.length === 0 && isNavStackAtRoot(player.id)) { // And no other static buttons yet
             form.body("No options available.");
        }
        // Actual form.show() and response handling is complex and will be added next.
        console.warn(`[UiManager.showPanel] Form for ${panelId} constructed (title: ${panelTitle}), but show/response handling is next.`);
        // For now, to avoid errors and allow testing the build part:
        // If you want to test show it, you'd do it here, but the response handling is crucial.
        // For this partial step, we might just log or do nothing after building.
    } catch(e) {
        console.error(`[UiManager.showPanel] Error during panel ${panelId} construction (pre-show): ${e.stack}`);
        player.sendMessage(getString('common.error.genericForm'));
    }
}


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
                const playerContext = { targetPlayerId: targetPlayer.id, targetPlayerName: targetPlayer.nameTag };
                // `showPanel` for 'playerActionsPanel' will handle navigation stack based on its own definition
                // and the panel that called `showOnlinePlayersList` (which should be on the stack).
                await showPanel(adminPlayer, 'playerActionsPanel', dependencies, playerContext);
            } else {
                adminPlayer?.sendMessage(getString('common.error.playerNotFoundOnline', { playerName: targetPlayer?.nameTag || 'Selected Player' }));
                await showOnlinePlayersList(adminPlayer, dependencies); // Refresh list
            }
        } else if (selection === onlinePlayers.length) { // Corresponds to the "Back" button in this custom form
            // This "Back" should return to the panel that called showOnlinePlayersList.
            // The calling panel's state should be at the top of the stack (or just under if showOnlinePlayersList pushed something).
            // For a functionCall, showPanel doesn't push the function itself to stack. So top of stack IS the caller.
            const callerPanelState = getCurrentTopOfNavStack(adminPlayer.id); // Peek at the panel that called this function
            if (callerPanelState) {
                await showPanel(adminPlayer, callerPanelState.panelId, dependencies, callerPanelState.context);
            } else {
                // Fallback if stack is unexpectedly empty (e.g. if showOnlinePlayersList was called directly)
                await showPanel(adminPlayer, 'mainAdminPanel', dependencies, {});
            }
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
export { showPanel, clearPlayerNavStack }; // Exporting showPanel and clearPlayerNavStack
