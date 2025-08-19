/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText='']
 * @property {string} [nameColor='§7']
 * @property {string} [messageColor='§f']
 */

/**
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'default')} type
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id
 * @property {string} name
 * @property {number} permissionLevel
 * @property {ChatFormatting} [chatFormatting]
 * @property {string} [nametagPrefix]
 * @property {RankCondition[]} conditions
 */

/** @type {Required<ChatFormatting>} */
export const defaultChatFormatting = {
    prefixText: '§8[§fMember§8] ',
    nameColor: '§f',
    messageColor: '§7',
};

/** @type {string} */
export const defaultNametagPrefix = '§fMember §f\n';

/** @type {number} */
export const defaultPermissionLevel = 1024;

/** @type {RankDefinition[]} */
export const rankDefinitions = [
    {
        id: 'owner',
        name: 'Owner',
        permissionLevel: 0,
        chatFormatting: {
            prefixText: '§8[§4Owner§8] ',
            nameColor: '§4',
            messageColor: '§6',
        },
        nametagPrefix: '§4Owner §f\n',
        conditions: [
            { type: 'ownerName' },
        ],
    },
    {
        id: 'admin',
        name: 'Admin',
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§8[§cAdmin§8] ',
            nameColor: '§c',
            messageColor: '§f',
        },
        nametagPrefix: '§cAdmin §f\n',
        conditions: [
            { type: 'adminTag' },
        ],
    },
    {
        id: 'member',
        name: 'Member',
        permissionLevel: defaultPermissionLevel,
        chatFormatting: defaultChatFormatting,
        nametagPrefix: defaultNametagPrefix,
        conditions: [
            { type: 'default' },
        ],
    },
];
