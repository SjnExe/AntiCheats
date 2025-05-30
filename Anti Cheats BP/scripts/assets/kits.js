import { ItemStack, world, EnchantmentTypes } from '@minecraft/server'; // Removed Block
// import { logDebug } from './util'; // Removed logDebug import

/**
 * Gives a player a full set of enchanted iron armor and tools.
 * The items are placed in a chest spawned at the player's location (specifically at x+1 of player's coordinates).
 * This function assumes the player exists and is in a valid location for a chest to be placed.
 *
 * @param {string} playerName The name of the player to give the kit to.
 * @throws {TypeError} If the player with the given name is not found, or if block/inventory components cannot be accessed (e.g., chest placement failed silently and the block is not what's expected).
 * @throws {Error} If the command to place a chest fails or other game-specific errors occur during item setup.
 */
export function giveIronKit(playerName) {
  const player = world.getPlayers({ name: playerName })[0];

  const { x, y, z } = player.location;


  const Helmet = new ItemStack("minecraft:iron_helmet", 1)
  const Chest = new ItemStack("minecraft:iron_chestplate", 1)
  const Pants = new ItemStack("minecraft:iron_leggings", 1)
  const Boots = new ItemStack("minecraft:iron_boots", 1)

  const helmetEnchant = Helmet.getComponent("minecraft:enchantable");
  const chestEnchant = Chest.getComponent("minecraft:enchantable");
  const pantsEnchant = Pants.getComponent("minecraft:enchantable");
  const bootsEnchant = Boots.getComponent("minecraft:enchantable");

  // Enchanting the helmet
  helmetEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("respiration") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("aqua_affinity") });

  // Enchanting the chestplate
  chestEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  chestEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  chestEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });

  // Enchanting the leggings
  pantsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  pantsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("swift_sneak") });

  // Enchanting the boots
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  bootsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("depth_strider") });
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("feather_falling") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("soul_speed") });

  const Sword = new ItemStack("minecraft:iron_sword", 1);
  const Pick = new ItemStack("minecraft:iron_pickaxe", 1);
  const Axe = new ItemStack("minecraft:iron_axe", 1);
  const Shovel = new ItemStack("minecraft:iron_shovel", 1);

  const swordEnchant = Sword.getComponent("minecraft:enchantable");
  const pickEnchant = Pick.getComponent("minecraft:enchantable");
  const axeEnchant = Axe.getComponent("minecraft:enchantable");
  const shovelEnchant = Shovel.getComponent("minecraft:enchantable");

  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("sharpness"), level: 5 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("looting"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("fire_aspect"), level: 2 });

  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("silk_touch"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  world.getDimension("overworld").runCommand(`fill ${x + 1} ${y} ${z} ${x + 1} ${y} ${z} chest`)

  const chest = world.getDimension("overworld").getBlock({ x: x + 1, y: y, z: z })
  const inventory = chest.getComponent("minecraft:inventory").container;

  inventory.setItem(0, Helmet)
  inventory.setItem(1, Chest)
  inventory.setItem(2, Pants)
  inventory.setItem(3, Boots)
  inventory.setItem(4, Sword)
  inventory.setItem(5, Axe)
  inventory.setItem(6, Pick)
  inventory.setItem(7, Shovel)

}

/**
 * Gives a player a full set of enchanted diamond armor and tools.
 * The items are placed in a chest spawned at the player's location (specifically at x+1 of player's coordinates).
 * This function assumes the player exists and is in a valid location for a chest to be placed.
 *
 * @param {string} playerName The name of the player to give the kit to.
 * @throws {TypeError} If the player with the given name is not found, or if block/inventory components cannot be accessed (e.g., chest placement failed silently and the block is not what's expected).
 * @throws {Error} If the command to place a chest fails or other game-specific errors occur during item setup.
 */
