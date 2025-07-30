/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText=''] The text part of the rank prefix.
 * @property {string} [nameColor='§7'] The color code for the player's name.
 * @property {string} [messageColor='§f'] The color code for the player's chat message.
 */

/**
 * @typedef {object} RankCondition
 * @property {('ownerName'|'adminTag'|'manualTagPrefix'|'tag'|'default')} type The type of condition.
 * @property {string} [prefix] The prefix for the rank tag (for 'manualTagPrefix').
 * @property {string} [tag] The specific tag to check for (for 'tag').
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id Unique identifier for the rank.
 * @property {string} name Display name for the rank.
 * @property {number} permissionLevel Numeric permission level (lower is higher).
 * @property {ChatFormatting} [chatFormatting] Optional chat formatting overrides.
 * @property {string} [nametagPrefix] Optional nametag prefix override.
 * @property {RankCondition[]} conditions Conditions for this rank.
 * @property {number} [assignableBy] Permission level required to assign/remove this rank.
 */

/**
 * Default chat formatting.
 * @type {Required<ChatFormatting>}
 */
export const defaultChatFormatting = {
    prefixText: '§8[§7Member§8] ',
    nameColor: '§7',
    messageColor: '§f',
};

/**
 * Default nametag prefix.
 * @type {string}
 */
export const defaultNametagPrefix = '§7Member §f\n';

/**
 * Default permission level for players not matching any specific rank.
 * Convention: Higher number = less privilege.
 * @type {number}
 */
export const defaultPermissionLevel = 1024;

/**
 * Array of all rank definitions.
 * @type {RankDefinition[]}
 */
export const rankDefinitions = [
    {
        id: 'owner',
        name: 'Owner',
        priority: 0,
        permissionLevel: 0,
        chatFormatting: {
            prefixText: '§8[§cOwner§8] ',
            nameColor: '§c',
            messageColor: '§f',
        },
        nametagPrefix: '§cOwner §f\n',
        conditions: [
            { type: 'ownerName' },
        ],
    },
    {
        id: 'admin',
        name: 'Admin',
        priority: 10,
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§8[§bAdmin§8] ',
            nameColor: '§b',
            messageColor: '§f',
        },
        nametagPrefix: '§bAdmin §f\n',
        conditions: [
            { type: 'adminTag' },
        ],
        assignableBy: 0,
    },
    {
        id: 'member',
        name: 'Member',
        priority: 1000,
        permissionLevel: defaultPermissionLevel,
        chatFormatting: defaultChatFormatting,
        nametagPrefix: defaultNametagPrefix,
        conditions: [
            { type: 'default' },
        ],
    },
];
