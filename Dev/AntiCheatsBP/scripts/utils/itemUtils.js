/**
 * @file Provides server-side approximations of client-side game mechanics for anti-cheat checks.
 * @module AntiCheatsBP/scripts/utils/itemUtils
 * @description This module contains utility functions for item, block, and interaction calculations,
 * focusing on block breaking speeds and optimal tool determination. It uses simplified models
 * for game mechanics like block hardness and tool effectiveness, which may not be perfectly
 * accurate to in-game behavior. Regular updates are needed to align with new Minecraft releases.
 */
import * as mc from '@minecraft/server';

// Constants for calculations
const handBreakHardnessFactor1 = 1.5;
const handBreakHardnessFactor2 = 0.2;
const swordCobwebSpeedMultiplier = 5;
const incorrectToolPenaltyFactor = 5.0;
const correctToolTimeFactor = 1.5;
const incorrectToolTimeFactor = 5.0;
const hasteEffectMultiplierBase = 0.2;
const miningFatigueEffectPowerBase = 0.3;
const notOnGroundBreakSpeedPenalty = 5;
const inWaterNoAquaAffinityPenalty = 5;
const minBreakTimeSeconds = 0.05;
const ticksPerSecond = 20;
const defaultBlockHardness = 50.0;
const hotbarSize = 9;


const blockHardnessMap = {
    'minecraft:stone': 1.5,
    'minecraft:cobblestone': 2.0,
    'minecraft:dirt': 0.5,
    'minecraft:grass_block': 0.6,
    'minecraft:sand': 0.5,
    'minecraft:gravel': 0.6,
    'minecraft:oak_log': 2.0,
    'minecraft:oak_planks': 2.0,
    'minecraft:obsidian': 50.0,
    'minecraft:iron_ore': 3.0,
    'minecraft:deepslate_iron_ore': 4.5,
    'minecraft:gold_ore': 3.0,
    'minecraft:deepslate_gold_ore': 4.5,
    'minecraft:diamond_ore': 3.0,
    'minecraft:deepslate_diamond_ore': 4.5,
    'minecraft:emerald_ore': 3.0,
    'minecraft:deepslate_emerald_ore': 4.5,
    'minecraft:lapis_ore': 3.0,
    'minecraft:deepslate_lapis_ore': 4.5,
    'minecraft:coal_ore': 3.0,
    'minecraft:deepslate_coal_ore': 4.5,
    'minecraft:nether_gold_ore': 3.0,
    'minecraft:nether_quartz_ore': 3.0,
    'minecraft:ancient_debris': 30.0,
    'minecraft:spruce_log': 2.0,
    'minecraft:birch_log': 2.0,
    'minecraft:jungle_log': 2.0,
    'minecraft:acacia_log': 2.0,
    'minecraft:dark_oak_log': 2.0,
    'minecraft:mangrove_log': 2.0,
    'minecraft:cherry_log': 2.0,
    'minecraft:warped_stem': 2.0,
    'minecraft:crimson_stem': 2.0,
    'minecraft:spruce_planks': 2.0,
    'minecraft:birch_planks': 2.0,
    'minecraft:jungle_planks': 2.0,
    'minecraft:acacia_planks': 2.0,
    'minecraft:dark_oak_planks': 2.0,
    'minecraft:mangrove_planks': 2.0,
    'minecraft:cherry_planks': 2.0,
    'minecraft:warped_planks': 2.0,
    'minecraft:crimson_planks': 2.0,
    'minecraft:sandstone': 0.8,
    'minecraft:glass': 0.3,
    'minecraft:cobweb': 4.0,
    'minecraft:glowstone': 0.3,
    'minecraft:ice': 0.5,
    'minecraft:packed_ice': 0.5,
    'minecraft:blue_ice': 2.8,
    'minecraft:netherite_block': 50.0,
    'minecraft:iron_block': 5.0,
    'minecraft:gold_block': 3.0,
    'minecraft:diamond_block': 5.0,
    'minecraft:emerald_block': 5.0,
    'minecraft:chest': 2.5,
    'minecraft:crafting_table': 2.5,
    'minecraft:furnace': 3.5,
    'minecraft:farmland': 0.6,
    'minecraft:soul_sand': 0.5,
    'minecraft:soul_soil': 0.5,
    'minecraft:leaves': 0.2,
    'minecraft:oak_leaves': 0.2,
    'minecraft:spruce_leaves': 0.2,
    'minecraft:birch_leaves': 0.2,
    'minecraft:jungle_leaves': 0.2,
    'minecraft:acacia_leaves': 0.2,
    'minecraft:dark_oak_leaves': 0.2,
    'minecraft:mangrove_leaves': 0.2,
    'minecraft:cherry_leaves': 0.2,
    'minecraft:azalea_leaves': 0.2,
    'minecraft:wool': 0.8,
    'minecraft:vine': 0.2,
};