export function giveDiamondKit(playerName) {
  const player = world.getPlayers({ name: playerName })[0];

  const { x, y, z } = player.location;


  const Helmet = new ItemStack("minecraft:diamond_helmet", 1)
  const Chest = new ItemStack("minecraft:diamond_chestplate", 1)
  const Pants = new ItemStack("minecraft:diamond_leggings", 1)
  const Boots = new ItemStack("minecraft:diamond_boots", 1)

  const helmetEnchant = Helmet.getComponent("minecraft:enchantable");
  const chestEnchant = Chest.getComponent("minecraft:enchantable");
  const pantsEnchant = Pants.getComponent("minecraft:enchantable");
  const bootsEnchant = Boots.getComponent("minecraft:enchantable");

  // Enchanting the helmet
  helmetEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("respiration") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("aqua_affinity") });

  // Enchanting the chestplate
  chestEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  chestEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  chestEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });

  // Enchanting the leggings
  pantsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  pantsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("swift_sneak") });

  // Enchanting the boots
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  bootsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("depth_strider") });
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("feather_falling") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("soul_speed") });

  const Sword = new ItemStack("minecraft:diamond_sword", 1);
  const Pick = new ItemStack("minecraft:diamond_pickaxe", 1);
  const Axe = new ItemStack("minecraft:diamond_axe", 1);
  const Shovel = new ItemStack("minecraft:diamond_shovel", 1);

  const swordEnchant = Sword.getComponent("minecraft:enchantable");
  const pickEnchant = Pick.getComponent("minecraft:enchantable");
  const axeEnchant = Axe.getComponent("minecraft:enchantable");
  const shovelEnchant = Shovel.getComponent("minecraft:enchantable");

  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("sharpness"), level: 5 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("looting"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("fire_aspect"), level: 2 });

  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("silk_touch"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  world.getDimension("overworld").runCommand(`fill ${x + 1} ${y} ${z} ${x + 1} ${y} ${z} chest`)

  const chest = world.getDimension("overworld").getBlock({ x: x + 1, y: y, z: z })
  const inventory = chest.getComponent("minecraft:inventory").container;

  inventory.setItem(0, Helmet)
  inventory.setItem(1, Chest)
  inventory.setItem(2, Pants)
  inventory.setItem(3, Boots)
  inventory.setItem(4, Sword)
  inventory.setItem(5, Axe)
  inventory.setItem(6, Pick)
  inventory.setItem(7, Shovel)

}

/**
 * Gives a player a full set of enchanted netherite armor and tools.
 * The items are placed in a chest spawned at the player's location (specifically at x+1 of player's coordinates).
 * This function assumes the player exists and is in a valid location for a chest to be placed.
 *
 * @param {string} playerName The name of the player to give the kit to.
 * @throws {TypeError} If the player with the given name is not found, or if block/inventory components cannot be accessed (e.g., chest placement failed silently and the block is not what's expected).
 * @throws {Error} If the command to place a chest fails or other game-specific errors occur during item setup.
 */
export function giveNetheriteKit(playerName) {
  const player = world.getPlayers({ name: playerName })[0];

  const { x, y, z } = player.location;


  const Helmet = new ItemStack("minecraft:netherite_helmet", 1)
  const Chest = new ItemStack("minecraft:netherite_chestplate", 1)
  const Pants = new ItemStack("minecraft:netherite_leggings", 1)
  const Boots = new ItemStack("minecraft:netherite_boots", 1)

  const helmetEnchant = Helmet.getComponent("minecraft:enchantable");
  const chestEnchant = Chest.getComponent("minecraft:enchantable");
  const pantsEnchant = Pants.getComponent("minecraft:enchantable");
  const bootsEnchant = Boots.getComponent("minecraft:enchantable");

  // Enchanting the helmet
  helmetEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  helmetEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("respiration") });
  helmetEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("aqua_affinity") });

  // Enchanting the chestplate
  chestEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  chestEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  chestEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });

  // Enchanting the leggings
  pantsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  pantsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  pantsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("swift_sneak") });

  // Enchanting the boots
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("protection") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("unbreaking") });
  bootsEnchant.addEnchantment({ level: 1, type: EnchantmentTypes.get("mending") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("depth_strider") });
  bootsEnchant.addEnchantment({ level: 4, type: EnchantmentTypes.get("feather_falling") });
  bootsEnchant.addEnchantment({ level: 3, type: EnchantmentTypes.get("soul_speed") });

  const Sword = new ItemStack("minecraft:netherite_sword", 1);
  const Pick = new ItemStack("minecraft:netherite_pickaxe", 1);
  const Axe = new ItemStack("minecraft:netherite_axe", 1);
  const Shovel = new ItemStack("minecraft:netherite_shovel", 1);

  const swordEnchant = Sword.getComponent("minecraft:enchantable");
  const pickEnchant = Pick.getComponent("minecraft:enchantable");
  const axeEnchant = Axe.getComponent("minecraft:enchantable");
  const shovelEnchant = Shovel.getComponent("minecraft:enchantable");

  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("sharpness"), level: 5 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("looting"), level: 3 });
  swordEnchant.addEnchantment({ type: EnchantmentTypes.get("fire_aspect"), level: 2 });

  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  pickEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("fortune"), level: 3 });
  axeEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("mending"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("unbreaking"), level: 3 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("silk_touch"), level: 1 });
  shovelEnchant.addEnchantment({ type: EnchantmentTypes.get("efficiency"), level: 5 });

  world.getDimension("overworld").runCommand(`fill ${x + 1} ${y} ${z} ${x + 1} ${y} ${z} chest`)

  const chest = world.getDimension("overworld").getBlock({ x: x + 1, y: y, z: z })
  const inventory = chest.getComponent("minecraft:inventory").container;

  inventory.setItem(0, Helmet)
  inventory.setItem(1, Chest)
  inventory.setItem(2, Pants)
  inventory.setItem(3, Boots)
  inventory.setItem(4, Sword)
  inventory.setItem(5, Axe)
  inventory.setItem(6, Pick)
  inventory.setItem(7, Shovel)

}