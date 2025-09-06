import { ItemStack } from '@minecraft/server';
import { getPlayer, setKitCooldown } from './playerDataManager.js';
import { kits } from './kitsConfig.js';
import { errorLog } from './errorLogger.js';

/**
 * Gets the definition of a kit.
 * @param {string} kitName The name of the kit.
 * @returns {import('./kitsConfig.js').Kit | undefined}
 */
export function getKit(kitName) {
    return kits[kitName.toLowerCase()];
}

/**
 * Lists the names of all available and enabled kits.
 * @returns {string[]}
 */
export function listKits() {
    return Object.keys(kits).filter(kitName => kits[kitName].enabled);
}

/**
 * Gets the remaining cooldown time for a player's kit in seconds.
 * @param {import('@minecraft/server').Player} player The player.
 * @param {string} kitName The name of the kit.
 * @returns {number} The remaining cooldown in seconds, or 0 if available.
 */
export function getKitCooldown(player, kitName) {
    const pData = getPlayer(player.id);
    if (!pData) {return 0;}

    const cooldownExpiry = pData.kitCooldowns[kitName.toLowerCase()];
    if (!cooldownExpiry) {return 0;}

    const now = Date.now();
    if (now >= cooldownExpiry) {
        return 0; // Cooldown has expired
    }

    return Math.ceil((cooldownExpiry - now) / 1000); // Return remaining seconds
}

/**
 * Gives a kit to a player if they are off cooldown and the kit is enabled.
 * @param {import('@minecraft/server').Player} player The player to give the kit to.
 * @param {string} kitName The name of the kit to give.
 * @returns {{success: boolean, message: string}}
 */
export function giveKit(player, kitName) {
    const kit = getKit(kitName);
    const lowerCaseKitName = kitName.toLowerCase();

    if (!kit) {
        return { success: false, message: `Kit '${kitName}' does not exist.` };
    }

    if (!kit.enabled) {
        return { success: false, message: `Kit '${kitName}' is currently disabled.` };
    }

    const remainingCooldown = getKitCooldown(player, lowerCaseKitName);
    if (remainingCooldown > 0) {
        return { success: false, message: `You must wait ${remainingCooldown} more seconds to claim this kit.` };
    }

    const pData = getPlayer(player.id);
    if (!pData) {
        return { success: false, message: 'Could not find your player data.' };
    }

    const inventory = player.getComponent('minecraft:inventory').container;

    // This is a simplified check. A full check would be much more complex.
    if (inventory.emptySlotsCount < kit.items.length) {
        return { success: false, message: 'You do not have enough inventory space to claim this kit.' };
    }

    try {
        for (const itemInfo of kit.items) {
            const itemStack = new ItemStack(itemInfo.typeId, itemInfo.amount);
            if (itemInfo.nameTag) {
                itemStack.nameTag = itemInfo.nameTag;
            }
            if (itemInfo.lore) {
                itemStack.setLore(itemInfo.lore);
            }
            inventory.addItem(itemStack);
        }

        // Set the new cooldown
        const now = Date.now();
        const newCooldown = now + kit.cooldownSeconds * 1000;
        setKitCooldown(player.id, lowerCaseKitName, newCooldown);

        return { success: true, message: `You have received the '${kitName}' kit.` };
    } catch (e) {
        errorLog(`[KitsManager] Failed to give kit: ${e.stack}`);
        return { success: false, message: 'An unexpected error occurred while giving the kit.' };
    }
}
