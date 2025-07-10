/**
 * @file Defines the layout configurations for various UI panels,
 * allowing dynamic, hierarchical, and permission-based generation.
 * @module AntiCheatsBP/scripts/core/panelLayoutConfig
 */

/**
 * Represents a single interactive item within a panel, typically displayed as a button.
 *
 * Dynamic Text and Icons:
 * The `textVariants` and `iconVariants` properties allow button text and icons to change
 * based on the current panel's context. For each type of variant (text or icon),
 * `uiManager.showPanel` will iterate through the defined variants. The first variant where
 * `currentContext[variant.contextKey] === variant.contextValue` will be applied.
 * If no variant matches, the default `text` or `icon` property for the PanelItem is used.
 * Placeholder interpolation (e.g., `{playerName}`) is applied to the text *after* a variant
 * (or default) has been selected.
 * @typedef {object} PanelItem
 * @property {string} id - Unique string identifier for this item within its panel (e.g., 'viewPlayers', 'editConfigKey_maxCps').
 *                         Used for logging and potentially for direct item manipulation if ever needed.
 * @property {number} sortId - Numerical ID for ordering items within the panel. Lower numbers appear first.
 *                             Items with the same sortId will have a stable but otherwise undefined relative order.
 * @property {string} text - Display text for the button. Can include placeholders like `{playerName}` or `{keyName}`
 *                         which will be interpolated by `uiManager.showPanel` using the current panel context.
 * @property {string} [icon] - Optional path to an icon texture to be displayed on the button
 *                           (e.g., 'textures/ui/icon_multiplayer').
 * @property {number} requiredPermLevel - Minimum numerical permission level (from `config.permissionLevels`)
 *                                      required for a player to see and interact with this item.
 *                                      Example: Owner=0, Admin=1, Moderator=2, Member=1024.
 * @property {'functionCall' | 'openPanel'} actionType - Defines what happens when the item is selected.
 *                                                     - `'functionCall'`: Calls a JavaScript function defined in `uiManager.UI_ACTION_FUNCTIONS`.
 *                                                     - `'openPanel'`: Navigates to another panel.
 * @property {string} actionValue - If `actionType` is `'functionCall'`, this is the name of the function to call
 *                                 (must be a key in `uiManager.UI_ACTION_FUNCTIONS`).
 *                                 If `actionType` is `'openPanel'`, this is the `panelId` of the target panel to open.
 * @property {Array<{contextKey: string, contextValue: any, text: string}>} [textVariants] - Optional. Allows dynamic button text.
 *                                   The first variant where `currentContext[contextKey] === contextValue` will be used.
 *                                   If no variant matches, the default `text` property is used.
 * @property {Array<{contextKey: string, contextValue: any, icon: string}>} [iconVariants] - Optional. Allows dynamic button icon.
 *                                   The first variant where `currentContext[contextKey] === contextValue` will be used.
 *                                   If no variant matches, the default `icon` property is used.
 * @property {string[]} [actionContextVars] - Optional. For `actionType: 'openPanel'`, this array of strings specifies
 *                                          which keys from the current panel's `effectiveContext` form the base context for
 *                                          the next panel. If undefined or empty, the entire `effectiveContext` is used as the base.
 *                                          For `actionType: 'functionCall'`, this serves as documentation for which context
 *                                          variables the function might primarily use, though the function receives the full `effectiveContext`.
 * @property {object} [initialContext] - Optional. For `'openPanel'` or `'functionCall'`.
 *                                     Provides key-value pairs to be merged into the context for the next step.
 *                                     For `actionType: 'openPanel'`, `initialContext` properties will override any properties
 *                                     with the same name that were included in the base context (formed via `actionContextVars`
 *                                     or the full `effectiveContext`).
 *                                     For `actionType: 'functionCall'`, `initialContext` properties override those in the
 *                                     `effectiveContext` passed to the function.
 *                                     Example: `{ logTypeFilter: ['ban', 'unban'], logTypeName: 'Ban Logs' }`.
 */

/**
 * Defines the structure and content of a single UI panel.
 * @typedef {object} PanelDefinition
 * @property {string} title - The title string for the panel. Can include placeholders like `{playerName}`
 *                         that will be interpolated by `uiManager.showPanel` using the current panel context.
 * @property {string | null} parentPanelId - The `panelId` of the panel that should be considered the "parent"
 *                                         for 'Back' button navigation. If `null`, this panel is treated as a
 *                                         top-level panel, and its 'Back' button will function as an 'Exit' button.
 * @property {PanelItem[]} items - An array of {@link PanelItem} objects that define the interactive elements
 *                               (buttons) to be displayed in this panel.
 */

/**
 * Defines all panels used in the UI system.
 * @type {Record<string, PanelDefinition>}
 */
