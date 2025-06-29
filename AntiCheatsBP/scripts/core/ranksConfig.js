/**
 * @file Configuration for all server ranks, their properties, and conditions.
 */

/**
 * @typedef {object} ChatFormatting
 * @property {string} [prefixText] - The text part of the rank prefix.
 * @property {string} [prefixColor] - Minecraft color code for the prefix text.
 * @property {string} [nameColor] - Minecraft color code for the player's name.
 * @property {string} [messageColor] - Minecraft color code for the player's chat message.
 */

/**
 * @typedef {object} RankCondition
 * @property {('owner_name'|'admin_tag'|'manual_tag_prefix'|'tag'|'default')} type - The type of condition.
 * @property {string} [prefix] - Required if type is 'manual_tag_prefix'. The prefix for the rank tag.
 * @property {string} [tag] - Required if type is 'tag'. The specific tag to check for.
 */

/**
 * @typedef {object} RankDefinition
 * @property {string} id - Unique identifier for the rank (e.g., 'owner', 'admin', 'vip').
 * @property {string} name - Display name for the rank (e.g., "Owner", "Administrator").
 * @property {number} permissionLevel - Numeric permission level associated with this rank. Lower is higher privilege.
 * @property {ChatFormatting} [chatFormatting] - Optional chat formatting overrides for this rank.
 * @property {string} [nametagPrefix] - Optional nametag prefix override for this rank.
 * @property {RankCondition[]} conditions - An array of conditions that a player must meet to be assigned this rank.
 * @property {number} priority - Determines which rank applies if a player meets conditions for multiple ranks (lower number = higher priority).
 * @property {number} [assignableBy] - Optional. The permission level required to assign/remove this rank via commands.
 */

/**
 * Default chat formatting for players who don't match any specific rank
 * or for ranks that don't override all formatting options.
 * @type {ChatFormatting}
 */
export const defaultChatFormatting = {
    prefixText: '§7[Member] ',
    prefixColor: '§7',
    nameColor: '§7',
    messageColor: '§f',
};

/**
 * Default nametag prefix for players.
 * @type {string}
 */
export const defaultNametagPrefix = '§7Member§f\n';

/**
 * Default permission level for players not matching any rank with specific conditions.
 * This numeric value should correspond to a "default" or "member" rank defined below.
 * @type {number}
 */
export const defaultPermissionLevel = 1024;

/**
 * Array of all rank definitions for the server.
 * Order by priority in `rankManager.js` if not inherently sorted here.
 * @type {RankDefinition[]}
 */
export const rankDefinitions = [
    {
        id: 'owner',
        name: 'Owner',
        permissionLevel: 0,
        chatFormatting: {
            prefixText: '§c[Owner] ',
            prefixColor: '§c',
            nameColor: '§c',
            messageColor: '§f',
        },
        nametagPrefix: '§cOwner§f\n',
        conditions: [
            { type: 'owner_name' },
        ],
        priority: 0, // Highest priority
    },
    {
        id: 'admin',
        name: 'Admin',
        permissionLevel: 1,
        chatFormatting: {
            prefixText: '§b[Admin] ',
            prefixColor: '§b',
            nameColor: '§b',
            messageColor: '§f',
        },
        nametagPrefix: '§bAdmin§f\n',
        conditions: [
            { type: 'admin_tag' },
        ],
        priority: 10,
        assignableBy: 0,
    },
    {
        id: 'member', // Default/Fallback rank
        name: 'Member',
        permissionLevel: 1024,
        chatFormatting: {
            prefixText: '§7[Member] ',
            prefixColor: '§7',
            nameColor: '§7',
            messageColor: '§f',
        },
        nametagPrefix: '§7Member§f\n',
        conditions: [
            { type: 'default' },
        ],
        priority: 1000, // Lowest priority (higher number)
    },
];
