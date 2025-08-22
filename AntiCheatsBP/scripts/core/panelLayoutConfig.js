/**
 * This file defines the structure and content of all UI panels in the addon.
 * This configuration is read by the uiManager to dynamically generate and display UI forms.
 */

/**
 * @typedef {object} PanelItem
 * @property {string} id - A unique identifier for the button.
 * @property {string} text - The display text for the button.
 * @property {string} [icon] - An optional icon texture path.
 * @property {number} permissionLevel - The minimum permission level required to see this button.
 * @property {'openPanel' | 'functionCall'} actionType - The action to perform when clicked.
 * @property {string} actionValue - The ID of the panel to open or the function to call.
 */

/**
 * @typedef {object} PanelDefinition
 * @property {string} title - The title of the panel.
 * @property {string | null} parentPanelId - The ID of the parent panel for back navigation. null for top-level panels.
 * @property {PanelItem[]} items - The buttons to display on this panel.
 */

/**
 * @type {Record<string, PanelDefinition>}
 */
export const panelDefinitions = {
    mainPanel: {
        title: '§l§bPanel§r',
        parentPanelId: null,
        items: [
            {
                id: 'playerManagement',
                text: 'Player Management',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'playerListPanel',
            },
            {
                id: 'rules',
                text: 'Rules',
                icon: 'textures/items/book_normal',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showRules',
            },
            {
                id: 'status',
                text: 'Status',
                icon: 'textures/ui/icon_setting.png',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'statusPanel',
            },
        ],
    },
    statusPanel: {
        title: '§lServer Status§r',
        parentPanelId: 'mainPanel',
        items: [
            {
                id: 'viewStatus',
                text: 'View Server Info',
                icon: 'textures/ui/icon_setting.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showStatus',
            },
        ],
    },
    playerListPanel: {
        title: '§lSelect a Player§r',
        parentPanelId: 'mainPanel',
        items: [], // This will be populated dynamically by uiManager
    },
    playerManagementPanel: {
        title: '§lActions for {playerName}§r',
        parentPanelId: 'playerListPanel',
        items: [
            {
                id: 'kickPlayer',
                text: 'Kick Player',
                icon: 'textures/ui/hammer_l.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showKickForm', // This will correspond to a function in the new uiManager
            },
            {
                id: 'mutePlayer',
                text: 'Mute Player',
                icon: 'textures/ui/mute_l.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showMuteForm', // This will correspond to a function in the new uiManager
            },
            // We can add Ban, Vanish, etc. buttons here later.
        ],
    },
};