const toolMaterialMultipliersMap = {
    'wooden': 2,
    'stone': 4,
    'iron': 6,
    'diamond': 8,
    'golden': 12,
    'netherite': 9,
};

const correctToolForBlockMap = {
    'minecraft:stone': 'pickaxe',
    'minecraft:cobblestone': 'pickaxe',
    'minecraft:iron_ore': 'pickaxe',
    'minecraft:diamond_ore': 'pickaxe',
    'minecraft:deepslate_iron_ore': 'pickaxe',
    'minecraft:deepslate_gold_ore': 'pickaxe',
    'minecraft:deepslate_diamond_ore': 'pickaxe',
    'minecraft:deepslate_emerald_ore': 'pickaxe',
    'minecraft:deepslate_lapis_ore': 'pickaxe',
    'minecraft:deepslate_coal_ore': 'pickaxe',
    'minecraft:nether_gold_ore': 'pickaxe',
    'minecraft:nether_quartz_ore': 'pickaxe',
    'minecraft:ancient_debris': 'pickaxe',
    'minecraft:oak_log': 'axe',
    'minecraft:spruce_log': 'axe',
    'minecraft:birch_log': 'axe',
    'minecraft:jungle_log': 'axe',
    'minecraft:acacia_log': 'axe',
    'minecraft:dark_oak_log': 'axe',
    'minecraft:mangrove_log': 'axe',
    'minecraft:cherry_log': 'axe',
    'minecraft:warped_stem': 'axe',
    'minecraft:crimson_stem': 'axe',
    'minecraft:oak_planks': 'axe',
    'minecraft:spruce_planks': 'axe',
    'minecraft:birch_planks': 'axe',
    'minecraft:jungle_planks': 'axe',
    'minecraft:acacia_planks': 'axe',
    'minecraft:dark_oak_planks': 'axe',
    'minecraft:mangrove_planks': 'axe',
    'minecraft:cherry_planks': 'axe',
    'minecraft:warped_planks': 'axe',
    'minecraft:crimson_planks': 'axe',
    'minecraft:dirt': 'shovel',
    'minecraft:grass_block': 'shovel',
    'minecraft:sand': 'shovel',
    'minecraft:gravel': 'shovel',
    'minecraft:sandstone': 'pickaxe',
    'minecraft:glass': 'pickaxe',
    'minecraft:cobweb': 'sword',
    'minecraft:glowstone': 'pickaxe',
    'minecraft:ice': 'pickaxe',
    'minecraft:packed_ice': 'pickaxe',
    'minecraft:blue_ice': 'pickaxe',
    'minecraft:netherite_block': 'pickaxe',
    'minecraft:iron_block': 'pickaxe',
    'minecraft:gold_block': 'pickaxe',
    'minecraft:diamond_block': 'pickaxe',
    'minecraft:emerald_block': 'pickaxe',
    'minecraft:chest': 'axe',
    'minecraft:crafting_table': 'axe',
    'minecraft:furnace': 'pickaxe',
    'minecraft:farmland': 'shovel',
    'minecraft:soul_sand': 'shovel',
    'minecraft:soul_soil': 'shovel',
    'minecraft:wool': 'shears',
    'minecraft:leaves': 'shears',
    'minecraft:oak_leaves': 'shears',
    'minecraft:spruce_leaves': 'shears',
    'minecraft:birch_leaves': 'shears',
    'minecraft:jungle_leaves': 'shears',
    'minecraft:acacia_leaves': 'shears',
    'minecraft:dark_oak_leaves': 'shears',
    'minecraft:mangrove_leaves': 'shears',
    'minecraft:cherry_leaves': 'shears',
    'minecraft:azalea_leaves': 'shears',
    'minecraft:vine': 'shears',
};

/**
 * Gets the generic tool type from an item's type ID.
 * @param {string} itemTypeId The item's type ID (e.g., 'minecraft:diamond_pickaxe').
 * @returns {string|null} The tool type or null if not a recognized tool.
 */
function getToolType(itemTypeId) {
    if (itemTypeId.includes('_pickaxe')) return 'pickaxe';
    if (itemTypeId.includes('_axe')) return 'axe';
    if (itemTypeId.includes('_shovel')) return 'shovel';
    if (itemTypeId.includes('_hoe')) return 'hoe';
    if (itemTypeId === 'minecraft:shears') return 'shears';
    if (itemTypeId.includes('_sword')) return 'sword';
    return null;
}

/**
 * Gets the material of a tool from an item's type ID.
 * @param {string} itemTypeId The item's type ID (e.g., 'minecraft:diamond_pickaxe').
 * @returns {string|null} The tool material or null if not a recognized material.
 */
