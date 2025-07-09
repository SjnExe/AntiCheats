/**
 * @file Defines the layout configurations for various UI panels,
 * allowing dynamic, hierarchical, and permission-based generation.
 * @module AntiCheatsBP/scripts/core/panelLayoutConfig
 */

/**
 * Represents a single interactive item within a panel, typically displayed as a button.
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
 * @property {string[]} [actionContextVars] - Optional array of strings.
 *                                          When `actionType` is `'openPanel'`, these specify which keys from the *current*
 *                                          panel's context should be explicitly passed along to the *next* panel's context.
 *                                          This allows selective context propagation.
 *                                          For `'functionCall'`, this can document expected context variables, though the function
 *                                          itself will destructure what it needs from the provided context.
 * @property {object} [initialContext] - For `'openPanel'` or `'functionCall'`, this object provides additional
 *                                     key-value pairs to be merged into the context passed to the target panel or function.
 *                                     This is useful for setting up specific context needed by the next step,
 *                                     e.g., `{ logTypeFilter: ['ban', 'unban'], logTypeName: 'Ban Logs' }`.
 *                                     Values from `initialContext` may override values from the current panel's context if keys conflict.
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
 * @type {Object<string, PanelDefinition>}
 */
export const panelDefinitions = {
    // --- Main Panels ---
    mainAdminPanel: {
        title: '§l§bAntiCheat Admin Panel§r',
        parentPanelId: null, // Top-level panel
        items: [
            {
                id: 'playerManagementCat', sortId: 10, text: 'Player Management', icon: 'textures/ui/icon_multiplayer',
                requiredPermLevel: 2, actionType: 'openPanel', actionValue: 'playerManagementPanel'
            },
            {
                id: 'serverManagementCat', sortId: 20, text: 'Server Management', icon: 'textures/ui/server_icon',
                requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'serverManagementPanel'
            },
            {
                id: 'configEditingCat', sortId: 30, text: '§l§6Configuration§r', icon: 'textures/ui/settings_glyph_color',
                requiredPermLevel: 0, actionType: 'openPanel', actionValue: 'configEditingRootPanel' // Owner only
            },
        ],
    },
    mainUserPanel: {
        title: 'Player Information Panel',
        parentPanelId: null, // Top-level panel
        items: [
            {
                id: 'myStats', sortId: 10, text: 'My AntiCheat Stats', icon: 'textures/ui/icon_bestfriend',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'myStatsPanel'
            },
            {
                id: 'serverRules', sortId: 20, text: 'Server Rules', icon: 'textures/ui/scroll_filled',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'serverRulesPanel'
            },
            {
                id: 'helpfulLinks', sortId: 30, text: 'Helpful Links', icon: 'textures/ui/icon_Details',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'helpfulLinksPanel'
            },
            {
                id: 'generalTips', sortId: 40, text: 'General Tips', icon: 'textures/ui/light_bulb_momented',
                requiredPermLevel: 1024, actionType: 'openPanel', actionValue: 'generalTipsPanel'
            },
        ],
    },

    // --- Admin Sub-Panels ---
    playerManagementPanel: {
        title: 'Player Management',
        parentPanelId: 'mainAdminPanel',
        items: [
            {
                id: 'viewOnlinePlayers', sortId: 10, text: '§lView Online Players§r', icon: 'textures/ui/multiplayer_glyph_color',
                requiredPermLevel: 2, actionType: 'functionCall', actionValue: 'showOnlinePlayersList' // This function will then open playerActionsPanel for a selected player
            },
            {
                id: 'inspectPlayerText', sortId: 20, text: '§lInspect Player (Text)§r', icon: 'textures/ui/magnifying_glass',
                requiredPermLevel: 2, actionType: 'functionCall', actionValue: 'showInspectPlayerForm'
            },
            {
                id: 'resetPlayerFlagsText', sortId: 30, text: '§lReset Player Flags (Text)§r', icon: 'textures/ui/refresh',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showResetFlagsForm'
            },
            {
                id: 'listWatchedPlayers', sortId: 40, text: '§lList Watched Players§r', icon: 'textures/ui/spyglass_flat_color',
                requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showWatchedPlayersList'
            },
        ]
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
        ]
    },
    configEditingRootPanel: {
        title: '§l§6Configuration Editor§r',
        parentPanelId: 'mainAdminPanel',
        items: [
            { id: 'viewConfigCategories', sortId: 10, text: 'Browse Config Categories', requiredPermLevel: 0, actionType: 'functionCall', actionValue: 'showConfigCategoriesList' } // This would list categories, then specific configs
        ]
    },
    playerActionsPanel: {
        title: 'Actions for {playerName}', // Dynamic title
        parentPanelId: 'playerManagementPanel', // This might be dynamic based on how it's opened (e.g. from online list)
        items: [
            { id: 'viewPlayerFlags', sortId: 5, text: '§bView Detailed Flags§r', icon: 'textures/ui/magnifying_glass', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'detailedFlagsPanel', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'banPlayer', sortId: 10, text: '§4Ban Player§r', icon: 'textures/ui/icon_resource_pack', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showBanFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'kickPlayer', sortId: 20, text: '§cKick Player§r', icon: 'textures/ui/icon_hammer', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showKickFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'mutePlayer', sortId: 30, text: '§6Mute Player§r', icon: 'textures/ui/speaker_on_light', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showMuteFormForPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] }, // Assuming separate form for mute
            { id: 'freezePlayer', sortId: 40, text: '§bFreeze/Unfreeze Player§r', icon: 'textures/ui/icon_locked', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'toggleFreezePlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] }, // Direct action
            { id: 'teleportToPlayer', sortId: 50, text: '§dTeleport To Player§r', icon: 'textures/ui/portal', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'teleportAdminToPlayer', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
            { id: 'teleportPlayerHere', sortId: 60, text: '§dTeleport Player Here§r', icon: 'textures/ui/arrow_down_thin', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'teleportPlayerToAdmin', actionContextVars: ['targetPlayerId', 'targetPlayerName'] },
        ]
    },
    modLogSelectionPanel: {
        title: '§l§3Moderation Log Viewer§r',
        parentPanelId: 'serverManagementPanel',
        items: [
            { id: 'banUnbanLogs', sortId: 10, text: '§cBans/Unbans§r', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'logViewerPanel', initialContext: { logTypeFilter: ['ban', 'unban'], logTypeName: 'Ban/Unban' } },
            { id: 'muteUnmuteLogs', sortId: 20, text: '§6Mutes/Unmutes§r', requiredPermLevel: 1, actionType: 'openPanel', actionValue: 'logViewerPanel', initialContext: { logTypeFilter: ['mute', 'unmute'], logTypeName: 'Mute/Unmute' } },
            { id: 'filterByName', sortId: 30, text: '§bFilter by Player Name§r', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'showModLogFilterModal' }, // This form would then open logViewerPanel with context
        ]
    },

    // --- User Panel Sub-Panels (now actual panels) ---
    myStatsPanel: {
        title: '§l§bYour Stats§r',
        parentPanelId: 'mainUserPanel',
        items: [
            // Content for stats will be dynamically generated by a functionCall,
            // or this panel could be a 'displayPanel' type if we add such an actionType.
            // For now, assume a function call populates a modal or a simple action form body.
            { id: 'displayMyStats', sortId: 10, text: 'View My Stats Details', requiredPermLevel: 1024, actionType: 'functionCall', actionValue: 'showMyStatsPageContent' }
        ]
    },
    serverRulesPanel: {
        title: '§l§eServer Rules§r',
        parentPanelId: 'mainUserPanel',
        items: [
            { id: 'displayServerRules', sortId: 10, text: 'View Rules', requiredPermLevel: 1024, actionType: 'functionCall', actionValue: 'showServerRulesPageContent' }
        ]
    },
    helpfulLinksPanel: {
        title: '§l§9Helpful Links§r',
        parentPanelId: 'mainUserPanel',
        items: [
            // Links will be dynamically added here by the showPanel logic if actionValue points to a function that generates items
            // Or, define a special actionType: 'generateLinkButtons'
            { id: 'listHelpfulLinks', sortId: 10, text: 'View Links', requiredPermLevel: 1024, actionType: 'functionCall', actionValue: 'showHelpfulLinksPageContent'}
        ]
    },
    generalTipsPanel: {
        title: 'General Tips',
        parentPanelId: 'mainUserPanel',
        items: [
            { id: 'displayGeneralTips', sortId: 10, text: 'View Tips', requiredPermLevel: 1024, actionType: 'functionCall', actionValue: 'showGeneralTipsPageContent' }
        ]
    },

    // --- Example Leaf Panels (display content, often modal or simple action forms) ---
    systemInfoPanel: {
        title: '§l§bSystem Information§r',
        parentPanelId: 'serverManagementPanel',
        items: [ // This would typically be a functionCall that shows a modal with info
             { id: 'displaySystemInfo', sortId: 10, text: 'Show System Details', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displaySystemInfoModal'}
        ]
    },
    actionLogsPanel: {
        title: '§l§3Action Logs (All)§r',
        parentPanelId: 'serverManagementPanel',
        items: [
            { id: 'displayActionLogs', sortId: 10, text: 'Show Logs', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displayActionLogsModal' }
        ]
    },
    logViewerPanel: { // Generic log viewer, context defines what logs to show
        title: 'Log Viewer: {logTypeName}', // Dynamic title
        parentPanelId: 'modLogSelectionPanel', // Or could be other panels
        items: [
            // Log entries would be dynamically generated here by a function, or this is a functionCall itself
            { id: 'displayLogs', sortId: 10, text: 'Refresh Logs', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displaySpecificLogsPage', actionContextVars: ['logTypeFilter', 'logTypeName', 'playerNameFilter'] }
        ]
    },
    detailedFlagsPanel: {
        title: 'Flags for {playerName}',
        parentPanelId: 'playerActionsPanel',
        items: [
            { id: 'displayPlayerFlags', sortId: 10, text: 'Show Flag Details', requiredPermLevel: 1, actionType: 'functionCall', actionValue: 'displayDetailedFlagsModal', actionContextVars: ['targetPlayerId', 'targetPlayerName'] }
        ]
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
        ]
    }
};
