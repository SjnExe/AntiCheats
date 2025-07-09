/**
 * @file Defines the layout configurations for various UI panels,
 * allowing dynamic generation based on permissions and actions.
 * @module AntiCheatsBP/scripts/core/panelLayoutConfig
 */

/**
 * @typedef {object} PanelButton
 * @property {string} id - A unique identifier for the button/action (e.g., 'viewPlayers', 'editConfig').
 * @property {string} text - The display text for the button.
 * @property {string} [icon] - Optional path to the button icon.
 * @property {number} requiredPermLevel - Minimum numerical permission level required to see/use this item.
 *                                      Lower numbers mean higher permissions (e.g., 0 for Owner, 1 for Admin, 2 for Mod, 1024 for Member).
 * @property {'functionCall' | 'navigateToPanel'} actionType - Type of action to perform.
 * @property {string} actionValue - The name of the function to call (if actionType is 'functionCall')
 *                                 or the panelId of another panel to navigate to (if actionType is 'navigateToPanel').
 * @property {object} [actionParams] - Optional parameters to pass to the function or panel. (Future use)
 */

/**
 * Configuration for the main Admin Panel.
 * Accessed via !panel by users with appropriate permissions.
 * Permission levels (example): Owner=0, Admin=1, Moderator=2, Helper=3, Member=1024
 * @type {PanelButton[]}
 */
export const adminPanelLayout = [
    {
        id: 'viewOnlinePlayers',
        text: '§lView Online Players§r', // Previously ui.adminPanel.button.viewPlayers
        icon: 'textures/ui/multiplayer_glyph_color',
        requiredPermLevel: 2, // Example: Mod and above
        actionType: 'functionCall',
        actionValue: 'showOnlinePlayersList',
    },
    {
        id: 'inspectPlayerText',
        text: '§lInspect Player (Text)§r', // Previously ui.adminPanel.button.inspectPlayerText
        icon: 'textures/ui/magnifying_glass',
        requiredPermLevel: 2, // Example: Mod and above
        actionType: 'functionCall',
        actionValue: 'showInspectPlayerForm',
    },
    {
        id: 'resetPlayerFlagsText',
        text: '§lReset Player Flags (Text)§r', // Previously ui.adminPanel.button.resetFlagsText
        icon: 'textures/ui/refresh',
        requiredPermLevel: 1, // Example: Admin and above
        actionType: 'functionCall',
        actionValue: 'showResetFlagsForm',
    },
    {
        id: 'listWatchedPlayers',
        text: '§lList Watched Players§r', // Previously ui.adminPanel.button.listWatched
        icon: 'textures/ui/spyglass_flat_color',
        requiredPermLevel: 1, // Example: Admin and above
        actionType: 'functionCall',
        actionValue: 'showWatchedPlayersList',
    },
    {
        id: 'serverManagement',
        text: '§lServer Management§r', // Previously ui.adminPanel.button.serverManagement
        icon: 'textures/ui/server_icon',
        requiredPermLevel: 1, // Example: Admin and above
        actionType: 'functionCall',
        actionValue: 'showServerManagementForm',
    },
    {
        id: 'editConfig',
        text: '§l§6Edit Configuration§r (Owner)', // Previously ui.adminPanel.button.editConfig
        icon: 'textures/ui/settings_glyph_color',
        requiredPermLevel: 0, // Owner only
        actionType: 'functionCall',
        actionValue: 'showEditConfigForm',
    },
    // A 'Close' button is usually added dynamically by the UI rendering function itself,
    // or could be a standard last item if preferred. For now, let UI function handle it.
];

/**
 * Configuration for the Normal User Panel (Player Information Panel).
 * Accessed via !uinfo or by non-admins using !panel.
 * @type {PanelButton[]}
 */
export const userPanelLayout = [
    {
        id: 'myStats',
        text: 'My AntiCheat Stats', // Previously ui.uinfo.button.myStats
        icon: 'textures/ui/icon_bestfriend',
        requiredPermLevel: 1024, // Member and above
        actionType: 'functionCall',
        actionValue: 'showMyStatsUIPanel',
    },
    {
        id: 'serverRules',
        text: 'Server Rules', // Previously ui.uinfo.button.serverRules
        icon: 'textures/ui/scroll_filled',
        requiredPermLevel: 1024, // Member and above
        actionType: 'functionCall',
        actionValue: 'showServerRulesUIPanel',
    },
    {
        id: 'helpfulLinks',
        text: 'Helpful Links', // Previously ui.uinfo.button.helpfulLinks
        icon: 'textures/ui/icon_Details',
        requiredPermLevel: 1024, // Member and above
        actionType: 'functionCall',
        actionValue: 'showHelpfulLinksUIPanel',
    },
    {
        id: 'generalTips',
        text: 'General Tips', // Previously ui.uinfo.button.generalTips
        icon: 'textures/ui/light_bulb_momented',
        requiredPermLevel: 1024, // Member and above
        actionType: 'functionCall',
        actionValue: 'showGeneralTipsUIPanel',
    },
];

/**
 * A map to quickly access panel action functions defined in uiManager.js.
 * The keys should match `actionValue` for 'functionCall' types in panel layouts.
 * This will be populated in uiManager.js or passed via dependencies.
 * For now, this is conceptual; the actual function calls will be handled
 * directly in uiManager.js based on actionValue string matching.
 */
// export const panelActionFunctions = {
//     showOnlinePlayersList,
//     showInspectPlayerForm,
//     // ... etc. This map would ideally be constructed in uiManager.js
//     // or functions passed through dependencies more explicitly.
// };
