/**
 * @typedef {object} KitItem
 * @property {string} itemId
 * @property {number} amount
 * @property {string} [nameTag]
 * @property {string[]} [lore]
 */

/**
 * @typedef {object} Kit
 * @property {string} name
 * @property {string} description
 * @property {number} cooldown - in seconds
 * @property {KitItem[]} items
 */

/** @type {Record<string, Kit>} */
export const kits = {
    starter: {
        name: 'Starter',
        description: 'A basic kit to get you started.',
        cooldown: 86400, // 24 hours
        items: [
            { itemId: 'minecraft:stone_sword', amount: 1 },
            { itemId: 'minecraft:stone_pickaxe', amount: 1 },
            { itemId: 'minecraft:stone_axe', amount: 1 },
            { itemId: 'minecraft:stone_shovel', amount: 1 },
            { itemId: 'minecraft:bread', amount: 16 },
        ],
    },
    daily: {
        name: 'Daily',
        description: 'A small reward for playing daily.',
        cooldown: 86400, // 24 hours
        items: [
            { itemId: 'minecraft:iron_ingot', amount: 2 },
            { itemId: 'minecraft:gold_ingot', amount: 1 },
        ],
    },
};
