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
    "minecraft:iron_ore": 3.0, "minecraft:deepslate_iron_ore": 4.5,
    "minecraft:gold_ore": 3.0, "minecraft:deepslate_gold_ore": 4.5,
    "minecraft:diamond_ore": 3.0, "minecraft:deepslate_diamond_ore": 4.5,
    "minecraft:emerald_ore": 3.0, "minecraft:deepslate_emerald_ore": 4.5,
    "minecraft:lapis_ore": 3.0, "minecraft:deepslate_lapis_ore": 4.5,
    "minecraft:coal_ore": 3.0, "minecraft:deepslate_coal_ore": 4.5,
    "minecraft:nether_gold_ore": 3.0, "minecraft:nether_quartz_ore": 3.0,
    "minecraft:ancient_debris": 30.0,
    "minecraft:spruce_log": 2.0, "minecraft:birch_log": 2.0, "minecraft:jungle_log": 2.0, "minecraft:acacia_log": 2.0, "minecraft:dark_oak_log": 2.0, "minecraft:mangrove_log": 2.0, "minecraft:cherry_log": 2.0, "minecraft:warped_stem": 2.0, "minecraft:crimson_stem": 2.0,
    "minecraft:spruce_planks": 2.0, "minecraft:birch_planks": 2.0, "minecraft:jungle_planks": 2.0, "minecraft:acacia_planks": 2.0, "minecraft:dark_oak_planks": 2.0, "minecraft:mangrove_planks": 2.0, "minecraft:cherry_planks": 2.0, "minecraft:warped_planks": 2.0, "minecraft:crimson_planks": 2.0,
    "minecraft:sandstone": 0.8, "minecraft:glass": 0.3,
    "minecraft:cobweb": 4.0, // Special case, sword is best
    "minecraft:glowstone": 0.3,
    "minecraft:ice": 0.5, "minecraft:packed_ice": 0.5, "minecraft:blue_ice": 2.8,
    "minecraft:netherite_block": 50.0, "minecraft:iron_block": 5.0, "minecraft:gold_block": 3.0, "minecraft:diamond_block": 5.0, "minecraft:emerald_block": 5.0,
    "minecraft:chest": 2.5, "minecraft:crafting_table": 2.5, "minecraft:furnace": 3.5,
    "minecraft:farmland": 0.6, "minecraft:soul_sand": 0.5, "minecraft:soul_soil": 0.5,
    "minecraft:leaves": 0.2, "minecraft:oak_leaves": 0.2, "minecraft:spruce_leaves": 0.2, "minecraft:birch_leaves": 0.2, "minecraft:jungle_leaves": 0.2, "minecraft:acacia_leaves": 0.2, "minecraft:dark_oak_leaves": 0.2, "minecraft:mangrove_leaves": 0.2, "minecraft:cherry_leaves": 0.2, "minecraft:azalea_leaves": 0.2,
    "minecraft:wool": 0.8,
    "minecraft:vine": 0.2,
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
    "minecraft:deepslate_iron_ore": "pickaxe", "minecraft:deepslate_gold_ore": "pickaxe",
    "minecraft:deepslate_diamond_ore": "pickaxe", "minecraft:deepslate_emerald_ore": "pickaxe",
    "minecraft:deepslate_lapis_ore": "pickaxe", "minecraft:deepslate_coal_ore": "pickaxe",
    "minecraft:nether_gold_ore": "pickaxe", "minecraft:nether_quartz_ore": "pickaxe",
    "minecraft:ancient_debris": "pickaxe",
    "minecraft:oak_log": "axe", "minecraft:spruce_log": "axe", "minecraft:birch_log": "axe", "minecraft:jungle_log": "axe", "minecraft:acacia_log": "axe", "minecraft:dark_oak_log": "axe", "minecraft:mangrove_log": "axe", "minecraft:cherry_log": "axe", "minecraft:warped_stem": "axe", "minecraft:crimson_stem": "axe",
    "minecraft:oak_planks": "axe", "minecraft:spruce_planks": "axe", "minecraft:birch_planks": "axe", "minecraft:jungle_planks": "axe", "minecraft:acacia_planks": "axe", "minecraft:dark_oak_planks": "axe", "minecraft:mangrove_planks": "axe", "minecraft:cherry_planks": "axe", "minecraft:warped_planks": "axe", "minecraft:crimson_planks": "axe",
    "minecraft:dirt": "shovel",
    "minecraft:grass_block": "shovel",
    "minecraft:sand": "shovel",
    "minecraft:gravel": "shovel",
    "minecraft:sandstone": "pickaxe", "minecraft:glass": "pickaxe",
    "minecraft:cobweb": "sword", // Or shears
    "minecraft:glowstone": "pickaxe",
    "minecraft:ice": "pickaxe", "minecraft:packed_ice": "pickaxe", "minecraft:blue_ice": "pickaxe",
    "minecraft:netherite_block": "pickaxe", "minecraft:iron_block": "pickaxe", "minecraft:gold_block": "pickaxe", "minecraft:diamond_block": "pickaxe", "minecraft:emerald_block": "pickaxe",
    "minecraft:chest": "axe", "minecraft:crafting_table": "axe", "minecraft:furnace": "pickaxe",
    "minecraft:farmland": "shovel", "minecraft:soul_sand": "shovel", "minecraft:soul_soil": "shovel",
    "minecraft:wool": "shears",
    "minecraft:leaves": "shears", "minecraft:oak_leaves": "shears", "minecraft:spruce_leaves": "shears", "minecraft:birch_leaves": "shears", "minecraft:jungle_leaves": "shears", "minecraft:acacia_leaves": "shears", "minecraft:dark_oak_leaves": "shears", "minecraft:mangrove_leaves": "shears", "minecraft:cherry_leaves": "shears", "minecraft:azalea_leaves": "shears",
    "minecraft:vine": "shears",
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
 * @returns {number} Breaking power score. Higher is more effective.
 */
