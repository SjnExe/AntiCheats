import * as mc from '@minecraft/server';

/**
 * Placeholder for block hardness data.
 * In a real scenario, this would be a comprehensive map.
 * Key: blockTypeId (e.g., "minecraft:stone")
 * Value: hardness (number)
 */
const BLOCK_HARDNESS = {
    "minecraft:stone": 1.5,
    "minecraft:cobblestone": 2.0,
    "minecraft:dirt": 0.5,
    "minecraft:grass_block": 0.6,
    "minecraft:sand": 0.5,
    "minecraft:gravel": 0.6,
    "minecraft:oak_log": 2.0,
    "minecraft:oak_planks": 2.0, // Actually 2.0 for axe, 3.0 for hand - this simplified model might need refinement
    "minecraft:obsidian": 50.0,
    // ... add more common blocks
};

/**
 * Placeholder for tool material multipliers.
 * Key: material (e.g., "wooden", "stone")
 * Value: speed multiplier
 */
const TOOL_MATERIAL_MULTIPLIERS = {
    "wooden": 2,
    "stone": 4,
    "iron": 6,
    "diamond": 8,
    "golden": 12, // Golden tools are fast but have low durability
    "netherite": 9
};

/**
 * Placeholder for correct tool type for block categories.
 * Key: block category (e.g., "stone", "wood", "dirt") - this needs a mapping from blockId to category.
 * Value: tool type (e.g., "pickaxe", "axe", "shovel")
 */
const CORRECT_TOOL_FOR_BLOCK_TYPE = {
    "minecraft:stone": "pickaxe",
    "minecraft:cobblestone": "pickaxe",
    "minecraft:iron_ore": "pickaxe",
    "minecraft:diamond_ore": "pickaxe",
    "minecraft:oak_log": "axe",
    "minecraft:oak_planks": "axe",
    "minecraft:dirt": "shovel",
    "minecraft:grass_block": "shovel",
    "minecraft:sand": "shovel",
    "minecraft:gravel": "shovel",
    "minecraft:wool": "shears", // Example for shears
    // ... This mapping from blockId to preferred tool type is crucial.
};

/**
 * Determines the general type of a tool from its itemTypeId.
 * @param {string} itemTypeId
 * @returns {string|null} e.g., "pickaxe", "axe", "shovel", or null
 */
function getToolType(itemTypeId) {
    if (itemTypeId.includes("_pickaxe")) return "pickaxe";
    if (itemTypeId.includes("_axe")) return "axe";
    if (itemTypeId.includes("_shovel")) return "shovel";
    if (itemTypeId.includes("_hoe")) return "hoe"; // Hoes are tools but not typically for speed-breaking general blocks
    if (itemTypeId === "minecraft:shears") return "shears";
    if (itemTypeId.includes("_sword")) return "sword"; // Swords can break some blocks (e.g., cobweb) faster
    return null;
}

/**
 * Determines the material of a tool from its itemTypeId.
 * @param {string} itemTypeId
 * @returns {string|null} e.g., "wooden", "stone", "iron", "golden", "diamond", "netherite", or null
 */
function getToolMaterial(itemTypeId) {
    if (itemTypeId.startsWith("minecraft:wooden_")) return "wooden";
    if (itemTypeId.startsWith("minecraft:stone_")) return "stone";
    if (itemTypeId.startsWith("minecraft:iron_")) return "iron";
    if (itemTypeId.startsWith("minecraft:golden_")) return "golden";
    if (itemTypeId.startsWith("minecraft:diamond_")) return "diamond";
    if (itemTypeId.startsWith("minecraft:netherite_")) return "netherite";
    return null;
}

/**
 * Calculates the speed at which a player can break a given block with a given item.
 * This is a simplified model. Vanilla mechanics are more complex.
 * @param {mc.Player} player The player breaking the block.
 * @param {mc.BlockPermutation} blockPermutation The permutation of the block being broken.
 * @param {mc.ItemStack | null} itemStack The item used to break the block (if any).
 * @returns {number} Breaking speed/score. Higher is faster. Returns 0 if cannot break or very slow.
 */