function getToolMaterial(itemTypeId) {
    if (itemTypeId.startsWith('minecraft:wooden_')) return 'wooden';
    if (itemTypeId.startsWith('minecraft:stone_')) return 'stone';
    if (itemTypeId.startsWith('minecraft:iron_')) return 'iron';
    if (itemTypeId.startsWith('minecraft:golden_')) return 'golden';
    if (itemTypeId.startsWith('minecraft:diamond_')) return 'diamond';
    if (itemTypeId.startsWith('minecraft:netherite_')) return 'netherite';
    return null;
}

/**
 * Calculates the relative breaking power of a player against a block.
 * @param {import('@minecraft/server').Player} player The player breaking the block.
 * @param {import('@minecraft/server').BlockPermutation} blockPermutation The permutation of the block.
 * @param {import('@minecraft/server').ItemStack | undefined} itemStack The item used, or undefined for hand.
 * @returns {number} Relative breaking power.
 */
export function calculateRelativeBlockBreakingPower(player, blockPermutation, itemStack) {
    if (player.gameMode === 'creative') {
        return Infinity;
    }
    const blockTypeId = blockPermutation.type.id;
    const blockHardness = blockHardnessMap[blockTypeId] || defaultBlockHardness;
    if (!itemStack) {
        // Breaking with hand
        return 1 / (blockHardness * handBreakHardnessFactor1 * handBreakHardnessFactor2);
    }

    const itemTypeId = itemStack.typeId;
    const toolType = getToolType(itemTypeId);
    const toolMaterial = getToolMaterial(itemTypeId);

    if (toolType === 'shears' && (blockTypeId.includes('leaves') || blockTypeId.includes('wool') || blockTypeId === 'minecraft:cobweb' || blockTypeId === 'minecraft:vine')) {
        return Infinity;
    }
    if (toolType === 'sword' && blockTypeId === 'minecraft:cobweb') {
        return (toolMaterialMultipliersMap[toolMaterial] || 1) * swordCobwebSpeedMultiplier;
    }

    let speed = toolMaterialMultipliersMap[toolMaterial] || 1;
    let correctToolMultiplier = 1;
    const requiredTool = correctToolForBlockMap[blockTypeId];

    if (requiredTool && toolType === requiredTool) {
        correctToolMultiplier = correctToolTimeFactor; // Using this as it represents the 1.5 factor
    } else if (requiredTool && toolType !== requiredTool && toolType !== null) {
        speed = 1; // No material bonus if wrong tool type for block needing a specific tool
        correctToolMultiplier = 1; // No penalty beyond losing material bonus for now
    } else if (toolType === null && requiredTool) { // Hand breaking a block that needs a tool
        return 1 / (blockHardness * incorrectToolPenaltyFactor * handBreakHardnessFactor2);
    }

    let efficiencyLevel = 0;
    const enchantComp = itemStack.getComponent('enchantable');
    if (enchantComp) {
        const efficiency = enchantComp.getEnchantment('efficiency');
        if (efficiency) {
            efficiencyLevel = efficiency.level;
        }
    }
    if (efficiencyLevel > 0) {
        speed += (efficiencyLevel * efficiencyLevel + 1);
    }

    const hasteEffect = player.getEffects()?.find(eff => eff.typeId === 'haste');
    if (hasteEffect) {
        speed *= (1 + hasteEffectMultiplierBase * (hasteEffect.amplifier + 1));
    }
    const fatigueEffect = player.getEffects()?.find(eff => eff.typeId === 'mining_fatigue');
    if (fatigueEffect) {
        speed *= Math.pow(miningFatigueEffectPowerBase, fatigueEffect.amplifier + 1);
    }

    if (!player.isOnGround) {
        speed /= notOnGroundBreakSpeedPenalty;
    }

    const damage = speed * correctToolMultiplier / blockHardness;
    return damage < 0 ? 0 : damage * ticksPerSecond; // Convert damage per second to damage per tick effectively
}

/**
 * Finds the optimal tool in the player's hotbar for breaking a block.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {import('@minecraft/server').BlockPermutation} blockPermutation The block permutation to check against.
 * @returns {{slotIndex: number, itemStack: import('@minecraft/server').ItemStack, speed: number}|null} The optimal tool info or null.
 */
export function getOptimalToolForBlock(player, blockPermutation) {
    const inventory = player.getComponent(mc.EntityComponentTypes.Inventory);
    if (!inventory?.container) {
        return null;
    }

    let bestSlot = -1;
    let maxPower = 0;
    let bestToolStack = undefined;

    for (let i = 0; i < hotbarSize; i++) {
        const itemStack = inventory.container.getItem(i);
        const currentPower = calculateRelativeBlockBreakingPower(player, blockPermutation, itemStack);
        if (currentPower > maxPower) {
            maxPower = currentPower;
            bestSlot = i;
            bestToolStack = itemStack;
        }
    }

    if (bestSlot !== -1 && maxPower > 0) {
        return { slotIndex: bestSlot, itemStack: bestToolStack, speed: maxPower };
    }
    return null;
}

