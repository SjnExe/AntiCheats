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
        title: '§l§3Panel§r',
        parentPanelId: null,
        items: [
            {
                id: 'playerManagement',
                text: '§cPlayer Management',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'playerListPanel'
            },
            {
                id: 'publicPlayerList',
                text: '§2View Players',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'publicPlayerListPanel'
            },
            {
                id: 'reportManagement',
                text: '§cReport Management',
                icon: 'textures/ui/WarningGlyph',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'reportListPanel'
            },
            {
                id: 'moderation',
                text: '§cModeration',
                icon: 'textures/ui/hammer_l.png',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'moderationPanel'
            },
            {
                id: 'testPanel',
                text: '§eTest Panel',
                icon: 'textures/ui/icon_setting',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'testPanel'
            },
            {
                id: 'bountyList',
                text: '§cBounty List',
                icon: 'textures/items/netherite_sword.png',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'bountyListPanel'
            },
            {
                id: 'rules',
                text: '§eRules',
                icon: 'textures/items/book_enchanted.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showRules'
            },
            {
                id: 'myStats',
                text: '§3My Stats',
                icon: 'textures/ui/profile_glyph_color.png',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'myStatsPanel'
            },
            {
                id: 'helpfulLinks',
                text: '§9Helpful Links',
                icon: 'textures/items/chain',
                permissionLevel: 1024,
                actionType: 'openPanel',
                actionValue: 'helpfulLinksPanel'
            }
        ]
    },
    publicPlayerListPanel: {
        title: '§l§2Online Players§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    playerListPanel: {
        title: '§l§dSelect a Player§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    playerManagementPanel: {
        title: '§l§cActions for {playerName}§r',
        parentPanelId: 'playerListPanel',
        items: [
            {
                id: 'teleportToPlayer',
                text: '§8Teleport to Player',
                icon: 'textures/ui/flyingascend.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'teleportTo'
            },
            {
                id: 'teleportPlayerHere',
                text: '§8Teleport Player Here',
                icon: 'textures/ui/flyingdescend.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'teleportHere'
            },
            {
                id: 'freezePlayer',
                text: '§eFreeze Player',
                icon: 'textures/ui/lock_color.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'toggleFreeze'
            },
            {
                id: 'mutePlayer',
                text: '§eMute Player',
                icon: 'textures/ui/mute_on.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showMuteForm'
            },
            {
                id: 'unmutePlayer',
                text: '§2Unmute Player',
                icon: 'textures/ui/mute_off.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showUnmuteForm'
            },
            {
                id: 'kickPlayer',
                text: '§cKick Player',
                icon: 'textures/ui/icon_import.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showKickForm'
            },
            {
                id: 'clearInventory',
                text: '§cClear Inventory',
                icon: 'textures/ui/trash',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'clearInventory'
            },
            {
                id: 'banPlayer',
                text: '§cBan Player',
                icon: 'textures/ui/hammer_l.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showBanForm'
            }
        ]
    },
    publicPlayerActionsPanel: {
        title: '§l§2Actions for {playerName}§r',
        parentPanelId: 'publicPlayerListPanel',
        items: [
            {
                id: 'sendTpaRequest',
                text: '§3Send TPA Request',
                icon: 'textures/ui/upload_glyph_color',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'sendTpaRequest'
            },
            {
                id: 'payPlayer',
                text: '§2Pay Player',
                icon: 'textures/items/emerald.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showPayForm'
            },
            {
                id: 'setBounty',
                text: '§cSet Bounty',
                icon: 'textures/items/iron_sword.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showBountyForm'
            },
            {
                id: 'reduceBounty',
                text: '§cReduce Bounty',
                icon: 'textures/items/gold_ingot.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showReduceBountyForm'
            },
            {
                id: 'reportPlayer',
                text: '§cReport Player',
                icon: 'textures/ui/chat_send.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showReportForm'
            }
        ]
    },
    bountyActionsPanel: {
        title: '§l§cBounty Actions for {playerName}§r',
        parentPanelId: 'bountyListPanel',
        items: [
            {
                id: 'addBounty',
                text: '§cAdd to Bounty',
                icon: 'textures/items/iron_sword.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showBountyForm'
            },
            {
                id: 'reduceBountyFromList',
                text: '§cReduce Bounty',
                icon: 'textures/items/gold_ingot.png',
                permissionLevel: 1024,
                actionType: 'functionCall',
                actionValue: 'showReduceBountyForm'
            }
        ]
    },
    reportListPanel: {
        title: '§l§4Active Reports§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    reportActionsPanel: {
        title: '§l§4Report Details§r',
        parentPanelId: 'reportListPanel',
        items: [
            {
                id: 'assignReport',
                text: '§eAssign to Me',
                icon: 'textures/ui/mine.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'assignReport'
            },
            {
                id: 'resolveReport',
                text: '§2Mark as Resolved',
                icon: 'textures/ui/check.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'resolveReport'
            },
            {
                id: 'clearReport',
                text: '§cClear Report',
                icon: 'textures/ui/trash.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'clearReport'
            }
        ]
    },
    bountyListPanel: {
        title: '§l§cBounty List§r',
        parentPanelId: 'mainPanel',
        items: [] // This will be populated dynamically by uiManager
    },
    myStatsPanel: {
        title: '§l§3Your Stats§r',
        parentPanelId: 'mainPanel',
        items: [] // Body is dynamically generated
    },
    helpfulLinksPanel: {
        title: '§l§9Helpful Links§r',
        parentPanelId: 'mainPanel',
        items: [] // Body is dynamically generated
    },
    moderationPanel: {
        title: '§l§cModeration Tools§r',
        parentPanelId: 'mainPanel',
        items: [
            {
                id: 'unbanPlayer',
                text: '§2Unban Player',
                icon: 'textures/ui/check.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showUnbanForm'
            }
        ]
    },
    testPanel: {
        title: '§l§eTest Panel§r',
        parentPanelId: 'mainPanel',
        items: [
            {
                id: 'testMessage',
                text: '§aShow a Test Message',
                icon: 'textures/ui/chat_send.png',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showTestMessage'
            },
            {
                id: 'openSubPanel',
                text: '§6Open Sub-Panel',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'testSubPanel'
            },
            {
                id: 'testPlayerList',
                text: '§bTest Player List',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'testPlayerListPanel'
            },
            {
                id: 'testAction',
                text: '§dTest Action',
                icon: 'textures/ui/check',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'showTestSuccessMessage'
            },
            {
                id: 'testPlayerListDirect',
                text: '§aTest List (Direct Call)',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'testPlayerList_Direct'
            },
            {
                id: 'testPlayerListCommand',
                text: '§bTest List (Command Call)',
                icon: 'textures/ui/icon_multiplayer',
                permissionLevel: 1,
                actionType: 'openPanel',
                actionValue: 'testPlayerList_Command'
            }
        ]
    },
    testPlayerListDirect: {
        title: '§l§aTest List (Direct)§r',
        parentPanelId: 'testPanel',
        items: [] // Dynamic
    },
    testPlayerListCommand: {
        title: '§l§bTest List (Command)§r',
        parentPanelId: 'testPanel',
        items: [] // Dynamic
    },
    testActionPanelDirect: {
        title: '§l§aActions for {playerName}§r',
        parentPanelId: 'testPlayerListDirect',
        items: [
            {
                id: 'clearInventoryDirect',
                text: '§cClear Inventory (Direct)',
                icon: 'textures/ui/trash',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'clearInventory'
            }
        ]
    },
    testActionPanelCommand: {
        title: '§l§bActions for {playerName}§r',
        parentPanelId: 'testPlayerListCommand',
        items: [
            {
                id: 'clearInventoryCommand',
                text: '§cClear Inventory (Command)',
                icon: 'textures/ui/trash',
                permissionLevel: 1,
                actionType: 'functionCall',
                actionValue: 'clearInventory_command'
            }
        ]
    },
    testSubPanel: {
        title: '§l§6Test Sub-Panel§r',
        parentPanelId: 'testPanel',
        items: [
            {
                id: 'subPanelMessage',
                text: '§3This is a sub-panel! (No Action)',
                permissionLevel: 1
            }
        ]
    },
    testPlayerListPanel: {
        title: '§l§bTest Player List§r',
        parentPanelId: 'testPanel',
        items: [] // This will be populated dynamically by uiManager
    }
};
