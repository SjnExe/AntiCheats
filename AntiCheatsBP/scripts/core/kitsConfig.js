/**
 * @typedef {object} KitItem
 * @property {string} typeId The Minecraft item ID (e.g., 'minecraft:iron_sword').
 * @property {number} amount The number of items to give.
 * @property {string} [nameTag] An optional custom name for the item.
 * @property {string[]} [lore] Optional lore text for the item.
 */

/**
 * @typedef {object} Kit
 * @property {string} description A brief description of the kit.
 * @property {number} cooldownSeconds The cooldown in seconds before the kit can be claimed again.
 * @property {KitItem[]} items An array of items included in the kit.
 */

/**
 * @type {Object.<string, Kit>}
 */
export const kits = {
    starter: {
        description: 'A basic kit to get you started.',
        cooldownSeconds: 3600, // 1 hour
        items: [
            { typeId: 'minecraft:stone_sword', amount: 1 },
            { typeId: 'minecraft:stone_pickaxe', amount: 1 },
            { typeId: 'minecraft:stone_axe', amount: 1 },
            { typeId: 'minecraft:stone_shovel', amount: 1 },
            { typeId: 'minecraft:bread', amount: 16 },
        ],
    },
    food: {
        description: 'A simple food refill.',
        cooldownSeconds: 900, // 15 minutes
        items: [
            { typeId: 'minecraft:cooked_beef', amount: 8 },
        ],
    },
    // Add more kits here in the future
};