/**
 * Calculates the expected number of game ticks to break a block.
 * @param {import('@minecraft/server').Player} player The player breaking the block.
 * @param {import('@minecraft/server').BlockPermutation} blockPermutation The permutation of the block being broken.
 * @param {import('@minecraft/server').ItemStack | undefined} itemStack The item stack used, or undefined if hand.
 * @param {import('../types.js').CommandDependencies} dependencies The standard dependencies object.
 * @returns {number} The expected number of ticks to break the block, or Infinity for unbreakable blocks.
 */
export function getExpectedBreakTicks(player, blockPermutation, itemStack, dependencies) {
    const blockTypeId = blockPermutation.type.id;
    const blockHardness = blockHardnessMap[blockTypeId];

    if (blockHardness === undefined || blockHardness < 0) {
        return Infinity;
    }
    if (blockHardness === 0) {
        return 1;
    }

    if (dependencies.config.instaBreakUnbreakableBlocks?.includes(blockTypeId) && player.gameMode !== mc.GameMode.creative) {
        return Infinity;
    }

    let toolSpeed = 1;
    let isCorrectToolTypeAndMaterial = false;
    const requiredToolClass = correctToolForBlockMap[blockTypeId];

    if (itemStack) {
        const itemTypeId = itemStack.typeId;
        const toolType = getToolType(itemTypeId);
        const toolMaterial = getToolMaterial(itemTypeId);

        if (toolType && toolMaterial && toolMaterialMultipliersMap[toolMaterial]) {
            toolSpeed = toolMaterialMultipliersMap[toolMaterial];
            if (toolType === requiredToolClass) {
                isCorrectToolTypeAndMaterial = true;
            } else if (requiredToolClass) {
                toolSpeed = 1;
            }
        } else if (toolType === 'shears' && (blockTypeId.includes('leaves') || blockTypeId.includes('wool') || blockTypeId === 'minecraft:cobweb' || blockTypeId === 'minecraft:vine')) {
            return 1;
        } else if (toolType === 'sword' && blockTypeId === 'minecraft:cobweb') {
            return 1;
        } else {
            toolSpeed = 1;
        }
    } else {
        isCorrectToolTypeAndMaterial = !requiredToolClass;
        toolSpeed = 1;
    }

    let efficiencyLevel = 0;
    if (itemStack) {
        const enchantComp = itemStack.getComponent(mc.ItemComponentTypes.Enchantable);
        if (enchantComp) {
            const eff = enchantComp.getEnchantment('efficiency');
            if (eff) {
                efficiencyLevel = eff.level;
            }
        }
    }
    if (efficiencyLevel > 0) {
        toolSpeed += (efficiencyLevel * efficiencyLevel + 1);
    }
    if (toolSpeed < 1) {
        toolSpeed = 1;
    }

    const baseTimeFactor = isCorrectToolTypeAndMaterial ? correctToolTimeFactor : incorrectToolTimeFactor;
    let breakTimeSeconds = (blockHardness * baseTimeFactor) / toolSpeed;

    const effects = player.getEffects();
    const haste = effects?.find(e => e.typeId === 'haste');
    if (haste) {
        breakTimeSeconds /= (1 + hasteEffectMultiplierBase * (haste.amplifier + 1));
    }
    const fatigue = effects?.find(e => e.typeId === 'mining_fatigue');
    if (fatigue) {
        breakTimeSeconds /= Math.pow(miningFatigueEffectPowerBase, fatigue.amplifier + 1);
    }

    if (!player.isOnGround) {
        breakTimeSeconds *= notOnGroundBreakSpeedPenalty;
    }

    let hasAquaAffinity = false;
    const headArmor = player.getComponent('equippable')?.getEquipmentSlot(mc.EquipmentSlot.Head);
    if (headArmor?.hasItem()) {
        const enchantComp = headArmor.getItem().getComponent('enchantable');
        if (enchantComp?.getEnchantment('aqua_affinity')) {
            hasAquaAffinity = true;
        }
    }
    if (player.isInWater && !hasAquaAffinity) {
        breakTimeSeconds *= inWaterNoAquaAffinityPenalty;
    }

    if (breakTimeSeconds < minBreakTimeSeconds) {
        breakTimeSeconds = minBreakTimeSeconds;
    }

    const ticks = Math.ceil(breakTimeSeconds * ticksPerSecond);
    return ticks < 1 ? 1 : ticks;
}