export const panelDefinitions = {
    // --- Main Panels ---
    mainAdminPanel: {
        title: '§l§bAntiCheat Admin Panel§r',
        parentPanelId: null, // Top-level panel
        items: [
            {
                id: 'playerManagementCat', sortId: 10, text: 'Player Management', icon: 'textures/ui/icon_multiplayer',
                requiredPermLevel: 2, actionType: 'openPanel', actionValue: 'playerManagementPanel',
            },
            {
                id: 'serverManagementCat', sortId: 20, text: 'Server Management', icon: 'textures/ui/server_icon',
                requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'serverManagementPanel',
            },
            {
                id: 'configEditingCat', sortId: 30, text: '§l§6Configuration§r', icon: 'textures/ui/settings_glyph_color',
                requiredPermLevel: 0, actionType: 'openPanel', actionValue: 'configEditingRootPanel', // Owner only
            },
        ],
    },
    mainUserPanel: {
        title: 'Player Information Panel',
        parentPanelId: null, // Top-level panel
        items: [
            {
                id: 'myStats', sortId: 10, text: 'My AntiCheat Stats', icon: 'textures/ui/icon_bestfriend',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'myStatsPanel',
            },
            {
                id: 'serverRules', sortId: 20, text: 'Server Rules', icon: 'textures/ui/scroll_filled',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'serverRulesPanel',
            },
            {
                id: 'helpfulLinks', sortId: 30, text: 'Helpful Links', icon: 'textures/ui/icon_Details',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'helpfulLinksPanel',
            },
            {
                id: 'generalTips', sortId: 40, text: 'General Tips', icon: 'textures/ui/light_bulb_momented',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'generalTipsPanel',
            },
        ],
    },

    // --- Admin Sub-Panels ---
    playerManagementPanel: {
        title: 'Player Management',
        parentPanelId: 'mainAdminPanel',
        items: [
            {
                id: 'viewOnlinePlayersPanel', sortId: 10, text: '§lView Online Players§r', icon: 'textures/ui/multiplayer_glyph_color',
                requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'onlinePlayersPanel', // Changed perm from 2 to 1
            },
            {
                id: 'inspectPlayerText', sortId: 20, text: '§lInspect Player (Text)§r', icon: 'textures/ui/magnifying_glass',
                requiredPermLevel: 2, actionType: 'functionCall', actionValue: 'showInspectPlayerForm',
            },
            {
                id: 'resetPlayerFlagsText', sortId: 30, text: '§lReset Player Flags (Text)§r', icon: 'textures/ui/refresh',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showResetFlagsForm',
            },
            {
                id: 'listWatchedPlayersPanel', sortId: 40, text: '§lList Watched Players (Online)§r', icon: 'textures/ui/spyglass_flat_color',
                requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'watchedPlayersPanel',
            },
        ],
    },
    /**
     * @description Panel to display a list of currently online players.
     * Items are dynamically generated. Allows navigation to playerActionsPanel for a selected player.
     */
    onlinePlayersPanel: {
        title: '§lOnline Players§r',
        parentPanelId: 'playerManagementPanel',
        dynamicItemGeneratorKey: 'generateOnlinePlayerItems',
        items: [
            {
                id: 'refreshOnlinePlayers',
                sortId: 1, // Show refresh at the top
                text: '§2Refresh List§r',
                icon: 'textures/ui/refresh',
                requiredPermLevel: 1, // Changed perm from 2 to 1
                actionType: 'functionCall',
                actionValue: 'refreshOnlinePlayersPanelAction',
            },
            // Player items will be dynamically generated
        ],
    },
    /**
     * @description Panel to display a list of currently online players who are being watched.
     * Items are dynamically generated. Allows navigation to playerActionsPanel for a selected player.
     */
    watchedPlayersPanel: {
        title: '§lWatched Players (Online)§r',
        parentPanelId: 'playerManagementPanel',
        dynamicItemGeneratorKey: 'generateWatchedPlayerItems',
        items: [
            {
                id: 'refreshWatchedPlayers',
                sortId: 1, // Show refresh at the top
                text: '§2Refresh List§r',
                icon: 'textures/ui/refresh',
                requiredPermLevel: 1, // Matches old command perm
                actionType: 'functionCall',
                actionValue: 'refreshWatchedPlayersPanelAction',
            },
            // Watched player items will be dynamically generated
        ],
    },
    serverManagementPanel: {
        title: '§l§6Server Management§r',
        parentPanelId: 'mainAdminPanel',
        items: [
            { id: 'systemInfo', sortId: 10, text: '§bSystem Information§r', icon: 'textures/ui/icon_bookshelf', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'systemInfoPanel' },
            { id: 'clearChat', sortId: 20, text: '§eClear Global Chat§r', icon: 'textures/ui/chat_bubble', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'confirmClearChat' },
            { id: 'lagClear', sortId: 30, text: '§cClear Ground Items/Entities§r', icon: 'textures/ui/trash', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'confirmLagClear' },
            { id: 'actionLogs', sortId: 40, text: '§3View Action Logs (All)§r', icon: 'textures/ui/icon_sign', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'actionLogsPanel' },
            { id: 'modLogs', sortId: 50, text: '§3View Moderation Logs (Filtered)§r', icon: 'textures/ui/icon_filter', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'modLogSelectionPanel' },
        ],
    },
    configEditingRootPanel: {
        title: '§l§6Configuration Editor§r',
        parentPanelId: 'mainAdminPanel',
        items: [
            { id: 'viewConfigCategories', sortId: 10, text: 'Browse Config Categories', requiredPermLevel: 0, actionType: 'functionCall', actionValue: 'showConfigCategoriesList' }, // This would list categories, then specific configs
        ],
    },
    playerActionsPanel: {
        title: 'Actions for {playerName}', // Dynamic title
        parentPanelId: 'playerManagementPanel', // This might be dynamic based on how it's opened (e.g. from online list)
        items: [
            { id: 'viewPlayerFlags', sortId: 5, text: '§bView Detailed Flags§r', icon: 'textures/ui/magnifying_glass', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'detailedFlagsPanel', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'resetPlayerFlagsDirect', sortId: 7, text: '§eReset Player Flags§r', icon: 'textures/ui/refresh', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'confirmResetPlayerFlagsForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'banPlayer', sortId: 10, text: '§4Ban Player§r', icon: 'textures/ui/icon_resource_pack', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showBanFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'unbanPlayer', sortId: 15, text: '§aUnban Player§r', icon: 'textures/ui/icon_recipe_unlocked', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showUnbanFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'kickPlayer', sortId: 20, text: '§cKick Player§r', icon: 'textures/ui/icon_hammer', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showKickFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'mutePlayer', sortId: 30, text: '§6Mute Player§r', icon: 'textures/ui/speaker_on_light', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showMuteFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'unmutePlayer', sortId: 35, text: '§aUnmute Player§r', icon: 'textures/ui/speaker_off_light', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showUnmuteFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            {
                id: 'freezePlayer', sortId: 40,
                text: '§bToggle Freeze for {targetPlayerName}§r', // Default text
                icon: 'textures/ui/debug_glyph_color', // Default icon (placeholder)
                textVariants: [
                    { contextKey: 'isTargetFrozen', contextValue: true, text: '§aUnfreeze {targetPlayerName}§r' },
                    { contextKey: 'isTargetFrozen', contextValue: false, text: '§bFreeze {targetPlayerName}§r' },
                ],
                iconVariants: [
                    { contextKey: 'isTargetFrozen', contextValue: true, icon: 'textures/ui/icon_unlocked' }, // Placeholder icon for "Unfreeze"
                    { contextKey: 'isTargetFrozen', contextValue: false, icon: 'textures/ui/icon_locked' },     // Placeholder icon for "Freeze"
                ],
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'toggleFreezePlayer',
                actionContextVars: ['targetPlayerId', 'targetPlayerName', 'isTargetFrozen'], // Pass isTargetFrozen to the action too
            },
            { id: 'viewPlayerInventory', sortId: 42, text: '§9View Inventory§r', icon: 'textures/ui/inventory_icon', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showPlayerInventoryFromPanel', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'toggleWatchPlayer', sortId: 43, text: '§3Toggle Watch§r', icon: 'textures/ui/spyglass_flat_color', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'toggleWatchPlayerFromPanel', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'clearInventory', sortId: 45, text: '§cClear Inventory§r', icon: 'textures/ui/trash', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'confirmClearPlayerInventory', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'teleportToPlayer', sortId: 50, text: '§dTeleport To Player§r', icon: 'textures/ui/portal', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'teleportAdminToPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'teleportPlayerHere', sortId: 60, text: '§dTeleport Player Here§r', icon: 'textures/ui/arrow_down_thin', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'teleportPlayerToAdmin', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
        ],
    },
    modLogSelectionPanel: {
        title: '§l§3Moderation Log Viewer§r',
        parentPanelId: 'serverManagementPanel',
        items: [
            {
                id: 'banUnbanLogs', sortId: 10, text: '§cBans/Unbans§r',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'prepareBanUnbanLogsViewer',
            },
            {
                id: 'muteUnmuteLogs', sortId: 20, text: '§6Mutes/Unmutes§r',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'prepareMuteUnmuteLogsViewer',
            },
            {
                id: 'filterByName', sortId: 30, text: '§bFilter by Player Name§r',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showModLogFilterModal',
                // This function (showModLogFilterModalImpl) already handles setting initial context for logViewerPanel
            },
        ],
    },

    // --- User Panel Sub-Panels (now actual panels) ---
    myStatsPanel: {
        title: '§l§bYour Stats§r',
        parentPanelId: 'mainUserPanel',
        items: [
            // Content for stats will be dynamically generated by a functionCall,
            // or this panel could be a 'displayPanel' type if we add such an actionType.
            // For now, assume a function call populates a modal or a simple action form body.
            { id: 'displayMyStats', sortId: 10, text: 'View My Stats Details', requiredPermLevel: 1024, actionType: 'functionCall', actionValue: 'showMyStatsPageContent' },
        ],
    },
    serverRulesPanel: {
        title: '§l§eServer Rules§r',
        parentPanelId: 'mainUserPanel',
        dynamicItemGeneratorKey: 'generateServerRuleItems', // Added for dynamic items
        items: [
            // Items will be dynamically generated.
            // The 'showServerRulesPageContent' function call is no longer needed here
            // as the panel itself will list the rules.
        ],
    },
    helpfulLinksPanel: {
        title: '§l§9Helpful Links§r',
        parentPanelId: 'mainUserPanel',
        dynamicItemGeneratorKey: 'generateHelpfulLinkItems', // Added for dynamic items
        items: [
            // Static items can still be defined here if needed, e.g., a refresh button.
            // For now, it will be populated entirely by the dynamic generator.
            // The 'showHelpfulLinksPageContent' function call is no longer needed here
            // as the panel itself will list the links.
        ],
    },
    generalTipsPanel: {
        title: 'General Tips',
        parentPanelId: 'mainUserPanel',
        dynamicItemGeneratorKey: 'generateGeneralTipItems', // Added for dynamic items
        items: [
            // Items will be dynamically generated.
            // The 'showGeneralTipsPageContent' function call is no longer needed here.
        ],
    },

    // --- Example Leaf Panels (display content, often modal or simple action forms) ---
    systemInfoPanel: {
        title: '§l§bSystem Information§r',
        parentPanelId: 'serverManagementPanel',
        items: [ // This would typically be a functionCall that shows a modal with info
            { id: 'displaySystemInfo', sortId: 10, text: 'Show System Details', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displaySystemInfoModal' },
        ],
    },
    actionLogsPanel: {
        title: '§l§3Action Logs (All)§r',
        parentPanelId: 'serverManagementPanel',
        items: [
            { id: 'displayActionLogs', sortId: 10, text: 'Show Logs', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displayActionLogsModal' },
        ],
    },
    logViewerPanel: {
        title: 'Logs: {logTypeName} (Page {currentPage}/{totalPages})', // Dynamic title
        parentPanelId: 'modLogSelectionPanel',
        items: [
            {
                id: 'viewCurrentPageLogs', sortId: 10, text: 'View Current Page ({currentPage}) Logs', icon: 'textures/ui/book_writable',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displaySpecificLogsPage',
                actionContextVars: ['logTypeFilter', 'logTypeName', 'playerNameFilter', 'currentPage', 'totalPages'], // Pass all relevant for display
            },
            {
                id: 'prevLogPage', sortId: 20, text: 'Previous Page', icon: 'textures/ui/arrow_left_thin_hover',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'goToPrevLogPage',
                actionContextVars: ['logTypeFilter', 'logTypeName', 'playerNameFilter', 'currentPage', 'totalPages'],
            },
            {
                id: 'nextLogPage', sortId: 30, text: 'Next Page', icon: 'textures/ui/arrow_right_thin_hover',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'goToNextLogPage',
                actionContextVars: ['logTypeFilter', 'logTypeName', 'playerNameFilter', 'currentPage', 'totalPages'],
            },
            { // Optional: Re-filter if needed from here
                id: 'filterLogsAgain', sortId: 40, text: 'Change Filter', icon: 'textures/ui/icon_filter',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showModLogFilterModal',
                actionContextVars: ['logTypeFilter', 'logTypeName', 'playerNameFilter'], // Current filter context
            },
        ],
    },
    detailedFlagsPanel: {
        title: 'Flags for {playerName}',
        parentPanelId: 'playerActionsPanel',
        items: [
            { id: 'displayPlayerFlags', sortId: 10, text: 'Show Flag Details', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displayDetailedFlagsModal', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
        ],
    },

    // --- System Panels ---
    errorDisplayPanel: {
        title: '§l§cError Occurred§r',
        parentPanelId: null, // Special handling: Back button tries to go to `previousPanelIdOnError` from context if available.
        items: [
            // This panel's body is dynamically set by `uiManager.showPanel` using `context.errorMessage`.
            // It has no predefined items. The "Back" button (or "Close" if no previous panel is known)
            // is the primary interaction, handled by `showPanel`'s generic back/exit logic,
            // which is aware of the error context (`previousPanelIdOnError`).
        ],
    },
};