export function getBlockBreakingSpeed(player, blockPermutation, itemStack) {
    const blockTypeId = blockPermutation.type.id;
    const blockHardness = BLOCK_HARDNESS[blockTypeId] || 50; // Default to high hardness if not in map

    if (!itemStack) { // Breaking by hand
        return 1 / (blockHardness * 1.5 * 0.2); // Base speed / (hardness * time_to_break_stone_by_hand_penalty * ticks_per_sec_approx)
    }

    const itemTypeId = itemStack.typeId;
    const toolType = getToolType(itemTypeId);
    const toolMaterial = getToolMaterial(itemTypeId);

    let speed = TOOL_MATERIAL_MULTIPLIERS[toolMaterial] || 1; // Base speed from material
    let canHarvest = false;
    let correctToolMultiplier = 1;

    const requiredTool = CORRECT_TOOL_FOR_BLOCK_TYPE[blockTypeId];
    if (requiredTool && toolType === requiredTool) {
        correctToolMultiplier = 1.5; // Using correct tool gives a bonus
        canHarvest = true; // Simplified harvest logic
    } else if (!requiredTool) { // Block doesn't require a specific tool (e.g. dirt by hand)
        canHarvest = true;
    }

    // If wrong tool or no tool for a block that needs one, speed is much lower
    if (requiredTool && toolType !== requiredTool && toolType !== null) { // Has a tool, but it's the wrong kind
        speed = 1; // Penalty for wrong tool
        correctToolMultiplier = 1;
    } else if (toolType === null && requiredTool) { // Breaking by hand a block that needs a tool
         return 1 / (blockHardness * 5 * 0.2); // Significantly slower
    }


    let efficiencyLevel = 0;
    try {
        const enchantComp = itemStack.getComponent(mc.ItemComponentTypes.Enchantable);
        if (enchantComp) {
            const efficiency = enchantComp.getEnchantment("efficiency");
            if (efficiency) {
                efficiencyLevel = efficiency.level;
            }
        }
    } catch (e) { /* item might not have enchantable component */ }

    if (efficiencyLevel > 0) {
        speed += (efficiencyLevel * efficiencyLevel + 1);
    }

    // Haste effect
    const hasteEffect = player.getEffects().find(eff => eff.typeId === "haste");
    if (hasteEffect) {
        speed *= (1 + 0.2 * (hasteEffect.amplifier + 1));
    }
    // Mining Fatigue effect
    const fatigueEffect = player.getEffects().find(eff => eff.typeId === "mining_fatigue");
    if (fatigueEffect) {
        speed *= Math.pow(0.3, fatigueEffect.amplifier + 1);
    }

    // If player is not on ground, speed is 5x slower
    if (!player.isOnGround) {
        speed /= 5;
    }

    // If in water and not Aqua Affinity, speed is 5x slower
    // TODO: Check for Aqua Affinity helmet enchantment

    const damage = speed * correctToolMultiplier / blockHardness;
    if (damage < 0) return 0; // Should not happen

    // This 'damage' is how much "progress" is made per tick (approx). Time = 1 / damage (if damage is per tick)
    // Or, if we want a "speed score" (higher is better), this is it.
    return damage * 20; // Convert to an approximate "score per second"
}


/**
 * Finds the optimal tool in the player's hotbar for breaking a given block.
 * @param {mc.Player} player The player.
 * @param {mc.BlockPermutation} blockPermutation The permutation of the block to be broken.
 * @returns {{ slotIndex: number, itemStack: mc.ItemStack | undefined, speed: number } | null} Info about the optimal tool, or null if no suitable tool.
 */
export function getOptimalToolForBlock(player, blockPermutation) {
    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
    if (!inventory || !inventory.container) return null;

    let bestSlot = -1;
    let maxSpeed = 0;
    let bestToolStack = undefined;

    for (let i = 0; i < 9; i++) { // Iterate through hotbar slots 0-8
        const itemStack = inventory.container.getItem(i);
        const currentSpeed = getBlockBreakingSpeed(player, blockPermutation, itemStack); // itemStack can be undefined here

        if (currentSpeed > maxSpeed) {
            maxSpeed = currentSpeed;
            bestSlot = i;
            bestToolStack = itemStack; // This will be undefined if breaking by hand is fastest
        }
    }

    // If maxSpeed is still very low (e.g. hand breaking stone), it's not really an "optimal tool" situation.
    // However, autotool might still switch to hand if hand is faster than a totally wrong tool.
    // The check needs to determine if a *switch* to this bestSlot provides a significant advantage.

    if (bestSlot !== -1 && maxSpeed > 0) { // maxSpeed > 0 ensures it can actually break the block
        return { slotIndex: bestSlot, itemStack: bestToolStack, speed: maxSpeed };
    }
    return null;
}
