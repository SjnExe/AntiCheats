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
                actionValue: 'playerListPanel'
            },
            {
                id: 'publicPlayerList',
                text: 'View Players',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'publicPlayerListPanel'
            },
            {
                id: 'rules',
                text: 'Rules',
                icon: 'textures/items/book_enchanted.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showRules'
            },
            {
                id: 'myStats',
                text: 'My Stats',
                icon: 'textures/ui/icon_setting.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showMyStats'
            },
            {
                id: 'helpfulLinks',
                text: 'Helpful Links',
                icon: 'textures/ui/book_writable',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showHelpfulLinks'
            }
        ]
    },
    publicPlayerListPanel: {
        title: '§lOnline Players§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    playerListPanel: {
        title: '§lSelect a Player§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    playerManagementPanel: {
        title: '§lActions for {playerName}§r',
        parentPanelId: 'playerListPanel',
        items: [
            {
                id: 'banPlayer',
                text: 'Ban',
                icon: 'textures/ui/hammer_l.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showBanForm'
            },
            {
                id: 'kickPlayer',
                text: 'Kick',
                icon: 'textures/ui/icon_import.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showKickForm'
            },
            {
                id: 'mutePlayer',
                text: 'Mute',
                icon: 'textures/ui/mute_on.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showMuteForm'
            },
            {
                id: 'unmutePlayer',
                text: 'Unmute',
                icon: 'textures/ui/mute_off.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showUnmuteForm'
            },
            {
                id: 'freezePlayer',
                text: 'Freeze',
                icon: 'textures/ui/lock_color.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'toggleFreeze'
            },
            {
                id: 'clearInventory',
                text: 'Clear Inventory',
                icon: 'textures/ui/trash',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'clearInventory'
            },
            {
                id: 'teleportToPlayer',
                text: 'Teleport to Player',
                icon: 'textures/ui/flyingascend.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'teleportTo'
            },
            {
                id: 'teleportPlayerHere',
                text: 'Teleport Player Here',
                icon: 'textures/ui/flyingdescend.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'teleportHere'
            }
        ]
    }
};