export function calculateRelativeBlockBreakingPower(player, blockPermutation, itemStack) {
    const blockTypeId = blockPermutation.type.id;
    const blockHardness = BLOCK_HARDNESS[blockTypeId] || 50; // Default to high hardness if not in map

    if (!itemStack) { // Breaking by hand
        return 1 / (blockHardness * 1.5 * 0.2); // Base speed / (hardness * time_to_break_stone_by_hand_penalty * ticks_per_sec_approx)
    }

    const itemTypeId = itemStack.typeId;
    const toolType = getToolType(itemTypeId);
    const toolMaterial = getToolMaterial(itemTypeId);

    // Special handling for shears and swords on specific blocks
    if (toolType === "shears") {
        if (blockTypeId.includes("leaves") || blockTypeId.includes("wool") || blockTypeId === "minecraft:cobweb" || blockTypeId === "minecraft:vine") {
            return Infinity; // Shears are instant or near-instant for these
        }
    }
    if (toolType === "sword" && blockTypeId === "minecraft:cobweb") {
         // Swords are effective on cobwebs. Speed depends on material, but generally fast.
         // We return a high value, but not Infinity, to allow enchanted shears to be better.
         return (TOOL_MATERIAL_MULTIPLIERS[toolMaterial] || 1) * 5;
    }

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
 * @returns {{ slotIndex: number, itemStack: mc.ItemStack | undefined, speed: number } | null} Info about the optimal tool, or null if no suitable tool. Speed here is the power score.
 */
export function getOptimalToolForBlock(player, blockPermutation) {
    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
    if (!inventory || !inventory.container) return null;

    let bestSlot = -1;
    let maxPower = 0; // Renamed from maxSpeed to maxPower for clarity
    let bestToolStack = undefined;

    for (let i = 0; i < 9; i++) { // Iterate through hotbar slots 0-8
        const itemStack = inventory.container.getItem(i);
        const currentPower = calculateRelativeBlockBreakingPower(player, blockPermutation, itemStack); // itemStack can be undefined here

        if (currentPower > maxPower) {
            maxPower = currentPower;
            bestSlot = i;
            bestToolStack = itemStack; // This will be undefined if breaking by hand is fastest
        }
    }

    // If maxPower is still very low (e.g. hand breaking stone), it's not really an "optimal tool" situation.
    // However, autotool might still switch to hand if hand is faster than a totally wrong tool.
    // The check needs to determine if a *switch* to this bestSlot provides a significant advantage.

    if (bestSlot !== -1 && maxPower > 0) { // maxPower > 0 ensures it can actually break the block
        return { slotIndex: bestSlot, itemStack: bestToolStack, speed: maxPower }; // 'speed' property here refers to power score
    }
    return null;
}

/**
 * Calculates the expected time in game ticks to break a block.
 * This is a simplified model.
 * @param {mc.Player} player The player.
 * @param {mc.BlockPermutation} blockPermutation The block being broken.
 * @param {mc.ItemStack | null} itemStack The item used (if any).
 * @param {object} config The server configuration (not used in this simplified version yet, but good for future).
 * @returns {number} Expected ticks to break the block, or Infinity if unbreakable/very long.
 */
export function getExpectedBreakTicks(player, blockPermutation, itemStack, config) {
    const blockTypeId = blockPermutation.type.id;
    const blockHardness = BLOCK_HARDNESS[blockTypeId];

    if (blockHardness === undefined || blockHardness < 0) return Infinity; // Treat unknown or negative hardness as unbreakable
    if (blockHardness === 0) return 1; // Insta-break for 0 hardness (e.g. flowers)

    // Effectively unbreakable vanilla blocks (even if they have hardness values)
    if (config.instaBreakUnbreakableBlocks && config.instaBreakUnbreakableBlocks.includes(blockTypeId) && player.gameMode !== mc.GameMode.creative) {
        // Exception for specific tools on specific "normally unbreakable" blocks if ever needed, e.g. netherite pick on ancient_debris (already covered by hardness)
        // This list is more for blocks like bedrock, barriers.
        return Infinity;
    }


    let toolSpeed = 1; // Base speed (hand or non-tool)
    let isCorrectToolTypeAndMaterial = false;

    const requiredToolClass = CORRECT_TOOL_FOR_BLOCK_TYPE[blockTypeId]; // e.g., "pickaxe"

    if (itemStack) {
        const itemTypeId = itemStack.typeId;
        const toolType = getToolType(itemTypeId);
        const toolMaterial = getToolMaterial(itemTypeId);

        if (toolType && toolMaterial && TOOL_MATERIAL_MULTIPLIERS[toolMaterial]) {
            toolSpeed = TOOL_MATERIAL_MULTIPLIERS[toolMaterial];
            if (toolType === requiredToolClass) {
                isCorrectToolTypeAndMaterial = true;
            } else if (requiredToolClass) {
                // Has a tool, but it's the wrong kind for this block that needs a specific tool type
                toolSpeed = 1; // Penalty: acts like hand
            }
            // If no requiredToolClass, any tool is "fine" in terms of type, material speed applies.
        } else if (toolType === "shears" && (blockTypeId.includes("leaves") || blockTypeId.includes("wool") || blockTypeId === "minecraft:cobweb" || blockTypeId === "minecraft:vine")) {
            return 1; // Instant break for shears on appropriate blocks
        } else if (toolType === "sword" && blockTypeId === "minecraft:cobweb") {
            return 1; // Swords break cobwebs instantly
        } else {
            // Not a recognized tool or material, or not a special case like shears/sword on specific blocks.
            // If there was a required tool class and this isn't it (or no tool), it's like breaking by hand.
            toolSpeed = 1;
        }
    } else { // No itemStack (breaking by hand)
        isCorrectToolTypeAndMaterial = !requiredToolClass; // Correct if no tool is required
        toolSpeed = 1;
    }

    // Base time factor (Minecraft Wiki values for seconds)
    // If it's the correct tool type AND material for a block that requires a tool, factor is 1.5
    // Otherwise (wrong tool for required, or hand for required, or hand/any tool for no-tool-required), factor is 5.0
    // Base Time Factor and initial toolSpeed are determined first

    let efficiencyLevel = 0;
    if (itemStack) {
        try {
            const enchantComp = itemStack.getComponent(mc.ItemComponentTypes.Enchantable);
            if (enchantComp) {
                const eff = enchantComp.getEnchantment("efficiency");
                if (eff) efficiencyLevel = eff.level;
            }
        } catch(e) {}
    }

    if (efficiencyLevel > 0) {
        // Efficiency adds (level^2 + 1) to the "speed points" or effective tool speed value.
        toolSpeed += (efficiencyLevel * efficiencyLevel + 1);
    }

    // Ensure toolSpeed is at least 1, especially if it started as 1 (hand) and efficiency was added.
    // Or if a wrong tool penalty made it 1, efficiency can still apply.
    if (toolSpeed < 1 && isCorrectToolTypeAndMaterial) toolSpeed = 1; // Should not make a correct tool worse than hand.
    else if (toolSpeed < 1) toolSpeed = 1; // Hand speed is the minimum baseline.


    const baseTimeFactor = (isCorrectToolTypeAndMaterial) ? 1.5 : 5.0;
    let breakTimeSeconds = (blockHardness * baseTimeFactor) / toolSpeed;

    // Effects (Haste, Mining Fatigue)
    const effects = player.getEffects();
    const haste = effects.find(e => e.typeId === "haste");
    if (haste) {
        breakTimeSeconds /= (1 + 0.2 * (haste.amplifier + 1));
    }

    const fatigue = effects.find(e => e.typeId === "mining_fatigue");
    if (fatigue) {
        // Speed is multiplied by Math.pow(0.3, amplifier + 1) for each level of fatigue.
        // So, time is divided by that.
        breakTimeSeconds /= Math.pow(0.3, fatigue.amplifier + 1);
    }

    // Player conditions
    if (!player.isOnGround) {
        breakTimeSeconds *= 5;
    }

    // Aqua Affinity (simplified: if player has it and is in water, negate water penalty)
    // For simplicity, not checking specific armor piece, just if effect is common from it.
    const headArmor = player.getComponent(mc.EntityComponentTypes.Equippable)?.getEquipmentSlot(mc.EquipmentSlot.Head);
    let hasAquaAffinity = false;
    if (headArmor && headArmor.hasItem()) {
        try {
            const enchantComp = headArmor.getItem().getComponent(mc.ItemComponentTypes.Enchantable);
            if (enchantComp && enchantComp.getEnchantment("aqua_affinity")) {
                hasAquaAffinity = true;
            }
        } catch(e) {}
    }

    if (player.isInWater && !hasAquaAffinity) {
         breakTimeSeconds *= 5;
    }


    if (breakTimeSeconds < 0.05) breakTimeSeconds = 0.05; // Minimum break time in seconds (1 game tick)

    const ticks = Math.ceil(breakTimeSeconds * 20);
    return ticks < 1 ? 1 : ticks; // Ensure at least 1 tick
}
